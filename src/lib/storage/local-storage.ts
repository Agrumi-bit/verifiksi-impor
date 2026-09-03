import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

import type { StorageNamespace, StorageService } from "./types";

const STORAGE_ROOT = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.STORAGE_ROOT ?? "storage",
);

function resolveSafePath(relativePath: string): string {
  const resolved = path.resolve(STORAGE_ROOT, relativePath);
  if (!resolved.startsWith(STORAGE_ROOT + path.sep) && resolved !== STORAGE_ROOT) {
    throw new Error(`Invalid storage path: ${relativePath}`);
  }
  return resolved;
}

export const localStorageService: StorageService = {
  async save(namespace: StorageNamespace, key: string, data) {
    const relativePath = path.join(namespace, key);
    const fullPath = resolveSafePath(relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
    return relativePath.split(path.sep).join("/");
  },

  async read(relativePath: string) {
    return readFile(resolveSafePath(relativePath));
  },

  async stat(relativePath: string) {
    const stats = await stat(resolveSafePath(relativePath));
    return { size: stats.size, mtimeMs: stats.mtimeMs };
  },

  createReadStream(relativePath: string, range) {
    return createReadStream(
      resolveSafePath(relativePath),
      range ? { start: range.start, end: range.end } : undefined,
    );
  },

  async delete(relativePath: string) {
    await rm(resolveSafePath(relativePath), { force: true });
  },

  async exists(relativePath: string) {
    return existsSync(resolveSafePath(relativePath));
  },
};
