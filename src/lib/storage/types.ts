export const STORAGE_NAMESPACES = [
  "companies",
  "documents",
  "inspection",
  "certificates",
  "signatures",
  "photos",
  "qrcode",
  "temporary",
] as const;

export type StorageNamespace = (typeof STORAGE_NAMESPACES)[number];

export type StorageService = {
  /** Persists a file under `namespace/key` and returns the path to store in the database. */
  save(
    namespace: StorageNamespace,
    key: string,
    data: Buffer | Uint8Array,
  ): Promise<string>;
  read(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
};
