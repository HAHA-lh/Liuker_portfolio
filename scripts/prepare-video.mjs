import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { probeMediaSync } from "./lib/media-probe.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ffmpegCommand = process.env.FFMPEG_PATH || "ffmpeg";
const ffprobeCommand = process.env.FFPROBE_PATH || "ffprobe";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const key = argument.slice(2);
    if (["overwrite", "no-avif", "help"].includes(key)) {
      options[key] = true;
      continue;
    }
    options[key] = argv[index + 1];
    index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`
LIUKER 网页视频准备工具

用法：
  npm run media:prepare -- --input "D:\\Footage\\project.mov" --slug project-name

可选参数：
  --output-dir <目录>         视频输出目录，默认 public/media/projects
  --poster-dir <目录>         封面输出目录，默认 public/media/projects/photo
  --preview-start <秒>        预览片段起点，默认 0
  --preview-duration <秒>     预览片段长度，默认 8
  --poster-time <秒>          封面截帧时间，默认预览起点 + 0.5 秒
  --overwrite                 覆盖同名输出
  --no-avif                   不生成 AVIF 封面

输出：
  <slug>-preview.mp4          720p、静音、短预览
  <slug>-full.mp4             1080p、AAC 音频、完整视频
  photo/<slug>.webp           通用封面
  photo/<slug>.avif           更轻封面（编码器支持时）
`);
}

function run(command, args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    windowsHide: true,
  });
  if (result.error) {
    if (allowFailure) return result;
    throw result.error;
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = capture ? result.stderr?.trim() : "";
    throw new Error(`${command} 执行失败${detail ? `：${detail}` : ""}`);
  }
  return result;
}

function ensureTool(command) {
  const result = run(command, ["-version"], { capture: true, allowFailure: true });
  if (result.status !== 0) {
    throw new Error(`未找到 ${command}。请先安装 FFmpeg，并确保 ${command} 可在终端中运行。`);
  }
}

function parseRate(rate) {
  const [numerator, denominator = "1"] = String(rate || "0/1").split("/").map(Number);
  return denominator ? numerator / denominator : 0;
}

function numberOption(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} 必须是非负数字。`);
  return parsed;
}

function encode(commandArgs, label) {
  console.log(`\n[${label}]`);
  run(ffmpegCommand, commandArgs);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

if (!options.input || !options.slug) {
  printHelp();
  throw new Error("必须提供 --input 和 --slug。");
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)) {
  throw new Error("--slug 只允许小写字母、数字和连字符，例如 brand-film-01。 ");
}

ensureTool(ffmpegCommand);

const inputPath = path.resolve(options.input);
if (!fs.existsSync(inputPath)) throw new Error(`找不到源视频：${inputPath}`);

const outputDirectory = path.resolve(options["output-dir"] || path.join(projectRoot, "public", "media", "projects"));
const posterDirectory = path.resolve(options["poster-dir"] || path.join(outputDirectory, "photo"));
const previewStart = numberOption(options["preview-start"], 0, "--preview-start");
const previewDuration = numberOption(options["preview-duration"], 8, "--preview-duration");
const posterTime = numberOption(options["poster-time"], previewStart + 0.5, "--poster-time");

fs.mkdirSync(outputDirectory, { recursive: true });
fs.mkdirSync(posterDirectory, { recursive: true });

const outputs = {
  preview: path.join(outputDirectory, `${options.slug}-preview.mp4`),
  full: path.join(outputDirectory, `${options.slug}-full.mp4`),
  webp: path.join(posterDirectory, `${options.slug}.webp`),
  avif: path.join(posterDirectory, `${options.slug}.avif`),
};

const expectedOutputs = [outputs.preview, outputs.full, outputs.webp, ...(!options["no-avif"] ? [outputs.avif] : [])];
const existingOutputs = expectedOutputs.filter((file) => fs.existsSync(file));
if (existingOutputs.length && !options.overwrite) {
  throw new Error(`以下输出已存在，请更换 slug 或加入 --overwrite：\n${existingOutputs.join("\n")}`);
}

const probe = probeMediaSync(inputPath, { ffmpegCommand, ffprobeCommand });
const videoStream = probe.streams?.find((stream) => stream.codec_type === "video");
const hasAudio = probe.streams?.some((stream) => stream.codec_type === "audio");
if (!videoStream) throw new Error("源文件中没有可用的视频流。");

const sourceFps = parseRate(videoStream.avg_frame_rate) || 25;
const outputFps = Math.min(sourceFps, 30);
const fpsFilter = Number.isInteger(outputFps) ? String(outputFps) : outputFps.toFixed(3);
const gop = Math.max(12, Math.round(outputFps * 2));
const overwriteFlag = options.overwrite ? "-y" : "-n";
const commonInput = [overwriteFlag, "-hide_banner", "-loglevel", "warning", "-i", inputPath];
const fullScale = `scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=${fpsFilter}`;
const previewScale = `scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=${fpsFilter}`;

encode(
  [
    overwriteFlag,
    "-hide_banner",
    "-loglevel",
    "warning",
    "-ss",
    String(previewStart),
    "-i",
    inputPath,
    "-t",
    String(previewDuration),
    "-map",
    "0:v:0",
    "-vf",
    previewScale,
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-level:v",
    "4.0",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "slow",
    "-crf",
    "23",
    "-maxrate",
    "3M",
    "-bufsize",
    "6M",
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    "-an",
    "-movflags",
    "+faststart",
    outputs.preview,
  ],
  "生成 720p 悬停预览",
);

encode(
  [
    ...commonInput,
    "-map",
    "0:v:0",
    ...(hasAudio ? ["-map", "0:a:0?"] : []),
    "-vf",
    fullScale,
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-level:v",
    "4.1",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "slow",
    "-crf",
    "20",
    "-maxrate",
    "8M",
    "-bufsize",
    "16M",
    "-g",
    String(gop),
    "-keyint_min",
    String(gop),
    "-sc_threshold",
    "0",
    ...(hasAudio ? ["-c:a", "aac", "-b:a", "160k", "-ac", "2"] : ["-an"]),
    "-movflags",
    "+faststart",
    outputs.full,
  ],
  "生成 1080p 完整视频",
);

encode(
  [
    overwriteFlag,
    "-hide_banner",
    "-loglevel",
    "warning",
    "-ss",
    String(posterTime),
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-c:v",
    "libwebp",
    "-quality",
    "82",
    "-compression_level",
    "6",
    outputs.webp,
  ],
  "生成 WebP 封面",
);

if (!options["no-avif"]) {
  console.log("\n[生成 AVIF 封面]");
  const avifResult = run(
    ffmpegCommand,
    [
      overwriteFlag,
      "-hide_banner",
      "-loglevel",
      "warning",
      "-ss",
      String(posterTime),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-c:v",
      "libaom-av1",
      "-still-picture",
      "1",
      "-crf",
      "30",
      "-cpu-used",
      "6",
      outputs.avif,
    ],
    { allowFailure: true },
  );
  if (avifResult.status !== 0) {
    console.warn("当前 FFmpeg 无法生成 AVIF，WebP 已正常生成；可使用 --no-avif 跳过此步骤。");
    if (fs.existsSync(outputs.avif)) fs.rmSync(outputs.avif);
  }
}

const publicRoot = path.join(projectRoot, "public");
const relative = (file) => {
  const assetPath = path.relative(publicRoot, file);
  if (assetPath.startsWith("..") || path.isAbsolute(assetPath)) return file;
  return `/${assetPath.split(path.sep).join("/")}`;
};
console.log(`
完成。把以下路径填入 content/projects.csv：
preview_video: ${relative(outputs.preview)}
full_video:    ${relative(outputs.full)}
cover:         ${relative(outputs.webp)}

源素材信息：${videoStream.width}x${videoStream.height} / ${sourceFps.toFixed(3)}fps / ${videoStream.codec_name} / ${videoStream.pix_fmt}
网页输出统一为 H.264 High、8-bit yuv420p、faststart，帧率最高 30fps。
`);
