"use client";

import { mediaUrl } from "./media-delivery";
import { readMediaRuntimePolicy } from "./media-runtime";

export const HERO_VIDEO_1080P_SRC =
  mediaUrl("/media/projects/home-hero-scrub-1080p-v2.mp4", "hero");
export const HERO_VIDEO_720P_SRC =
  mediaUrl("/media/projects/home-hero-scrub-720p-v2.mp4", "hero");
export const HERO_POSTER_WEBP =
  mediaUrl("/media/posters/home-hero.webp", "poster");
export const HERO_POSTER_AVIF =
  mediaUrl("/media/posters/home-hero.avif", "poster");
export const SHOWREEL_VIDEO_1080P_SRC =
  mediaUrl("/media/showreel/LIUKER_Showreel_2026_1080p-v2.mp4", "showreel");
export const SHOWREEL_VIDEO_720P_SRC =
  mediaUrl("/media/showreel/LIUKER_Showreel_2026_720p-v2.mp4", "showreel");
export const SHOWREEL_VIDEO_SRC = SHOWREEL_VIDEO_1080P_SRC;

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
  return readMediaRuntimePolicy().heroQuality === "1080p"
    ? HERO_VIDEO_1080P_SRC
    : HERO_VIDEO_720P_SRC;
}

export function selectShowreelVideoSource() {
  return readMediaRuntimePolicy().mode === "full"
    ? SHOWREEL_VIDEO_1080P_SRC
    : SHOWREEL_VIDEO_720P_SRC;
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
