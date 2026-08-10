import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { probeMediaSync } from "./lib/media-probe.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaRoot = path.join(projectRoot, "public", "media");
const ffprobeCommand = process.env.FFPROBE_PATH || "ffprobe";
const ffmpegCommand = process.env.FFMPEG_PATH || "ffmpeg";
const strict = process.argv.includes("--strict");
const supportedExtensions = new Set([".mp4", ".m4v", ".mov", ".webm"]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function parseRate(value) {
  const [numerator, denominator = "1"] = String(value || "0/1").split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

function hasFastStart(filePath) {
  if (path.extname(filePath).toLowerCase() !== ".mp4") return true;
  const handle = fs.openSync(filePath, "r");
  try {
    const size = Math.min(fs.statSync(filePath).size, 2 * 1024 * 1024);
    const buffer = Buffer.alloc(size);
    fs.readSync(handle, buffer, 0, size, 0);
    const text = buffer.toString("latin1");
    const moov = text.indexOf("moov");
    const mdat = text.indexOf("mdat");
    return moov >= 0 && (mdat < 0 || moov < mdat);
  } finally {
    fs.closeSync(handle);
  }
}

function probe(filePath) {
  return probeMediaSync(filePath, { ffmpegCommand, ffprobeCommand });
}

if (!fs.existsSync(mediaRoot)) throw new Error(`找不到媒体目录：${mediaRoot}`);

const files = walk(mediaRoot).filter((file) => supportedExtensions.has(path.extname(file).toLowerCase()));
const results = [];

for (const file of files) {
  let data;
  try {
    data = probe(file);
  } catch (error) {
    results.push({ file, issues: [`ffprobe 无法读取：${error.message}`] });
    continue;
  }

  const video = data.streams?.find((stream) => stream.codec_type === "video");
  const audio = data.streams?.find((stream) => stream.codec_type === "audio");
  const issues = [];
  const extension = path.extname(file).toLowerCase();
  const fileSizeMb = fs.statSync(file).size / 1024 / 1024;
  const bitrateMbps = Number(data.format?.bit_rate || 0) / 1_000_000;
  const fps = parseRate(video?.avg_frame_rate);
  const isScrubAsset = /_scrub_/i.test(path.basename(file));

  if (!video) issues.push("缺少视频流");
  if (extension === ".mp4" && video?.codec_name !== "h264") issues.push(`MP4 使用 ${video?.codec_name || "未知"}，通用回退应为 H.264`);
  if (video?.codec_name === "h264" && (video.pix_fmt !== "yuv420p" || /10/i.test(video.profile || ""))) {
    issues.push(`浏览器兼容风险：${video.profile || "H.264"} / ${video.pix_fmt || "未知像素格式"}`);
  }
  if ((video?.width || 0) > 1920 || (video?.height || 0) > 1080) issues.push(`分辨率过高：${video.width}x${video.height}`);
  if (fps > 30.1) issues.push(`帧率偏高：${fps.toFixed(2)}fps`);
  if (fileSizeMb > 60) issues.push(`文件偏大：${fileSizeMb.toFixed(1)}MB`);
  if (bitrateMbps > (isScrubAsset ? 14 : 10)) issues.push(`码率偏高：${bitrateMbps.toFixed(1)}Mbps`);
  if (audio && extension === ".mp4" && audio.codec_name !== "aac") issues.push(`音频应优先 AAC，当前为 ${audio.codec_name}`);
  if (!hasFastStart(file)) issues.push("未检测到 faststart（moov atom 不在文件前部）");

  results.push({
    file,
    issues,
    summary: `${video?.codec_name || "?"}/${video?.profile || "?"} ${video?.width || "?"}x${video?.height || "?"} ${video?.pix_fmt || "?"} ${fps ? `${fps.toFixed(2)}fps` : "?fps"} ${fileSizeMb.toFixed(1)}MB`,
  });
}

console.log(`\nLIUKER 媒体审查：${results.length} 个视频\n`);
for (const result of results) {
  const relativePath = path.relative(projectRoot, result.file).split(path.sep).join("/");
  const status = result.issues.length ? "WARN" : "OK";
  console.log(`[${status}] ${relativePath}${result.summary ? ` — ${result.summary}` : ""}`);
  result.issues.forEach((issue) => console.log(`       - ${issue}`));
}

const warningFiles = results.filter((result) => result.issues.length);
console.log(`\n结果：${results.length - warningFiles.length} 个通过，${warningFiles.length} 个需要处理。`);
console.log("新素材可运行 npm run media:prepare 自动生成网页版本。\n");

if (strict && warningFiles.length) process.exitCode = 1;
