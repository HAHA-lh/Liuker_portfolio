import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = path.join(projectRoot, "content", "projects.csv");
const publicRoot = path.join(projectRoot, "public");
const outputDirectory = path.join(publicRoot, "media", "projects");
const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const ffprobe = process.env.FFPROBE_PATH || "ffprobe";
const overwrite = process.argv.includes("--overwrite");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function normalizeAsset(value) {
  let normalized = String(value ?? "").trim().replace(/^['"]+|['"]+$/g, "").replaceAll("\\", "/");
  if (!normalized || /^(?:https?:|data:|blob:)/i.test(normalized)) return normalized;
  const publicIndex = normalized.toLowerCase().lastIndexOf("/public");
  if (publicIndex >= 0) normalized = normalized.slice(publicIndex + "/public".length);
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function localFile(asset) {
  const normalized = normalizeAsset(asset);
  if (!normalized.startsWith("/media/")) return null;
  return path.join(publicRoot, ...normalized.slice(1).split("/"));
}

function run(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} 执行失败${capture && result.stderr ? `：${result.stderr.trim()}` : ""}`);
  return result.stdout || "";
}

function durationOf(input) {
  const output = run(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", input], true);
  return Number.parseFloat(output.trim()) || 0;
}

function encodePreview(input, output, duration, retry = false) {
  const clipDuration = Math.max(1, Math.min(8, duration || 8));
  const start = duration > 9 ? Math.min(1, Math.max(0, duration - clipDuration)) : 0;
  run(ffmpeg, [
    overwrite || retry ? "-y" : "-n",
    "-hide_banner", "-loglevel", "warning",
    "-ss", String(start), "-i", input,
    "-t", String(clipDuration), "-map", "0:v:0",
    "-vf", "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=24",
    "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p",
    "-preset", "fast", "-crf", retry ? "30" : "27",
    "-maxrate", retry ? "1300k" : "1800k", "-bufsize", retry ? "2600k" : "3600k",
    "-g", "48", "-keyint_min", "48", "-sc_threshold", "0",
    "-an", "-movflags", "+faststart", output,
  ]);
}

run(ffmpeg, ["-version"], true);
run(ffprobe, ["-version"], true);

const source = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(source);
const headers = rows[0].map((header) => header.trim());
const index = Object.fromEntries(headers.map((header, position) => [header, position]));
for (const required of ["slug", "preview_video", "full_video", "enabled"]) {
  if (index[required] === undefined) throw new Error(`projects.csv 缺少字段：${required}`);
}

const migrated = [];
for (const row of rows.slice(1)) {
  const enabled = String(row[index.enabled] || "").trim().toLowerCase();
  if (["false", "0", "no", "n", "否"].includes(enabled)) continue;
  const preview = normalizeAsset(row[index.preview_video]);
  const full = normalizeAsset(row[index.full_video]);
  if (!full || preview !== full) continue;

  const slug = String(row[index.slug] || "").trim();
  const input = localFile(full);
  if (!input || !fs.existsSync(input)) throw new Error(`找不到 ${slug} 的完整视频：${input || full}`);
  const outputName = `${slug}-preview.mp4`;
  const output = path.join(outputDirectory, outputName);
  const duration = durationOf(input);

  if (!fs.existsSync(output) || overwrite) encodePreview(input, output, duration);
  if (fs.statSync(output).size > 3 * 1024 * 1024) encodePreview(input, output, duration, true);

  row[index.preview_video] = `/media/projects/${outputName}`;
  migrated.push({ slug, sizeMb: fs.statSync(output).size / 1024 / 1024 });
}

if (!migrated.length) {
  console.log("没有需要迁移的完整版预览。 ");
  process.exit(0);
}

const outputCsv = `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
const temporaryCsv = `${csvPath}.tmp`;
fs.writeFileSync(temporaryCsv, outputCsv, "utf8");
fs.renameSync(temporaryCsv, csvPath);

console.log(`\n已迁移 ${migrated.length} 个历史预览：`);
migrated.forEach((item) => console.log(`- ${item.slug}: ${item.sizeMb.toFixed(2)} MB`));
