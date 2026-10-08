/**
 * Client-side PDF byte cache for the in-app viewer.
 *
 * Over a slow link the old approach (pdf.js streaming the file *and* firing 64 KB range requests
 * in parallel) fetched overlapping bytes that competed for the same bandwidth. Now the viewer
 * downloads the file once (with progress), keeps it in memory for re-opens within the page, and
 * the browser HTTP cache (Cache-Control 7 days) covers later visits. `prefetchPdf` warms the next
 * documents in the background, but only while no document is being loaded in the foreground so it
 * never slows the one the user is waiting for.
 */

type Progress = (loaded: number, total: number | null) => void;

const MAX_CACHE_BYTES = 80 * 1024 * 1024;
const cache = new Map<string, Promise<Uint8Array>>();
const sizes = new Map<string, number>();
let cachedBytes = 0;
let foregroundLoads = 0;
const prefetchQueue: string[] = [];
let prefetching = false;
/** Progress subscribers per in-flight download, so a viewer opened mid-prefetch still shows %. */
const listeners = new Map<string, Set<Progress>>();

/** The in-app viewer reads the compressed viewing copy (server falls back to the original). */
export function viewerUrl(url: string): string {
  if (!url.startsWith("/api/files?") || url.includes("variant=")) return url;
  return `${url}&variant=preview`;
}

function remember(url: string, bytes: Uint8Array) {
  sizes.set(url, bytes.byteLength);
  cachedBytes += bytes.byteLength;
  // Evict oldest entries (Map keeps insertion order) beyond the budget.
  for (const key of cache.keys()) {
    if (cachedBytes <= MAX_CACHE_BYTES) break;
    if (key === url) continue;
    cachedBytes -= sizes.get(key) ?? 0;
    sizes.delete(key);
    cache.delete(key);
  }
}

async function download(url: string, onProgress?: Progress): Promise<Uint8Array> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const totalHeader = response.headers.get("content-length");
  const total = totalHeader ? Number(totalHeader) : null;
  if (!response.body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    onProgress?.(buffer.byteLength, total);
    return buffer;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function load(url: string, onProgress?: Progress): Promise<Uint8Array> {
  if (onProgress) {
    const set = listeners.get(url) ?? new Set<Progress>();
    set.add(onProgress);
    listeners.set(url, set);
  }
  const existing = cache.get(url);
  if (existing) return existing;
  const notify: Progress = (loaded, total) => listeners.get(url)?.forEach((fn) => fn(loaded, total));
  const promise = download(url, notify).then(
    (bytes) => {
      listeners.delete(url);
      remember(url, bytes);
      return bytes;
    },
    (error) => {
      listeners.delete(url);
      cache.delete(url);
      throw error;
    },
  );
  cache.set(url, promise);
  return promise;
}

/**
 * Bytes for the viewer. Returns a fresh copy each time — pdf.js transfers (detaches) the buffer
 * it is given to its worker, which would otherwise empty the cached one.
 */
export async function loadPdfBytes(url: string, onProgress?: Progress): Promise<Uint8Array> {
  foregroundLoads += 1;
  try {
    const bytes = await load(url, onProgress);
    return bytes.slice();
  } finally {
    foregroundLoads -= 1;
    void drainPrefetch();
  }
}

/** True when the bytes are already downloaded or being downloaded (e.g. by a prefetch). */
export function hasPdfBytes(url: string): boolean {
  return cache.has(url);
}

/** Hold background prefetches while the viewer lazily streams a document page by page. */
export async function asForeground<T>(work: Promise<T>): Promise<T> {
  foregroundLoads += 1;
  try {
    return await work;
  } finally {
    foregroundLoads -= 1;
    void drainPrefetch();
  }
}

/** Warm the cache for documents the user is likely to open next. Low priority, one at a time. */
export function prefetchPdf(url: string | null | undefined) {
  if (!url || typeof window === "undefined") return;
  const target = viewerUrl(url);
  if (cache.has(target) || prefetchQueue.includes(target)) return;
  prefetchQueue.push(target);
  void drainPrefetch();
}

async function drainPrefetch() {
  if (prefetching) return;
  prefetching = true;
  try {
    while (prefetchQueue.length > 0 && foregroundLoads === 0) {
      const next = prefetchQueue.shift()!;
      if (cache.has(next)) continue;
      await load(next).catch(() => undefined);
    }
  } finally {
    prefetching = false;
  }
}
