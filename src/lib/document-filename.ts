/**
 * Every file `/api/uploads` stores gets a `${randomUUID()}-` prefix ahead of
 * the original filename, for on-disk collision-safety across the shared
 * storage namespaces (see AGENTS.md storage strategy). That prefix is a
 * storage implementation detail — no document viewer, in any workspace,
 * should ever show it to a user as the document's name.
 *
 * The shared rule: every "Document Name" shown to a user is
 * `<CODE>_<ENTITY>_V<version>.<ext>` — e.g. an upload stored as
 * `temporary/3cbc78a5-...-AKTA_PENDIRIAN_CV_MODEL_MANIS.pdf` displays as
 * `AKTA_PENDIRIAN_CV_MODEL_MANIS_V1.pdf`. The raw stored path is only ever
 * shown in an explicit "Path Penyimpanan" field, never as the document name.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

export function buildDisplayFileName(code: string, entityName: string, version: number, path: string): string {
  const extension = path.split(".").pop() ?? "";
  const name = `${slugify(code)}_${slugify(entityName)}_V${version}`;
  return extension ? `${name}.${extension}` : name;
}
