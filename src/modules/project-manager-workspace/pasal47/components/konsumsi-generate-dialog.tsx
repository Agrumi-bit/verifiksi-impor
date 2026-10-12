"use client";

import { useState, type ReactNode } from "react";

import type { P47Report, ReportStatus } from "../types";

/*
 * Dialog khusus VIU Konsumsi — salinan terpisah; perubahan di sini tidak memengaruhi skema lain.
 * "Generate Laporan": before the printable report opens, the Project Manager sets the tanggal
 * penyusunan shown under DISUSUN OLEH (and on the cover) and the STATUS LAPORAN. Both are saved with
 * the period's review state, then the report opens in a new tab.
 */

const STATUS_OPTIONS: [ReportStatus, string, string][] = [
  ["DRAFT", "Draf", "Isi masih dapat berubah mengikuti data dan penelaahan."],
  ["REVIEWED", "Ditelaah", "Project Manager telah menelaah isi laporan."],
  ["APPROVED", "Disetujui", "Laporan disetujui dan siap disampaikan kepada Kementerian Perindustrian."],
];
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function GenerateReportButton({
  report,
  reportHref,
  saveReport,
  disabled,
  className = "btn primary",
  children,
}: {
  report: P47Report | undefined;
  reportHref: string;
  saveReport: (patch: { status?: ReportStatus; preparedAt?: string | null }) => Promise<void>;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [preparedAt, setPreparedAt] = useState("");
  const [status, setStatus] = useState<ReportStatus>("DRAFT");
  const [saving, setSaving] = useState(false);

  function show() {
    setPreparedAt(report?.preparedAt ?? todayKey());
    setStatus(report?.status ?? "DRAFT");
    setOpen(true);
  }

  async function submit() {
    // Opened before the save so the browser does not treat it as an unrequested pop-up.
    const tab = window.open("about:blank", "_blank");
    setSaving(true);
    try {
      await saveReport({ preparedAt: preparedAt || null, status });
      if (tab) tab.location.href = reportHref;
      else window.location.href = reportHref;
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={show} disabled={disabled || !report}>{children}</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Generate Laporan" onClick={() => !saving && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(32,24,15,0.45)", display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px, 100%)", background: "#fff", borderRadius: 14, padding: 22, boxShadow: "0 18px 50px rgba(0,0,0,0.25)", color: "#20180f" }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Generate Laporan</div>
            <div style={{ fontSize: 12.5, color: "#8a7565", marginTop: 4 }}>Atur tanggal penyusunan dan status laporan sebelum laporan dibuka.</div>

            <label style={{ display: "block", marginTop: 16, fontSize: 12, fontWeight: 700 }}>
              Tanggal Penyusunan (Disusun Oleh)
              <input type="date" value={preparedAt} max={todayKey()} onChange={(e) => setPreparedAt(e.target.value)}
                style={{ display: "block", marginTop: 6, width: "100%", border: "1px solid #e1d4c4", borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 400 }} />
              <span style={{ display: "block", marginTop: 4, fontSize: 11, fontWeight: 400, color: "#a68f80" }}>Tercetak pada halaman persetujuan dan sampul (Tanggal Terbit bila status Disetujui).</span>
            </label>

            <fieldset style={{ border: 0, padding: 0, margin: "16px 0 0" }}>
              <legend style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Status Laporan</legend>
              <div style={{ display: "grid", gap: 6 }}>
                {STATUS_OPTIONS.map(([value, label, hint]) => (
                  <label key={value} style={{ display: "flex", gap: 10, alignItems: "flex-start", border: `1px solid ${status === value ? "#e0662e" : "#efe3d6"}`, background: status === value ? "#fdf1e8" : "#fff", borderRadius: 10, padding: "9px 12px", cursor: "pointer" }}>
                    <input type="radio" name="report-status" checked={status === value} onChange={() => setStatus(value)} style={{ marginTop: 3 }} />
                    <span>
                      <b style={{ fontSize: 13 }}>{label}</b>
                      <span style={{ display: "block", fontSize: 11.5, color: "#8a7565" }}>{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button type="button" className="btn" onClick={() => setOpen(false)} disabled={saving}>Batal</button>
              <button type="button" className="btn primary" onClick={submit} disabled={saving || !preparedAt}>{saving ? "Menyimpan…" : "Simpan & Buka Laporan"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
