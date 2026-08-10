import fs from "node:fs";
import { spawnSync } from "node:child_process";

function commandResult(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function durationFromTimestamp(value) {
  const match = String(value || "").match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function rateString(fps) {
  if (!Number.isFinite(fps) || fps <= 0) return "0/1";
  return `${Math.round(fps * 1000)}/1000`;
}

function probeWithFfmpeg(filePath, ffmpegCommand) {
  const result = commandResult(ffmpegCommand, ["-hide_banner", "-i", filePath]);
  if (result.error) throw result.error;
  const output = `${result.stderr || ""}\n${result.stdout || ""}`;
  const duration = durationFromTimestamp(output.match(/Duration:\s*([^,]+)/i)?.[1]);
  const videoLine = output.split(/\r?\n/).find((line) => /Stream .*Video:/i.test(line));
  if (!videoLine) throw new Error(`FFmpeg 无法读取视频流：${filePath}`);
  const audioLine = output.split(/\r?\n/).find((line) => /Stream .*Audio:/i.test(line));
  const codec = videoLine.match(/Video:\s*([^\s,(]+)/i)?.[1]?.toLowerCase() || "unknown";
  const profile = videoLine.match(/Video:\s*[^,]+?\(([^)]+)\)/i)?.[1] || "Unknown";
  const pixelFormat = videoLine.match(/,\s*(yuv[a-z0-9]+|nv\d+|p\d+le|gbrp[a-z0-9]*|rgb[a-z0-9]+)(?:\([^)]*\))?\s*,/i)?.[1] || "unknown";
  const dimensions = videoLine.match(/(?:^|,|\s)(\d{2,5})x(\d{2,5})(?:[\s,]|$)/);
  const fps = Number(videoLine.match(/([\d.]+)\s*fps/i)?.[1] || videoLine.match(/([\d.]+)\s*tbr/i)?.[1] || 0);
  const bitrateKbps = Number(output.match(/bitrate:\s*([\d.]+)\s*kb\/s/i)?.[1] || 0);
  const size = fs.statSync(filePath).size;
  const streams = [
    {
      index: 0,
      codec_type: "video",
      codec_name: codec,
      profile,
      width: Number(dimensions?.[1] || 0),
      height: Number(dimensions?.[2] || 0),
      pix_fmt: pixelFormat,
      avg_frame_rate: rateString(fps),
    },
  ];
  if (audioLine) {
    streams.push({
      index: streams.length,
      codec_type: "audio",
      codec_name: audioLine.match(/Audio:\s*([^\s,]+)/i)?.[1]?.toLowerCase() || "unknown",
    });
  }
  return {
    streams,
    format: {
      duration: String(duration),
      bit_rate: String(bitrateKbps ? bitrateKbps * 1000 : duration ? Math.round((size * 8) / duration) : 0),
      size: String(size),
    },
    probeMode: "ffmpeg",
  };
}

export function commandAvailable(command) {
  const result = commandResult(command, ["-version"]);
  return !result.error && result.status === 0;
}

export function probeMediaSync(filePath, options = {}) {
  const ffprobeCommand = options.ffprobeCommand || process.env.FFPROBE_PATH || "ffprobe";
  const ffmpegCommand = options.ffmpegCommand || process.env.FFMPEG_PATH || "ffmpeg";
  if (commandAvailable(ffprobeCommand)) {
    const result = commandResult(ffprobeCommand, [
      "-v",
      "error",
      "-show_entries",
      "stream=index,codec_type,codec_name,profile,width,height,pix_fmt,avg_frame_rate",
      "-show_entries",
      "format=duration,bit_rate,size",
      "-of",
      "json",
      filePath,
    ]);
    if (!result.error && result.status === 0) {
      return { ...JSON.parse(result.stdout), probeMode: "ffprobe" };
    }
  }
  if (!commandAvailable(ffmpegCommand)) throw new Error("未找到 FFmpeg 或 FFprobe，无法读取媒体信息");
  return probeWithFfmpeg(filePath, ffmpegCommand);
}
