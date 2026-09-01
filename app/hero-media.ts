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
export const MEDIA_PRIORITY_EVENT = "liuker:media-priority";

export const MEDIA_PRIORITY = {
  hero: 0,
  selected: 1,
  capabilities: 2,
  showreel: 3,
  archive: 4,
} as const;

export type MediaPriority = (typeof MEDIA_PRIORITY)[keyof typeof MEDIA_PRIORITY];

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
    __LIUKER_HERO_FRAME_READY__?: boolean;
    __LIUKER_MEDIA_PRIORITY__?: MediaPriority;
  }
}

export function currentMediaPriority() {
  if (typeof window === "undefined") return MEDIA_PRIORITY.hero;
  return window.__LIUKER_MEDIA_PRIORITY__ ?? MEDIA_PRIORITY.hero;
}

export function unlockMediaPriority(priority: MediaPriority) {
  if (typeof window === "undefined" || currentMediaPriority() >= priority) return;
  window.__LIUKER_MEDIA_PRIORITY__ = priority;
  document.dispatchEvent(new CustomEvent<number>(MEDIA_PRIORITY_EVENT, { detail: priority }));
}

export function whenMediaPriorityReady(priority: MediaPriority, callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  if (currentMediaPriority() >= priority) {
    callback();
    return () => undefined;
  }
  const onPriority = (event: Event) => {
    if ((event as CustomEvent<number>).detail < priority) return;
    document.removeEventListener(MEDIA_PRIORITY_EVENT, onPriority);
    callback();
  };
  document.addEventListener(MEDIA_PRIORITY_EVENT, onPriority);
  return () => document.removeEventListener(MEDIA_PRIORITY_EVENT, onPriority);
}

export function markHeroFrameReady() {
  if (typeof window === "undefined") return;
  const isFirstReadyFrame = !window.__LIUKER_HERO_FRAME_READY__;
  window.__LIUKER_HERO_FRAME_READY__ = true;
  unlockMediaPriority(MEDIA_PRIORITY.selected);
  if (isFirstReadyFrame) document.dispatchEvent(new Event(HERO_FRAME_READY_EVENT));
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

  if (signal.aborted) throw abortError();
  if (existing?.objectUrl.startsWith("blob:")) URL.revokeObjectURL(existing.objectUrl);

  // Let the visible media element perform native ranged streaming. Loading the
  // whole file into a Blob here made the page wait for 6-12 MB before reveal.
  const prepared = { source, objectUrl: source, bytes: 0 };
  window.__LIUKER_PREPARED_HERO_MEDIA__ = prepared;
  onProgress?.(1);
  return prepared;
}
