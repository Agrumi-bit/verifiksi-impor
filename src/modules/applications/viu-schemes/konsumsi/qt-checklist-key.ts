/** Matches `konsumsi-qt:{brandId}:{commodityGroupId}` — the one checklist key shape
 * `applyChecklistDocumentPath` deliberately does NOT handle (see certificate-upload.ts's own
 * comment): a certificate needs more than a bare file path, so it gets its own richer upload path.
 * Pure (no DB import) so both the server route handlers and the client review modal can import it
 * without pulling Prisma into the client bundle. */
export function parseQualityTestChecklistKey(key: string): { brandId: string; commodityGroupId: string } | null {
  const match = key.match(/^konsumsi-qt:([^:]+):(.+)$/);
  if (!match) return null;
  return { brandId: match[1], commodityGroupId: match[2] };
}
