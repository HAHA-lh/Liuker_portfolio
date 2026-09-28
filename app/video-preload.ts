"use client";

// Keep completed downloads for this document so players do not download twice.
const completed = new Map<string, { objectUrl: string; bytes: number }>();

export function preparedVideoSource(source: string) {
  return completed.get(source)?.objectUrl ?? source;
}

export async function preloadVideo(source: string, signal: AbortSignal, onProgress: (value: number) => void) {
  signal.throwIfAborted();
  const cached = completed.get(source);
  if (cached) { onProgress(1); return cached; }
  const response = await fetch(source, { signal });
  if (!response.ok) throw new Error(`Video HTTP ${response.status}`);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  const chunks: BlobPart[] = [];
  let bytes = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      chunks.push(value.slice().buffer as ArrayBuffer);
      if (total) onProgress(Math.min(.98, bytes / total * .98));
    }
  } else {
    const buffer = await response.arrayBuffer();
    bytes = buffer.byteLength;
    chunks.push(buffer);
  }
  signal.throwIfAborted();
  if (!bytes) throw new Error("Empty video");
  const objectUrl = URL.createObjectURL(new Blob(chunks, { type: response.headers.get("content-type") || "video/mp4" }));
  try {
    // Download completion alone does not guarantee that the browser can decode it.
    await new Promise<void>((resolve, reject) => {
      const video = document.createElement("video");
      const finish = (error?: Error) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        video.onloadeddata = null; video.onerror = null;
        video.removeAttribute("src"); video.load();
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new DOMException("Aborted", "AbortError"));
      const timer = setTimeout(() => finish(new Error("Video decode timed out")), 20000);
      signal.addEventListener("abort", abort, { once: true });
      video.muted = true; video.playsInline = true; video.preload = "auto";
      video.onloadeddata = () => finish();
      video.onerror = () => finish(new Error("Video could not be decoded"));
      video.src = objectUrl; video.load();
    });
    signal.throwIfAborted();
    const prepared = { objectUrl, bytes };
    completed.set(source, prepared);
    onProgress(1);
    return prepared;
  } catch (error) { URL.revokeObjectURL(objectUrl); throw error; }
}
