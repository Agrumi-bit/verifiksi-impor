"use client";

import { useState } from "react";

import { returnSectionTitle } from "../return-rules";
import type { PayloadFieldChange } from "../payload-diff";

export type ApplicationAuditEntry = {
  id: string;
  action: string;
  actorName: string | null;
  actorRole: string | null;
  reason: string | null;
  sections: string[] | null;
  changedFields: PayloadFieldChange[] | null;
  createdAt: string;
};

const ACTION_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  RETURN: { label: "Dikembalikan untuk Revisi", color: "#b42318", bg: "#fdecea" },
  EDIT: { label: "Data Diubah oleh Admin", color: "#1f3f7a", bg: "#eef3fd" },
  RESUBMIT: { label: "Revisi Dikirim Ulang", color: "#1a7a4c", bg: "#e2f7ea" },
};

function fmtDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ChangedFields({ changes }: { changes: PayloadFieldChange[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-[12px] font-semibold text-[#2f6fe0]">
        {open ? "Sembunyikan" : "Lihat"} {changes.length} perubahan data
      </button>
      {open && (
        <div className="mt-1.5 overflow-x-auto rounded-md border border-[#efe2d4]">
          <table className="w-full text-[11.5px]">
            <thead className="bg-[#faf7f4] text-left text-[#8a7565]">
              <tr>
                <th className="px-2 py-1">Field</th>
                <th className="px-2 py-1">Sebelum</th>
                <th className="px-2 py-1">Sesudah</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.path} className="border-t border-[#f5ebe1] align-top">
                  <td className="px-2 py-1 font-mono text-[#4a4038]">{c.path}</td>
                  <td className="px-2 py-1 text-[#8a7565] break-all">{c.before}</td>
                  <td className="px-2 py-1 font-semibold text-[#20180f] break-all">{c.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** "Riwayat Perubahan" — ApplicationAuditLog entries (returns, Admin edits, resubmissions), newest first. */
export function ApplicationAuditHistory({ entries }: { entries: ApplicationAuditEntry[] }) {
  return (
    <section className="rounded-xl border border-[#f0ded0] bg-white p-5">
      <div className="text-[15px] font-extrabold text-[#20180f]">Riwayat Perubahan</div>
      {entries.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-[#8a7565]">Belum ada pengembalian, perubahan data, atau revisi.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {entries.map((entry) => {
            const meta = ACTION_LABEL[entry.action] ?? { label: entry.action, color: "#4a4038", bg: "#f2f0ee" };
            return (
              <li key={entry.id} className="border-l-2 pl-3" style={{ borderColor: meta.color }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: meta.color, background: meta.bg }}>
                    {meta.label}
                  </span>
                  <span className="text-[12px] text-[#8a7565]">
                    {fmtDateTime(entry.createdAt)} · {entry.actorName ?? "—"}
                    {entry.actorRole ? ` (${entry.actorRole})` : ""}
                  </span>
                </div>
                {entry.reason && <p className="mt-1 text-[12.5px] text-[#20180f]">Alasan: {entry.reason}</p>}
                {(entry.sections ?? []).length > 0 && (
                  <p className="mt-0.5 text-[12px] text-[#594138]">
                    Bagian: {(entry.sections ?? []).map(returnSectionTitle).join(", ")}
                  </p>
                )}
                {(entry.changedFields ?? []).length > 0 && <ChangedFields changes={entry.changedFields ?? []} />}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
