/** One changed leaf of an application payload, as stored in ApplicationAuditLog.changedFields. */
export type PayloadFieldChange = { path: string; before: string; after: string };

const IGNORED_TOP_LEVEL_KEYS = new Set(["_meta"]);
/** Bookkeeping that changes on every save without being a data change (location snapshot time). */
const IGNORED_KEYS_ANY_DEPTH = new Set(["capturedAt"]);
const MAX_VALUE_LENGTH = 200;

function display(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walk(before: unknown, after: unknown, path: string, out: PayloadFieldChange[]) {
  if (Array.isArray(before) || Array.isArray(after)) {
    const a = Array.isArray(before) ? before : [];
    const b = Array.isArray(after) ? after : [];
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) walk(a[i], b[i], `${path}[${i}]`, out);
    return;
  }
  if (isPlainObject(before) || isPlainObject(after)) {
    const a = isPlainObject(before) ? before : {};
    const b = isPlainObject(after) ? after : {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if ((!path && IGNORED_TOP_LEVEL_KEYS.has(key)) || IGNORED_KEYS_ANY_DEPTH.has(key)) continue;
      walk(a[key], b[key], path ? `${path}.${key}` : key, out);
    }
    return;
  }
  // "" / null / undefined are all "empty" — switching between them isn't a real change.
  if (display(before) !== display(after)) out.push({ path, before: display(before), after: display(after) });
}

/** Leaf-level differences between two application payloads, e.g. `locations[0].address`. */
export function diffApplicationPayload(before: unknown, after: unknown): PayloadFieldChange[] {
  const out: PayloadFieldChange[] = [];
  walk(before, after, "", out);
  return out;
}
