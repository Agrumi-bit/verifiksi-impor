import { VkiFormReport } from "./vki-form-report";

/** Same-site back link from `?back=` (relative paths only), else the workspace's own default. */
export function safeBack(back: string | string[] | undefined, fallback: string): string {
  const value = Array.isArray(back) ? back[0] : back;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function VkiFormPage({ refId, back, fallback }: { refId: string; back: string | string[] | undefined; fallback: string }) {
  return <VkiFormReport refId={refId} backHref={safeBack(back, fallback)} />;
}
