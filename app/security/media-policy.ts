/** Phase-one abuse filtering, NOT authentication or DRM. */
export const PUBLIC_SITE_ORIGINS = [
  "https://liuker.space",
  "https://www.liuker.space",
  "https://liuker-portfolio.vercel.app",
  "https://liukerspace-liuker.vercel.app",
] as const;

export const AUTOMATED_MEDIA_CLIENT = /(?:curl|wget|python-requests|python-urllib|aiohttp|scrapy|httpclient|libwww-perl|go-http-client|okhttp|axios|aria2|yt-dlp|youtube-dl|httrack|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|anthropic-ai|ccbot|bytespider|amazonbot|meta-externalagent|perplexitybot|perplexity-user|diffbot|semrushbot|ahrefsbot|mj12bot|dotbot)/i;

const VIDEO_PATH = /\.(?:mp4|webm|mov|m4v|m3u8|mpd|m4s|ts)$/i;

function comparableOrigin(value: string) {
  const url = new URL(value);
  // NextURL normalizes loopback addresses to localhost. Apply the same
  // normalization to Referer, retaining the protocol and port. This does not
  // permit a localhost Referer to access a production domain.
  if (url.hostname === "127.0.0.1" || url.hostname === "[::1]") url.hostname = "localhost";
  return url.origin;
}

function trustedContext(value: string, requestOrigin: string) {
  try {
    const origin = comparableOrigin(value);
    return origin === comparableOrigin(requestOrigin) || PUBLIC_SITE_ORIGINS.some(site => site === origin);
  } catch {
    return false;
  }
}

export function mediaRequestDecision(url: URL, headers: Headers): "allow" | "automated-client" | "cross-site" | "direct-video" {
  if (!url.pathname.startsWith("/media/")) return "allow";
  if (AUTOMATED_MEDIA_CLIENT.test(headers.get("user-agent") || "")) return "automated-client";

  const origin = headers.get("origin");
  const referer = headers.get("referer");
  if ((origin && !trustedContext(origin, url.origin)) || (referer && !trustedContext(referer, url.origin))) {
    return "cross-site";
  }

  const fetchSite = headers.get("sec-fetch-site");
  const trustedReferer = Boolean(referer && trustedContext(referer, url.origin));
  if (fetchSite === "cross-site" && !trustedReferer) return "cross-site";

  // Permit older Safari through its same-site Referer, and privacy settings
  // through Fetch Metadata. Do not require Range: the hero preloads the whole
  // video, while ordinary players legitimately make many Range requests.
  if (VIDEO_PATH.test(url.pathname) && !trustedReferer && fetchSite !== "same-origin") {
    return "direct-video";
  }

  // Public cover previews remain accessible to legitimate link-preview agents.
  return "allow";
}
