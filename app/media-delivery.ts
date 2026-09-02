export type MediaAssetKind =
  | "hero"
  | "preview"
  | "full"
  | "poster"
  | "showreel"
  | "interface";

const configuredOrigin = process.env.NEXT_PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/+$/, "") || "";
const configuredVersion = process.env.NEXT_PUBLIC_MEDIA_VERSION?.trim() || "20260902-balanced-v1";

export const MEDIA_DELIVERY = {
  /**
   * Leave empty while media is served by the website. Later this can be set to
   * an OSS, R2, Blob or video-CDN origin without changing project records.
   */
  origin: configuredOrigin,
  version: configuredVersion,
} as const;

function isAbsoluteMediaUrl(source: string) {
  return /^(?:https?:|data:|blob:)/i.test(source);
}

function isVersionableMediaUrl(source: string) {
  if (source.startsWith("/media/")) return true;
  if (!MEDIA_DELIVERY.origin) return false;
  return source.startsWith(`${MEDIA_DELIVERY.origin}/`);
}

function addVersion(source: string) {
  if (!isVersionableMediaUrl(source) || /[?&]v=/.test(source)) return source;
  return `${source}${source.includes("?") ? "&" : "?"}v=${encodeURIComponent(MEDIA_DELIVERY.version)}`;
}

/**
 * Single media delivery seam for the current same-origin build and a future
 * object-storage/CDN origin. Existing absolute URLs remain untouched.
 */
export function mediaUrl(source: string, kind: MediaAssetKind = "interface") {
  // The kind is intentionally part of the stable API so a future provider can
  // route preview and full assets to different delivery products.
  void kind;
  const normalized = source.trim();
  if (!normalized) return normalized;

  if (isAbsoluteMediaUrl(normalized)) {
    return addVersion(normalized);
  }

  const pathname = normalized.startsWith("/") ? normalized : `/${normalized}`;
  const resolved = MEDIA_DELIVERY.origin && pathname.startsWith("/media/")
    ? `${MEDIA_DELIVERY.origin}${pathname}`
    : pathname;
  return addVersion(resolved);
}
