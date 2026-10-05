/** Public API of the per-scheme module. Consumers import from "@/modules/schemes" only. */
export * from "./types";
export * from "./resolvers";
export { SCHEMES, getScheme } from "./registry";
export { formatLegalBasis, INTERNAL_LVI_LABEL } from "./shared/legal";
