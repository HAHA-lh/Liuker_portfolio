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
const defaultProjectRoot = path.resolve(studioRoot, "..", "..");
const projectRoot = path.resolve(process.env.MEDIA_STUDIO_PROJECT_ROOT || defaultProjectRoot);
const publicRoot = path.join(projectRoot, "public");
const projectsDirectory = path.join(publicRoot, "media", "projects");
const posterDirectory = path.join(projectsDirectory, "photo");
const heroPosterDirectory = path.join(publicRoot, "media", "posters");
const showreelDirectory = path.join(publicRoot, "media", "showreel");
const csvPath = path.join(projectRoot, "content", "projects.csv");
const mediaConfigPath = path.join(projectRoot, "app", "hero-media.ts");
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

await Promise.all([
  fsp.access(path.join(projectRoot, "package.json")),
  fsp.access(csvPath),
  fsp.access(mediaConfigPath),
]).catch(() => {
  throw new Error(`MEDIA_STUDIO_PROJECT_ROOT 不是有效的 LIUKER 项目目录：${projectRoot}`);
});
await fsp.mkdir(uploadRoot, { recursive: true });
await fsp.mkdir(jobRoot, { recursive: true });
await fsp.mkdir(projectsDirectory, { recursive: true });
await fsp.mkdir(posterDirectory, { recursive: true });
await fsp.mkdir(heroPosterDirectory, { recursive: true });
await fsp.mkdir(showreelDirectory, { recursive: true });

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
    workflow: source.workflow ?? (source.targetType || source.target_type ? "replace" : "ingest"),
    targetType: source.targetType ?? source.target_type ?? null,
    targetId: source.targetId ?? source.target_id ?? null,
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

function validateTimingMetadata(metadata) {
  for (const key of ["previewStart", "previewDuration", "posterTime"]) {
    if (metadata[key] === undefined) continue;
    const number = Number(metadata[key]);
    if (!Number.isFinite(number) || number < 0) throw new Error(`${key} 必须是非负数字`);
  }
  if (metadata.previewDuration !== undefined && Number(metadata.previewDuration) <= 0) {
    throw new Error("预览时长必须大于 0 秒");
  }
}

async function resolveUploadMetadata(source) {
  const workflow = String(source.workflow || "ingest").toLowerCase();
  if (workflow !== "replace") {
    validateProjectMetadata(source);
    return { ...source, workflow: "ingest", targetType: "project", targetId: source.slug };
  }

  const targetType = String(source.targetType || "").toLowerCase();
  const targetId = String(source.targetId || "").trim();
  if (!new Set(["project", "hero", "showreel"]).has(targetType)) {
    throw new Error("替换目标必须是 project、hero 或 showreel");
  }
  validateTimingMetadata(source);

  if (targetType === "hero" || targetType === "showreel") {
    if (targetId && targetId !== targetType) throw new Error(`无效的 ${targetType} 替换目标：${targetId}`);
    return {
      ...source,
      workflow: "replace",
      targetType,
      targetId: targetType,
      slug: `${targetType}-replacement`,
    };
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(targetId)) throw new Error("项目替换目标无效");
  const { records } = await readProjects(csvPath);
  const existing = records.find((record) => record.slug.trim() === targetId);
  if (!existing) throw new Error(`找不到要替换的项目：${targetId}`);
  const metadata = {
    ...source,
    workflow: "replace",
    targetType: "project",
    targetId,
    slug: targetId,
    templateSlug: existing.template_slug,
    titleZh: existing.title_zh,
    titleEn: existing.title_en,
    categoryZh: existing.category_zh,
    categoryEn: existing.category_en,
    year: existing.year,
    roleZh: existing.role_zh,
    roleEn: existing.role_en,
    featured: String(existing.featured).toUpperCase() === "TRUE",
    updateExistingMetadata: false,
  };
  validateProjectMetadata(metadata);
  return metadata;
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

async function validateVideoOutput(file, { maxWidth, maxHeight, exactWidth, exactHeight, noBFrames = false }) {
  const probe = probeMediaSync(file, { ffmpegCommand, ffprobeCommand });
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error(`生成文件缺少视频流：${path.basename(file)}`);
  if (video.codec_name !== "h264" || video.pix_fmt !== "yuv420p" || String(video.profile).includes("10")) {
    throw new Error(`生成文件编码不兼容：${path.basename(file)} (${video.codec_name}/${video.profile}/${video.pix_fmt})`);
  }
  if (video.width > maxWidth || video.height > maxHeight) {
    throw new Error(`生成文件尺寸超出限制：${path.basename(file)} (${video.width}x${video.height})`);
  }
  if ((exactWidth && video.width !== exactWidth) || (exactHeight && video.height !== exactHeight)) {
    throw new Error(`生成文件尺寸不符合要求：${path.basename(file)} (${video.width}x${video.height})`);
  }
  if (noBFrames && Number(video.has_b_frames || 0) !== 0) {
    throw new Error(`生成文件包含 B 帧，不适合滚轮逐帧定位：${path.basename(file)}`);
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
    workflow: job.metadata.workflow,
    targetType: job.metadata.targetType,
    targetId: job.metadata.targetId,
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

function replaceAssetConstantVersion(source, constantName, version) {
  const pattern = new RegExp(`(const\\s+${constantName}\\s*=\\s*)(["'])([^"']+)(?:\\2);`);
  let matched = false;
  const next = source.replace(pattern, (_match, prefix, quote, currentValue) => {
    matched = true;
    const assetPath = String(currentValue).split("?")[0];
    return `${prefix}${quote}${assetPath}?v=${encodeURIComponent(version)}${quote};`;
  });
  if (!matched) throw new Error(`无法更新素材缓存版本：${constantName}`);
  return next;
}

function updateAssetVersions(source, targetType, version) {
  const constants = targetType === "hero"
    ? ["HERO_VIDEO_1080P_SRC", "HERO_VIDEO_720P_SRC", "HERO_POSTER_WEBP", "HERO_POSTER_AVIF"]
    : ["SHOWREEL_VIDEO_SRC"];
  return constants.reduce(
    (contents, constantName) => replaceAssetConstantVersion(contents, constantName, version),
    source,
  );
}

async function publishSpecialJob(job, staged) {
  return withMutationLock(async () => {
    const backupDirectory = path.join(job.workspace, "backup");
    const targetType = job.metadata.targetType;
    const destinations = targetType === "hero"
      ? {
          video1080: path.join(projectsDirectory, "主页_scrub_1080p.mp4"),
          video720: path.join(projectsDirectory, "主页_scrub_720p.mp4"),
          posterWebp: path.join(heroPosterDirectory, "home-hero.webp"),
          posterAvif: path.join(heroPosterDirectory, "home-hero.avif"),
        }
      : {
          video: path.join(showreelDirectory, "LIUKER_Showreel_2026_web.mp4"),
        };
    const sourceSnapshot = await fsp.readFile(mediaConfigPath, "utf8");
    const moves = [];
    let sourceChanged = false;
    try {
      if (targetType === "hero") {
        moves.push(await moveWithBackup(staged.video1080, destinations.video1080, backupDirectory));
        moves.push(await moveWithBackup(staged.video720, destinations.video720, backupDirectory));
        moves.push(await moveWithBackup(staged.posterWebp, destinations.posterWebp, backupDirectory));
        if (staged.posterAvif) {
          moves.push(await moveWithBackup(staged.posterAvif, destinations.posterAvif, backupDirectory));
        } else {
          const removedAvif = await removeWithBackup(destinations.posterAvif, backupDirectory);
          if (removedAvif) moves.push(removedAvif);
        }
      } else {
        moves.push(await moveWithBackup(staged.video, destinations.video, backupDirectory));
      }

      const version = `media-studio-${Date.now().toString(36)}`;
      const nextSource = updateAssetVersions(sourceSnapshot, targetType, version);
      await writeTextAtomic(mediaConfigPath, nextSource);
      sourceChanged = true;
      const paths = Object.fromEntries(
        Object.entries(destinations)
          .filter(([key]) => key !== "posterAvif" || staged.posterAvif)
          .map(([key, destination]) => [key, publicPath(destination)]),
      );
      return {
        mode: "replaced",
        workflow: "replace",
        targetType,
        targetId: job.metadata.targetId,
        version,
        paths,
        currentAssets: paths,
      };
    } catch (error) {
      if (sourceChanged) await writeTextAtomic(mediaConfigPath, sourceSnapshot).catch(() => undefined);
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

function inspectSource(file, maximumFps) {
  const probe = probeMediaSync(file, { ffmpegCommand, ffprobeCommand });
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error("源文件中没有可用的视频流");
  const sourceFps = parseRate(video.avg_frame_rate) || maximumFps;
  const outputFps = Math.max(1, Math.min(sourceFps, maximumFps));
  return {
    outputFps,
    fpsFilter: Number.isInteger(outputFps) ? String(outputFps) : outputFps.toFixed(3),
    hasAudio: probe.streams?.some((stream) => stream.codec_type === "audio") || false,
  };
}

function commonH264Arguments({ gop, crf, maxrate, bufsize, level, noBFrames = false }) {
  return [
    "-c:v", "libx264",
    "-profile:v", "high",
    "-level:v", level,
    "-pix_fmt", "yuv420p",
    "-preset", "slow",
    "-crf", String(crf),
    "-maxrate", maxrate,
    "-bufsize", bufsize,
    "-g", String(gop),
    "-keyint_min", String(gop),
    "-sc_threshold", "0",
    ...(noBFrames ? ["-bf", "0", "-tune", "fastdecode"] : []),
    "-movflags", "+faststart",
  ];
}

async function generatePoster(input, destination, posterTime, codec) {
  const args = [
    "-y", "-hide_banner", "-loglevel", "warning",
    "-ss", String(posterTime),
    "-i", input,
    "-frames:v", "1",
    "-vf", "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
  ];
  if (codec === "avif") {
    args.push("-c:v", "libaom-av1", "-still-picture", "1", "-crf", "30", "-cpu-used", "6");
  } else {
    args.push("-c:v", "libwebp", "-quality", "82", "-compression_level", "6");
  }
  args.push(destination);
  await runProcess(ffmpegCommand, args);
}

async function processHeroReplacement(job) {
  updateJob(job, { status: "transcoding", stage: "检查首屏母版", progress: 8 });
  const outputDirectory = path.join(job.workspace, "output", "hero");
  await fsp.mkdir(outputDirectory, { recursive: true });
  const staged = {
    video1080: path.join(outputDirectory, "hero-1080.mp4"),
    video720: path.join(outputDirectory, "hero-720.mp4"),
    posterWebp: path.join(outputDirectory, "hero.webp"),
    posterAvif: path.join(outputDirectory, "hero.avif"),
  };
  const { fpsFilter } = inspectSource(job.uploadPath, 24);
  const encodes = [
    {
      destination: staged.video1080,
      stage: "生成首屏 1080p 滚轮视频",
      progress: 20,
      filter: `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=${fpsFilter}`,
      options: { gop: 2, crf: 19, maxrate: "12M", bufsize: "24M", level: "4.1", noBFrames: true },
    },
    {
      destination: staged.video720,
      stage: "生成首屏 720p 滚轮视频",
      progress: 52,
      filter: `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,fps=${fpsFilter}`,
      options: { gop: 2, crf: 21, maxrate: "6M", bufsize: "12M", level: "3.2", noBFrames: true },
    },
  ];
  for (const encode of encodes) {
    updateJob(job, { stage: encode.stage, progress: encode.progress });
    await runProcess(ffmpegCommand, [
      "-y", "-hide_banner", "-loglevel", "warning", "-i", job.uploadPath,
      "-map", "0:v:0", "-vf", encode.filter,
      ...commonH264Arguments(encode.options),
      "-an", encode.destination,
    ]);
  }

  const posterTime = Number(job.metadata.posterTime ?? 0.5);
  updateJob(job, { stage: "生成首屏 WebP 封面", progress: 76 });
  await generatePoster(job.uploadPath, staged.posterWebp, posterTime, "webp");
  updateJob(job, { stage: "生成首屏 AVIF 封面", progress: 84 });
  try {
    await generatePoster(job.uploadPath, staged.posterAvif, posterTime, "avif");
  } catch {
    await fsp.rm(staged.posterAvif, { force: true }).catch(() => undefined);
    staged.posterAvif = null;
  }

  updateJob(job, { stage: "验证首屏滚轮兼容性", progress: 89 });
  await validateVideoOutput(staged.video1080, {
    maxWidth: 1920, maxHeight: 1080, exactWidth: 1920, exactHeight: 1080, noBFrames: true,
  });
  await validateVideoOutput(staged.video720, {
    maxWidth: 1280, maxHeight: 720, exactWidth: 1280, exactHeight: 720, noBFrames: true,
  });
  updateJob(job, { status: "publishing", stage: "原子替换首屏素材", progress: 94 });
  const result = await publishSpecialJob(job, staged);
  updateJob(job, { status: "done", stage: "首屏素材已替换", progress: 100, result });
}

async function processShowreelReplacement(job) {
  updateJob(job, { status: "transcoding", stage: "检查 Showreel 母版", progress: 8 });
  const outputDirectory = path.join(job.workspace, "output", "showreel");
  await fsp.mkdir(outputDirectory, { recursive: true });
  const staged = { video: path.join(outputDirectory, "showreel.mp4") };
  const { fpsFilter, outputFps, hasAudio } = inspectSource(job.uploadPath, 30);
  const gop = Math.max(12, Math.round(outputFps * 2));
  updateJob(job, { stage: "生成 1080p Showreel", progress: 28 });
  await runProcess(ffmpegCommand, [
    "-y", "-hide_banner", "-loglevel", "warning", "-i", job.uploadPath,
    "-map", "0:v:0", ...(hasAudio ? ["-map", "0:a:0?"] : []),
    "-vf", `scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=${fpsFilter}`,
    ...commonH264Arguments({ gop, crf: 20, maxrate: "8M", bufsize: "16M", level: "4.1" }),
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "160k", "-ac", "2"] : ["-an"]),
    staged.video,
  ]);
  updateJob(job, { stage: "验证 Showreel 兼容性", progress: 89 });
  await validateVideoOutput(staged.video, { maxWidth: 1920, maxHeight: 1080 });
  updateJob(job, { status: "publishing", stage: "原子替换 Showreel", progress: 94 });
  const result = await publishSpecialJob(job, staged);
  updateJob(job, { status: "done", stage: "Showreel 已替换", progress: 100, result });
}

async function processJob(job) {
  if (job.metadata.workflow === "replace" && job.metadata.targetType === "hero") {
    await processHeroReplacement(job);
    return;
  }
  if (job.metadata.workflow === "replace" && job.metadata.targetType === "showreel") {
    await processShowreelReplacement(job);
    return;
  }
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
  const projectResult = await publishJob(job, staged);
  const result = {
    ...projectResult,
    workflow: job.metadata.workflow,
    targetType: "project",
    targetId: job.metadata.targetId,
    paths: {
      preview: projectResult.preview,
      full: projectResult.full,
      cover: projectResult.cover,
      ...(projectResult.avif ? { avif: projectResult.avif } : {}),
    },
  };
  result.currentAssets = result.paths;
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
  let metadata;
  try {
    metadata = await resolveUploadMetadata(decodeMetadata(request.headers["x-media-meta"]));
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    return;
  }
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

function projectAvifPath(cover) {
  const value = String(cover || "");
  return value.toLowerCase().endsWith(".webp") ? `${value.slice(0, -5)}.avif` : null;
}

async function getReplacementTargets() {
  const { records } = await readProjects(csvPath);
  const special = [
    {
      id: "hero",
      targetId: "hero",
      type: "hero",
      targetType: "hero",
      label: "首页滚轮交互视频",
      description: "生成滚轮逐帧优化的 1080p / 720p 视频与双格式封面。",
      impact: "替换首页交互素材并自动刷新浏览器缓存版本；不会改变滚轮交互逻辑。",
      currentAssets: {
        video1080: "/media/projects/主页_scrub_1080p.mp4",
        video720: "/media/projects/主页_scrub_720p.mp4",
        posterWebp: "/media/posters/home-hero.webp",
        posterAvif: "/media/posters/home-hero.avif",
      },
    },
    {
      id: "showreel",
      targetId: "showreel",
      type: "showreel",
      targetType: "showreel",
      label: "Showreel 完整视频",
      description: "生成浏览器兼容的 1080p H.264 / AAC 完整视频。",
      impact: "替换点击 SHOWREEL 后播放的独立素材，并自动刷新缓存版本。",
      currentAssets: { video: "/media/showreel/LIUKER_Showreel_2026_web.mp4" },
    },
  ];
  const projects = records.map((record) => ({
    id: record.slug,
    targetId: record.slug,
    type: "project",
    targetType: "project",
    order: Number(record.order),
    slug: record.slug,
    label: record.title_zh,
    titleZh: record.title_zh,
    titleEn: record.title_en,
    year: record.year,
    enabled: String(record.enabled).toUpperCase() !== "FALSE",
    description: `${record.category_zh} · ${record.year}`,
    impact: "只替换该项目的预览视频、完整视频和封面，保留现有标题、顺序与详情资料。",
    currentAssets: {
      preview: record.preview_video,
      full: record.full_video,
      cover: record.cover,
      avif: projectAvifPath(record.cover),
    },
  }));
  return { special, projects, targets: [...special, ...projects] };
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
      } else if (request.method === "GET" && url.pathname === "/api/replacement-targets") {
        sendJson(response, 200, await getReplacementTargets());
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
