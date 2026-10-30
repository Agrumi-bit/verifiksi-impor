"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { AdministrativeRecord } from "../../dossier";
import { formatDateTime } from "../case-list/format";
import { INPUT_CLASS } from "../styles";

type Check = "finalReviewDone" | "dossierComplete";

const CHECKS: { key: Check; label: string; description: string }[] = [
  { key: "dossierComplete", label: "Dossier lengkap", description: "Keenam bagian final case file sudah diserahkan workspace sumber." },
  { key: "finalReviewDone", label: "Final Review Compliance", description: "Semua workspace sudah handover dan tidak ada temuan aktif." },
];

/** The two administrative LPV checks — Compliance's own record; blockers come from the server rules. */
export function AdministrativeChecks({
  applicationId,
  records,
  blockers,
}: {
  applicationId: string;
  records: Record<Check, AdministrativeRecord>;
  blockers: Record<Check, string | null>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Check | null>(null);

  async function toggle(check: Check, value: boolean) {
    setPending(check);
    try {
      const response = await fetch(`/api/compliance-workspace/applications/${applicationId}/administrative`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check, value }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Gagal menyimpan.");
      toast.success(value ? "Cek administratif ditandai." : "Tanda cek administratif dibatalkan.");
      router.refresh();
    } catch (cause) {
      toast.error((cause as Error).message);
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="admin-checks" className="rounded-xl border border-[#E5EAF0] bg-white p-5 shadow-sm">
      <h2 id="admin-checks" className="text-[14px] font-semibold">Cek Administratif LPV</h2>
      <p className="text-[12.5px] text-[#64748B]">Dua dari 42 requirement yang ditandai oleh Compliance sendiri.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {CHECKS.map((check) => {
          const record = records[check.key];
          const blocker = blockers[check.key];
          return (
            <li key={check.key} className="flex flex-wrap items-start gap-3 rounded-lg border border-[#E5EAF0] px-3 py-2.5">
              {record.done ? (
                <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-[#16A34A]" aria-hidden />
              ) : (
                <Circle className="mt-0.5 size-4.5 shrink-0 text-[#CBD5E1]" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{check.label}</p>
                <p className="text-[12px] text-[#64748B]">
                  {record.done ? `Ditandai ${record.byName ?? "—"} · ${formatDateTime(record.at)}` : (blocker ?? check.description)}
                </p>
              </div>
              <button
                type="button"
                disabled={pending !== null || (!record.done && blocker !== null)}
                onClick={() => toggle(check.key, !record.done)}
                className={cn(
                  INPUT_CLASS,
                  "font-medium disabled:cursor-not-allowed disabled:opacity-50",
                  record.done ? "hover:bg-[#F5F7FA]" : "border-[#1677FF] bg-[#1677FF] text-white hover:bg-[#0F62D6]",
                )}
              >
                {record.done ? "Batalkan" : "Tandai"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
