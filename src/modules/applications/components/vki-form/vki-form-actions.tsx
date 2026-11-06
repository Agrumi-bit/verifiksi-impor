"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, FileText } from "lucide-react";

import { vkiFormDocxPath } from "./vki-form-report";

const BTN =
  "inline-flex items-center gap-1.5 rounded-md border border-current/20 bg-white px-3 py-1.5 text-xs font-semibold text-inherit shadow-xs transition hover:bg-black/5";

/**
 * "Formulir Permohonan" (A4 page: Cetak / Unduh PDF) + "Unduh Word" for a VKI application.
 * `href` is the workspace's own formulir page; the current page is passed as `?back=`.
 */
export function VkiFormActions({ href, refId, className }: { href: string; refId: string; className?: string }) {
  const pathname = usePathname();
  const target = pathname ? `${href}?back=${encodeURIComponent(pathname)}` : href;
  return (
    <div className={["flex flex-wrap items-center gap-2", className].filter(Boolean).join(" ")}>
      <Link href={target} className={BTN}>
        <FileText className="size-3.5" />
        Formulir Permohonan
      </Link>
      <a href={vkiFormDocxPath(refId)} download className={BTN}>
        <Download className="size-3.5" />
        Unduh Word
      </a>
    </div>
  );
}
