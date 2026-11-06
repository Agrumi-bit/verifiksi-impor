"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import "@/modules/surveyor-workspace/components/report/office-report-preview.css";
import "./vki-form.css";
import { A4Pages } from "@/modules/technical-analyst-workspace/components/report/a4-pages";
import { CurrentPagePdfButton } from "@/modules/technical-analyst-workspace/components/report/pdf-download-button";
import { printWithSignedLinks } from "@/lib/print-with-signed-links";
import type { VkiForm } from "@/modules/applications/vki-form/model";
import { vkiFormFlow } from "./vki-form-blocks";

export function vkiFormApiPath(ref: string): string {
  return `/api/applications/${encodeURIComponent(ref)}/formulir-vki`;
}

export function vkiFormDocxPath(ref: string): string {
  return `${vkiFormApiPath(ref)}/docx`;
}

export function useVkiForm(ref: string, enabled = true) {
  return useQuery({
    queryKey: ["applications", "formulir-vki", ref],
    enabled,
    queryFn: async () => {
      const response = await fetch(vkiFormApiPath(ref));
      const body = (await response.json().catch(() => ({}))) as { data?: VkiForm; error?: string };
      if (!response.ok || !body.data) throw new Error(body.error ?? "Gagal memuat Formulir Permohonan");
      return body.data;
    },
  });
}

function Sheet({ pageNo, total, applicationNumber, children }: { pageNo: number; total: number; applicationNumber: string; children: ReactNode }) {
  return (
    <section className="rd-sheet vf-sheet">
      <div className="rd-body vf-form">{children}</div>
      <div className="rd-pagefoot">
        <div>Formulir Permohonan VKI · {applicationNumber}</div>
        <div>
          Halaman {pageNo} dari {total}
        </div>
      </div>
    </section>
  );
}

/** Printable Formulir Permohonan VKI (Cetak / Unduh PDF / Unduh Word) — shared by every workspace. */
export function VkiFormReport({ refId, backHref, backLabel = "← Kembali ke Permohonan" }: { refId: string; backHref: string; backLabel?: string }) {
  const { data, isLoading, isError, error } = useVkiForm(refId);
  const number = data?.applicationNumber ?? refId;
  return (
    <div className="report-doc vf-doc" style={{ fontFamily: "var(--font-archivo), sans-serif" }}>
      <div className="rd-topbar">
        <Link href={backHref} className="rd-back">
          {backLabel}
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rd-topbar-title">
            Formulir Permohonan VKI {data && <span className="rd-topbar-sub">&middot; {data.applicationNumber}</span>}
          </div>
        </div>
        <div className="rd-topbar-actions">
          <a className="rd-btn" href={vkiFormDocxPath(refId)} download>
            Unduh Word
          </a>
          <button type="button" className="rd-btn" onClick={() => void printWithSignedLinks()}>
            Cetak
          </button>
          <CurrentPagePdfButton name={`Formulir-Permohonan-VKI-${number}`} />
        </div>
      </div>
      <main className="rd-main">
        {isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Memuat laporan...</p>}
        {isError && <p className="py-10 text-center text-sm text-destructive">{(error as Error).message}</p>}
        {data && (
          <A4Pages
            items={vkiFormFlow(data)}
            renderPage={(pageNo, total, children) => (
              <Sheet pageNo={pageNo} total={total} applicationNumber={data.applicationNumber}>
                {children}
              </Sheet>
            )}
          />
        )}
      </main>
    </div>
  );
}
