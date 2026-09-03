import { localStorageService } from "./local-storage";
import type { StorageService } from "./types";

export type {
  StorageFileStat,
  StorageNamespace,
  StorageReadRange,
  StorageService,
} from "./types";
export { STORAGE_NAMESPACES } from "./types";

/**
 * V1 always resolves to local disk storage (see AGENTS.md "Storage Strategy").
 * Business code only depends on the `StorageService` interface, so swapping
 * in an S3-compatible implementation later is a change confined to this file.
 */
export const storage: StorageService = localStorageService;
