import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readProjects, upsertProject, validateProjectMetadata, writeCsvAtomic, writeTextAtomic } from "./projects-csv.mjs";
import { commandAvailable, probeMediaSync } from "../../scripts/lib/media-probe.mjs";

const studioRoot = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(studioRoot, "..", "..");
const publicRoot = path.join(projectRoot, "public");
const projectsDirectory = path.join(publicRoot, "media", "projects");
const posterDirectory = path.join(projectsDirectory, "photo");
const csvPath = path.join(projectRoot, "content", "projects.csv");
const workRoot = path.join(projectRoot, ".media-studio");
const uploadRoot = path.join(workRoot, "uploads");
const jobRoot = path.join(workRoot, "jobs");
const staticRoot = path.join(studioRoot, "public");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.MEDIA_STUDIO_PORT || "4178", 10);
const maxUploadBytes = Number.parseInt(process.env.MEDIA_STUDIO_MAX_BYTES || String(25 * 1024 ** 3), 10);
const ffmpegCommand = process.env.FFMPEG_PATH || "ffmpeg";
const ffprobeCommand = process.env.FFPROBE_PATH || "ffprobe";
const sessionToken = randomBytes(24).toString("base64url");

const jobs = new Map();
const queue = [];
let queueRunning = false;
let latestAudit = null;
let mutationTail = Promise.resolve();

await fsp.mkdir(uploadRoot, { recursive: true });
await fsp.mkdir(jobRoot, { recursive: true });
await fsp.mkdir(projectsDirectory, { recursive: true });
await fsp.mkdir(posterDirectory, { recursive: true });

const tools = {
  ffmpeg: commandAvailable(ffmpegCommand),
  ffprobe: commandAvailable(ffprobeCommand),
  probeMode: commandAvailable(ffprobeCommand) ? "ffprobe" : "ffmpeg-fallback",
};

function setSecurityHeaders(response, nonce = "") {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'${nonce ? ` 'nonce-${nonce}'` : ""}; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
  );
}

function sendJson(response, status, payload) {
  setSecurityHeaders(response);
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;
  return origin === `http://${host}:${port}` || origin === `http://localhost:${port}`;
}

function authorized(request) {
  return sameOrigin(request) && request.headers["x-media-studio-token"] === sessionToken;
}

function decodeMetadata(header) {
  if (!header || Array.isArray(header)) throw new Error("缺少素材信息");
  const source = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
  if (!source || typeof source !== "object") throw new Error("素材信息无效");
  return {
    ...source,
    fileName: source.fileName ?? source.original_name,
    titleZh: source.titleZh ?? source.title_zh,
    titleEn: source.titleEn ?? source.title_en,
    categoryZh: source.categoryZh ?? source.category_zh,
    categoryEn: source.categoryEn ?? source.category_en,
    roleZh: source.roleZh ?? source.role_zh,
    roleEn: source.roleEn ?? source.role_en,
    templateSlug: source.templateSlug ?? source.template_slug,
    previewStart: source.previewStart ?? source.preview_start,
    previewDuration: source.previewDuration ?? source.preview_duration,
    posterTime: source.posterTime ?? source.poster_time,
    updateExistingMetadata: source.updateExistingMetadata ?? source.update_existing_metadata ?? false,
  };
}

function safeFileName(value) {
  const base = path.basename(String(value || "master-video"));
  return base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").slice(0, 180) || "master-video";
}

function publicPath(file) {
  return `/${path.relative(publicRoot, file).split(path.sep).join("/")}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

function runProcess(command, args, { onOutput } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      onOutput?.(chunk, "stdout");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      onOutput?.(chunk, "stderr");
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error((stderr || stdout || `${command} 退出码 ${code}`).trim().slice(-4000)));
    });
  });
}

async function probeDuration(file) {
  const probe = probeMediaSync(file, { ffmpegCommand, ffprobeCommand });
  return Number.parseFloat(probe.format?.duration || "0");
}

function parseRate(rate) {
  const [numerator, denominator = "1"] = String(rate || "0/1").split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

async function validateVideoOutput(file, { maxWidth, maxHeight }) {
  const probe = probeMediaSync(file, { ffmpegCommand, ffprobeCommand });
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error(`生成文件缺少视频流：${path.basename(file)}`);
  if (video.codec_name !== "h264" || video.pix_fmt !== "yuv420p" || String(video.profile).includes("10")) {
    throw new Error(`生成文件编码不兼容：${path.basename(file)} (${video.codec_name}/${video.profile}/${video.pix_fmt})`);
  }
  if (video.width > maxWidth || video.height > maxHeight) {
    throw new Error(`生成文件尺寸超出限制：${path.basename(file)} (${video.width}x${video.height})`);
  }
  if (parseRate(video.avg_frame_rate) > 30.01) {
    throw new Error(`生成文件帧率超过 30fps：${path.basename(file)}`);
  }
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function serializeJob(job) {
  return {
    id: job.id,
    fileName: job.fileName,
    slug: job.metadata.slug,
    titleZh: job.metadata.titleZh,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    error: job.error || null,
    result: job.result || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

async function backupExisting(destination, backupDirectory) {
  let exists = false;
  try {
    await fsp.access(destination);
    exists = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (!exists) return null;

  const backup = path.join(backupDirectory, path.relative(publicRoot, destination));
  await fsp.mkdir(path.dirname(backup), { recursive: true });
  await fsp.rename(destination, backup);
  return backup;
}

async function moveWithBackup(source, destination, backupDirectory) {
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  const backup = await backupExisting(destination, backupDirectory);
  try {
    await fsp.rename(source, destination);
  } catch (error) {
    if (backup) await fsp.rename(backup, destination).catch(() => undefined);
    throw error;
  }
  return { destination, backup };
}

async function removeWithBackup(destination, backupDirectory) {
  const backup = await backupExisting(destination, backupDirectory);
  return backup ? { destination, backup } : null;
}

async function rollbackFiles(moves) {
  for (const move of [...moves].reverse()) {
    await fsp.rm(move.destination, { force: true });
    if (move.backup) {
      await fsp.mkdir(path.dirname(move.destination), { recursive: true });
      await fsp.rename(move.backup, move.destination);
    }
  }
}

async function withMutationLock(callback) {
  const previous = mutationTail;
  let release;
  mutationTail = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await callback();
  } finally {
    release();
  }
}

async function publishJob(job, staged) {
  return withMutationLock(async () => {
    const snapshot = await readProjects(csvPath);
    const backupDirectory = path.join(job.workspace, "backup");
    const destinations = {
      preview: path.join(projectsDirectory, `${job.metadata.slug}-preview.mp4`),
      full: path.join(projectsDirectory, `${job.metadata.slug}-full.mp4`),
      webp: path.join(posterDirectory, `${job.metadata.slug}.webp`),
      avif: path.join(posterDirectory, `${job.metadata.slug}.avif`),
    };
    const moves = [];
    let csvChanged = false;
    try {
      moves.push(await moveWithBackup(staged.preview, destinations.preview, backupDirectory));
      moves.push(await moveWithBackup(staged.full, destinations.full, backupDirectory));
      moves.push(await moveWithBackup(staged.webp, destinations.webp, backupDirectory));
      if (staged.avif) {
        moves.push(await moveWithBackup(staged.avif, destinations.avif, backupDirectory));
      } else {
        const removedAvif = await removeWithBackup(destinations.avif, backupDirectory);
        if (removedAvif) moves.push(removedAvif);
      }

      const duration = formatDuration(await probeDuration(destinations.full));
      const assets = {
        duration,
        preview: publicPath(destinations.preview),
        full: publicPath(destinations.full),
        cover: publicPath(destinations.webp),
      };
      const update = upsertProject(snapshot.records, job.metadata, assets);
      await writeCsvAtomic(csvPath, snapshot.headers, update.records);
      csvChanged = true;
      await runProcess(process.execPath, [path.join(projectRoot, "scripts", "sync-projects.mjs")]);
      return {
        ...assets,
        mode: update.mode,
        order: Number(update.order),
        avif: staged.avif ? publicPath(destinations.avif) : null,
      };
    } catch (error) {
      if (csvChanged) {
        await writeTextAtomic(csvPath, snapshot.csv);
        await runProcess(process.execPath, [path.join(projectRoot, "scripts", "sync-projects.mjs")]).catch(() => undefined);
      }
      if (moves.length) await rollbackFiles(moves).catch(() => undefined);
      throw error;
    }
  });
}

function applyProgressFromOutput(job, chunk) {
  const output = String(chunk);
  if (output.includes("720p")) updateJob(job, { stage: "生成 720p 预览", progress: 22 });
  else if (output.includes("1080p")) updateJob(job, { stage: "生成 1080p 完整视频", progress: 48 });
  else if (output.includes("WebP")) updateJob(job, { stage: "生成 WebP 封面", progress: 75 });
  else if (output.includes("AVIF")) updateJob(job, { stage: "生成 AVIF 封面", progress: 86 });
}

async function processJob(job) {
  updateJob(job, { status: "transcoding", stage: "检查母版", progress: 8 });
  const stagedProjects = path.join(job.workspace, "output", "projects");
  const stagedPosters = path.join(stagedProjects, "photo");
  await fsp.mkdir(stagedPosters, { recursive: true });
  const args = [
    path.join(projectRoot, "scripts", "prepare-video.mjs"),
    "--input",
    job.uploadPath,
    "--slug",
    job.metadata.slug,
    "--output-dir",
    stagedProjects,
    "--poster-dir",
    stagedPosters,
    "--preview-start",
    String(job.metadata.previewStart ?? 0),
    "--preview-duration",
    String(job.metadata.previewDuration ?? 8),
    "--poster-time",
    String(job.metadata.posterTime ?? (Number(job.metadata.previewStart || 0) + 0.5)),
    "--overwrite",
  ];
  await runProcess(process.execPath, args, { onOutput: (chunk) => applyProgressFromOutput(job, chunk) });

  const stagedAvif = path.join(stagedPosters, `${job.metadata.slug}.avif`);
  const staged = {
    preview: path.join(stagedProjects, `${job.metadata.slug}-preview.mp4`),
    full: path.join(stagedProjects, `${job.metadata.slug}-full.mp4`),
    webp: path.join(stagedPosters, `${job.metadata.slug}.webp`),
    avif: null,
  };
  await Promise.all([staged.preview, staged.full, staged.webp].map((file) => fsp.access(file)));
  try {
    await fsp.access(stagedAvif);
    staged.avif = stagedAvif;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  updateJob(job, { stage: "验证网页兼容性", progress: 89 });
  await validateVideoOutput(staged.preview, { maxWidth: 1280, maxHeight: 720 });
  await validateVideoOutput(staged.full, { maxWidth: 1920, maxHeight: 1080 });
  updateJob(job, { status: "publishing", stage: "更新网站数据", progress: 92 });
  const result = await publishJob(job, staged);
  updateJob(job, { status: "done", stage: "已更新网站", progress: 100, result });
}

async function runQueue() {
  if (queueRunning) return;
  queueRunning = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await processJob(job);
    } catch (error) {
      updateJob(job, {
        status: "error",
        stage: "处理失败",
        progress: 100,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await fsp.rm(job.uploadPath, { force: true }).catch(() => undefined);
      if (job.status === "done") await fsp.rm(job.workspace, { recursive: true, force: true }).catch(() => undefined);
    }
  }
  queueRunning = false;
  try {
    latestAudit = await runAudit();
  } catch (error) {
    latestAudit = { ok: false, output: error instanceof Error ? error.message : String(error), at: new Date().toISOString() };
  }
}

async function handleUpload(request, response) {
  if (!tools.ffmpeg) {
    sendJson(response, 503, { error: "未检测到 FFmpeg，请安装后重新启动工作台。" });
    return;
  }
  const contentLength = Number(request.headers["content-length"] || 0);
  if (contentLength > maxUploadBytes) {
    sendJson(response, 413, { error: "文件超过工作台允许的大小。" });
    return;
  }
  const metadata = decodeMetadata(request.headers["x-media-meta"]);
  validateProjectMetadata(metadata);
  const id = randomUUID();
  const fileName = safeFileName(request.headers["x-file-name"] || metadata.fileName);
  const extension = path.extname(fileName).toLowerCase();
  if (!new Set([".mp4", ".mov", ".mxf", ".mkv", ".m4v", ".avi", ".webm"]).has(extension)) {
    sendJson(response, 415, { error: `不支持的母版格式：${extension || "无扩展名"}` });
    return;
  }
  const uploadPath = path.join(uploadRoot, `${id}${extension}`);
  let received = 0;
  request.on("data", (chunk) => {
    received += chunk.length;
    if (received > maxUploadBytes) request.destroy(new Error("上传文件过大"));
  });
  try {
    await pipeline(request, fs.createWriteStream(uploadPath, { flags: "wx" }));
    const now = new Date().toISOString();
    const job = {
      id,
      fileName,
      metadata,
      uploadPath,
      workspace: path.join(jobRoot, id),
      status: "queued",
      stage: "等待转码",
      progress: 3,
      createdAt: now,
      updatedAt: now,
    };
    jobs.set(id, job);
    queue.push(job);
    void runQueue();
    sendJson(response, 202, { job: serializeJob(job) });
  } catch (error) {
    await fsp.rm(uploadPath, { force: true }).catch(() => undefined);
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function runAudit() {
  const result = await runProcess(process.execPath, [path.join(projectRoot, "scripts", "audit-media.mjs")]);
  return { ok: true, output: `${result.stdout}${result.stderr}`.trim(), at: new Date().toISOString() };
}

async function handleAudit(response) {
  try {
    latestAudit = await runAudit();
    sendJson(response, 200, latestAudit);
  } catch (error) {
    latestAudit = { ok: false, output: error instanceof Error ? error.message : String(error), at: new Date().toISOString() };
    sendJson(response, 500, latestAudit);
  }
}

const staticFiles = {
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
};

async function handleStatic(pathname, response) {
  if (pathname === "/" || pathname === "/index.html") {
    const nonce = randomBytes(16).toString("base64url");
    let html = await fsp.readFile(path.join(staticRoot, "index.html"), "utf8");
    html = html.replace(
      "</head>",
      `<script nonce="${nonce}">window.__MEDIA_STUDIO_TOKEN__=${JSON.stringify(sessionToken)};</script></head>`,
    );
    setSecurityHeaders(response, nonce);
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    response.end(html);
    return;
  }
  const asset = staticFiles[pathname];
  if (!asset) {
    sendJson(response, 404, { error: "Not found" });
    return;
  }
  setSecurityHeaders(response);
  response.writeHead(200, { "Content-Type": asset.type, "Cache-Control": "no-store" });
  fs.createReadStream(path.join(staticRoot, asset.file)).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);
    if (url.pathname.startsWith("/api/")) {
      if (!authorized(request)) {
        sendJson(response, 403, { error: "工作台会话无效，请刷新页面。" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/status") {
        sendJson(response, 200, { tools, queueRunning, queued: queue.length, latestAudit });
      } else if (request.method === "GET" && url.pathname === "/api/jobs") {
        sendJson(response, 200, { jobs: [...jobs.values()].map(serializeJob).reverse() });
      } else if (request.method === "GET" && url.pathname === "/api/projects") {
        const data = await readProjects(csvPath);
        sendJson(response, 200, {
          projects: data.records.map((record) => ({
            order: Number(record.order),
            slug: record.slug,
            titleZh: record.title_zh,
            titleEn: record.title_en,
            year: record.year,
            enabled: String(record.enabled).toUpperCase() !== "FALSE",
          })),
        });
      } else if (request.method === "POST" && url.pathname === "/api/upload") {
        await handleUpload(request, response);
      } else if (request.method === "POST" && url.pathname === "/api/audit") {
        await handleAudit(response);
      } else {
        sendJson(response, 404, { error: "Unknown API route" });
      }
      return;
    }
    await handleStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.on("error", (error) => {
  console.error(`媒体工作台启动失败：${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`\nLIUKER 媒体工作台已启动：http://${host}:${port}`);
  console.log(`FFmpeg: ${tools.ffmpeg ? "可用" : "未找到"} / FFprobe: ${tools.ffprobe ? "可用" : "未找到"}`);
  console.log("仅绑定本机地址；关闭此终端即可停止工作台。\n");
});
