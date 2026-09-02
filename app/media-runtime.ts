export type MediaRuntimeMode = "full" | "constrained" | "poster-only";

export type MediaRuntimePolicy = {
  mode: MediaRuntimeMode;
  autoPrimeHero: boolean;
  autoPlayPreviews: boolean;
  heroQuality: "720p" | "1080p";
  heroSeekIntervalMs: number;
};

type NetworkInformationLike = EventTarget & {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithPerformanceHints = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
};

export function readMediaRuntimePolicy(): MediaRuntimePolicy {
  if (typeof window === "undefined") {
    return {
      mode: "constrained",
      autoPrimeHero: false,
      autoPlayPreviews: false,
      heroQuality: "720p",
      heroSeekIntervalMs: 60,
    };
  }

  const nav = navigator as NavigatorWithPerformanceHints;
  const connection = nav.connection;
  const effectiveType = connection?.effectiveType || "";
  const saveData = Boolean(connection?.saveData);
  const verySlowNetwork = effectiveType === "slow-2g" || effectiveType === "2g";
  const constrainedNetwork = verySlowNetwork || effectiveType === "3g";
  const compactViewport = window.matchMedia("(max-width: 900px)").matches;
  const constrainedDevice =
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4);

  if (saveData || verySlowNetwork) {
    return {
      mode: "poster-only",
      autoPrimeHero: false,
      autoPlayPreviews: false,
      heroQuality: "720p",
      heroSeekIntervalMs: 80,
    };
  }

  if (constrainedNetwork || constrainedDevice || compactViewport) {
    return {
      mode: "constrained",
      autoPrimeHero: false,
      autoPlayPreviews: false,
      heroQuality: "720p",
      heroSeekIntervalMs: 64,
    };
  }

  return {
    mode: "full",
    autoPrimeHero: true,
    autoPlayPreviews: true,
    heroQuality: "1080p",
    heroSeekIntervalMs: 50,
  };
}
export function subscribeMediaRuntimePolicy(callback: (policy: MediaRuntimePolicy) => void) {
  if (typeof window === "undefined") return () => undefined;
  const nav = navigator as NavigatorWithPerformanceHints;
  const connection = nav.connection;
  const onChange = () => callback(readMediaRuntimePolicy());
  connection?.addEventListener("change", onChange);
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    connection?.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
  };
}

let activePreview: HTMLVideoElement | null = null;

export async function playExclusivePreview(video: HTMLVideoElement) {
  if (activePreview && activePreview !== video) activePreview.pause();
  activePreview = video;
  try {
    await video.play();
  } catch {
    if (activePreview === video) activePreview = null;
  }
}

export function releaseExclusivePreview(video: HTMLVideoElement) {
  video.pause();
  if (activePreview === video) activePreview = null;
}

const scrollSubscribers = new Set<(idle: boolean) => void>();
let scrollListenerAttached = false;
let scrollIdleTimer = 0;
let lastScrollY = 0;
let lastScrollAt = 0;
let scrollingFast = false;

function publishScrollState(idle: boolean) {
  scrollSubscribers.forEach((subscriber) => subscriber(idle));
}

function onScroll() {
  const now = performance.now();
  const nextY = window.scrollY;
  const elapsed = Math.max(1, now - lastScrollAt);
  const distance = Math.abs(nextY - lastScrollY);
  lastScrollY = nextY;
  lastScrollAt = now;

  if (distance / elapsed > 1.15 || distance > 140) {
    if (!scrollingFast) {
      scrollingFast = true;
      publishScrollState(false);
    }
  }

  window.clearTimeout(scrollIdleTimer);
  scrollIdleTimer = window.setTimeout(() => {
    scrollingFast = false;
    publishScrollState(true);
  }, 150);
}

function attachScrollListener() {
  if (scrollListenerAttached || typeof window === "undefined") return;
  scrollListenerAttached = true;
  lastScrollY = window.scrollY;
  lastScrollAt = performance.now();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function detachScrollListener() {
  if (!scrollListenerAttached || scrollSubscribers.size) return;
  scrollListenerAttached = false;
  window.removeEventListener("scroll", onScroll);
  window.clearTimeout(scrollIdleTimer);
}

export function subscribePreviewScrollState(callback: (idle: boolean) => void) {
  if (typeof window === "undefined") return () => undefined;
  scrollSubscribers.add(callback);
  attachScrollListener();
  callback(!scrollingFast);
  return () => {
    scrollSubscribers.delete(callback);
    detachScrollListener();
  };
}
