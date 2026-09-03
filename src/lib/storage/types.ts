import type { Readable } from "node:stream";

export const STORAGE_NAMESPACES = [
  "companies",
  "documents",
  "inspection",
  "certificates",
  "signatures",
  "photos",
  "qrcode",
  "templates",
  "temporary",
] as const;

export type StorageNamespace = (typeof STORAGE_NAMESPACES)[number];

export type StorageFileStat = {
  /** File size in bytes — used for `Content-Length` and HTTP Range validation. */
  size: number;
  /** Last-modified time in epoch milliseconds — used for `Last-Modified` / `ETag` validators. */
  mtimeMs: number;
};

export type StorageReadRange = {
  /** Inclusive byte offset to start reading from. */
  start: number;
  /** Inclusive byte offset to stop reading at. */
  end: number;
};

export type StorageService = {
  /** Persists a file under `namespace/key` and returns the path to store in the database. */
  save(
    namespace: StorageNamespace,
    key: string,
    data: Buffer | Uint8Array,
  ): Promise<string>;
  read(path: string): Promise<Buffer>;
  /** Metadata only — never reads the file body. Backs HEAD responses and Range checks. */
  stat(path: string): Promise<StorageFileStat>;
  /**
   * Streams the file instead of buffering it in memory. Pass a byte `range` to stream
   * only that slice (for HTTP 206 partial responses).
   */
  createReadStream(path: string, range?: StorageReadRange): Readable;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
};
