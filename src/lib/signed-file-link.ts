import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed links to stored files for downloaded/printed reports. Inside the app a document link
 * (`/api/files?path=…`) works because the viewer is logged in; a PDF downloaded with "Unduh PDF"
 * is opened outside the app (and was rendered from the internal http://127.0.0.1 address), so its
 * links are rewritten to the public address with `exp` + `sig` — /api/files then serves exactly
 * that one file without a session until the link expires. Server only (needs the secret).
 */

/** How long a link printed in a downloaded report stays valid. */
export const SIGNED_FILE_LINK_TTL_SECONDS = 365 * 24 * 60 * 60;

function secret(): string | null {
  return process.env.FILE_LINK_SECRET || process.env.BETTER_AUTH_SECRET || null;
}

function signature(path: string, exp: number, key: string): string {
  return createHmac("sha256", key).update(`file-link:v1:${path}:${exp}`).digest("base64url");
}

/** `exp` (unix seconds) and `sig` for `path`; null when no secret is configured. */
export function signFilePath(path: string, now = Date.now()): { exp: number; sig: string } | null {
  const key = secret();
  if (!key) return null;
  const exp = Math.floor(now / 1000) + SIGNED_FILE_LINK_TTL_SECONDS;
  return { exp, sig: signature(path, exp, key) };
}

/** Whether `sig` was issued for `path` with this `exp` and the link has not expired. */
export function verifyFilePathSignature(path: string, exp: string | null, sig: string | null, now = Date.now()): boolean {
  const key = secret();
  if (!key || !exp || !sig || !/^\d+$/.test(exp)) return false;
  const expNum = Number(exp);
  if (expNum * 1000 < now) return false;
  const expected = Buffer.from(signature(path, expNum, key));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Public base URL of the app (https://verifikasiimpor.online in production). */
export function publicAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  return url ? url.replace(/\/+$/, "") : null;
}

/**
 * The link a downloaded report should carry for `href` (as printed on the internal page):
 * /api/files links become signed public links; other links into the app become public links.
 * Anything else (external sites, mailto:, #anchors) is returned unchanged.
 */
export function publicReportHref(href: string, internalOrigin: string, now = Date.now()): string {
  // In-document links (table of contents etc.) stay internal PDF links.
  if (href.startsWith("#")) return href;
  const base = publicAppUrl();
  let url: URL;
  try {
    url = new URL(href, internalOrigin);
  } catch {
    return href;
  }
  if (url.origin !== internalOrigin || !base) return href;
  if (url.pathname === "/api/files") {
    const path = url.searchParams.get("path");
    const signed = path ? signFilePath(path, now) : null;
    if (path && signed) {
      const out = new URL(`${base}/api/files`);
      out.searchParams.set("path", path);
      const variant = url.searchParams.get("variant");
      if (variant) out.searchParams.set("variant", variant);
      out.searchParams.set("exp", String(signed.exp));
      out.searchParams.set("sig", signed.sig);
      return out.toString();
    }
  }
  return `${base}${url.pathname}${url.search}${url.hash}`;
}
