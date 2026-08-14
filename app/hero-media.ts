"use client";

export const HERO_VIDEO_1080P_SRC =
  "/media/projects/%E4%B8%BB%E9%A1%B5_scrub_1080p.mp4?v=20260806-scrub-v1";
export const HERO_VIDEO_720P_SRC =
  "/media/projects/%E4%B8%BB%E9%A1%B5_scrub_720p.mp4?v=20260806-scrub-v1";
export const HERO_POSTER_WEBP =
  "/media/posters/home-hero.webp?v=20260806-scrub-v1";
export const HERO_POSTER_AVIF =
  "/media/posters/home-hero.avif?v=20260806-scrub-v1";
export const SHOWREEL_VIDEO_SRC =
  "/media/showreel/LIUKER_Showreel_2026_web.mp4?v=4b1e0911-web19";

export const HERO_MEDIA_PREPARED_EVENT = "liuker:hero-media-prepared";
export const HERO_FRAME_READY_EVENT = "liuker:hero-frame-ready";

type NavigatorWithPerformanceHints = Navigator & {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
};

type PreparedHeroMedia = {
  source: string;
  objectUrl: string;
  bytes: number;
};

declare global {
  interface Window {
    __LIUKER_PREPARED_HERO_MEDIA__?: PreparedHeroMedia;
  }
}

export function selectHeroVideoSource() {
  const nav = navigator as NavigatorWithPerformanceHints;
  const connection = nav.connection;
  const constrainedNetwork =
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g" ||
    connection?.effectiveType === "3g";
  const constrainedDevice =
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4);
  const compactViewport = window.matchMedia("(max-width: 900px)").matches;

  return constrainedNetwork || constrainedDevice || compactViewport
    ? HERO_VIDEO_720P_SRC
    : HERO_VIDEO_1080P_SRC;
}

export function getPreparedHeroVideoSource() {
  if (typeof window === "undefined") return null;
  const prepared = window.__LIUKER_PREPARED_HERO_MEDIA__;
  if (!prepared || prepared.source !== selectHeroVideoSource()) return null;
  return prepared.objectUrl;
}

function abortError() {
  return new DOMException("Hero preload aborted", "AbortError");
}

function waitForFirstDecodedFrame(source: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const video = document.createElement("video");
    let settled = false;

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    const finish = (error?: Error | DOMException) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onAbort = () => finish(abortError());
    const onReady = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish();
    };
    const onError = () =>
      finish(new Error("浏览器无法解码首屏视频，请检查网页编码格式。"));

    signal.addEventListener("abort", onAbort, { once: true });
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError, { once: true });
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = source;
    video.load();
    if (signal.aborted) onAbort();
  });
}

export async function prepareHeroVideo({
  signal,
  onProgress,
}: {
  signal: AbortSignal;
  onProgress?: (progress: number) => void;
}) {
  const source = selectHeroVideoSource();
  const existing = window.__LIUKER_PREPARED_HERO_MEDIA__;
  if (existing?.source === source) {
    onProgress?.(1);
    return existing;
  }

  const response = await fetch(source, {
    cache: "force-cache",
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    throw new Error(`首屏视频请求失败（${response.status}）`);
  }

  const totalBytes = Number(response.headers.get("content-length")) || 0;
  const contentType = response.headers.get("content-type") || "video/mp4";
  const chunks: BlobPart[] = [];
  let loadedBytes = 0;

  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      if (signal.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const chunk = new Uint8Array(value);
      chunks.push(chunk);
      loadedBytes += chunk.byteLength;
      const progress = totalBytes > 0
        ? loadedBytes / totalBytes
        : Math.min(0.92, 1 - Math.exp(-loadedBytes / (4 * 1024 * 1024)));
      onProgress?.(Math.min(0.98, progress));
    }
  } else {
    const blob = await response.blob();
    chunks.push(blob);
    loadedBytes = blob.size;
  }

  if (signal.aborted) throw abortError();
  const blob = new Blob(chunks, { type: contentType });
  const objectUrl = URL.createObjectURL(blob);

  try {
    await waitForFirstDecodedFrame(objectUrl, signal);
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }

  if (existing?.objectUrl) URL.revokeObjectURL(existing.objectUrl);
  const prepared = { source, objectUrl, bytes: loadedBytes || blob.size };
  window.__LIUKER_PREPARED_HERO_MEDIA__ = prepared;
  onProgress?.(1);
  return prepared;
}
