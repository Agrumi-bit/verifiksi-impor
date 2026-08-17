"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "./material-icon";
import type { PmApprovalItem } from "@/app/api/project-manager-workspace/dashboard/route";
import {
  APPROVAL_CATEGORIES,
  APPROVAL_CATEGORY_META,
  PM_APPROVAL_STATUS_BADGE,
  PM_APPROVAL_STATUS_LABELS,
  PM_STAT_CARDS,
  type ApprovalCategory,
  type PmDashboardStats,
} from "../status";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Shared approve/reject row — one item from one of the 4 real categories in `dashboard/route.ts`. */
function ApprovalRow({ item, onDecided }: { item: PmApprovalItem; onDecided: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(decision: "APPROVED" | "REJECTED") {
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Catatan penolakan wajib diisi");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/project-manager-workspace/approvals/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: item.category, decision, note: note || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan keputusan");
      return;
    }
    toast.success(`${item.title} ditandai ${PM_APPROVAL_STATUS_LABELS[decision]}.`);
    setRejecting(false);
    setNote("");
    onDecided();
  }

  return (
    <div className="rounded-[9px] border border-[#f0ded0] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#fbeee5]">
            <MaterialIcon name={APPROVAL_CATEGORY_META[item.category].msi} className="text-[16px] text-[#c14a1f]" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[#20180f]">{item.title}</div>
            <div className="mt-0.5 text-[11.5px] text-[#a68f80]">
              {item.company} · {item.refId} · {fmtDate(item.date)}
            </div>
            <div className="mt-0.5 text-[11px] text-[#a68f80]">{item.meta}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${PM_APPROVAL_STATUS_BADGE[item.status]}`}>
            {PM_APPROVAL_STATUS_LABELS[item.status]}
          </span>
          {item.status === "PENDING" && !rejecting && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => submit("APPROVED")}
                className="rounded-lg bg-[#1a9850] px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setRejecting(true)}
                className="rounded-lg border border-[#e15241] px-3 py-1.5 text-[11.5px] font-bold text-[#e15241] disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </div>
      {rejecting && (
        <div className="mt-3 border-t border-[#f0ded0] pt-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Jelaskan alasan penolakan..."
            rows={2}
            className="w-full rounded-lg border border-[#e8b1a3] bg-white p-2.5 text-[12.5px] text-[#20180f] outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setNote("");
              }}
              className="rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#261813]"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submit("REJECTED")}
              className="rounded-lg bg-[#e15241] px-3 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Konfirmasi Reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type DashboardData = {
  stats: PmDashboardStats;
  items: PmApprovalItem[];
  recentActivity: PmApprovalItem[];
};

/** Optional `jenis` scopes this to a VKI/VIU sub-dashboard (design's `isSubDashboard`); omitted = global dashboard. */
export function ProjectManagerDashboard({ jenis }: { jenis?: "VKI" | "VIU" }) {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<ApprovalCategory | "ALL">("ALL");
  const [groupByCompany, setGroupByCompany] = useState(false);

  const queryKey = ["project-manager-workspace", "dashboard"];
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/dashboard`);
      if (!response.ok) throw new Error("Gagal memuat dashboard");
      const json = (await response.json()) as { data: DashboardData };
      return json.data;
    },
  });

  if (isLoading) return <p className="p-6 text-center text-[13px] text-[#8a7565]">Memuat...</p>;
  if (isError || !data) return <p className="p-6 text-center text-[13px] text-[#c1361f]">Gagal memuat dashboard.</p>;

  const scoped = jenis ? data.items.filter((i) => i.jenis === jenis) : data.items;
  const pending = scoped.filter((i) => i.status === "PENDING" && (categoryFilter === "ALL" || i.category === categoryFilter));

  const groupedByCompany = groupByCompany
    ? Object.entries(
        pending.reduce<Record<string, PmApprovalItem[]>>((acc, item) => {
          (acc[item.company] ??= []).push(item);
          return acc;
        }, {}),
      )
    : null;

  const statCards = jenis
    ? [
        { key: "pending", label: "Pending", value: pending.length, icon: "hourglass_top", color: "#c14a1f", iconBg: "#fdeadd" },
        {
          key: "approved",
          label: "Approved",
          value: scoped.filter((i) => i.status === "APPROVED").length,
          icon: "check_circle",
          color: "#1a9850",
          iconBg: "#e6f6ec",
        },
        {
          key: "rejected",
          label: "Rejected",
          value: scoped.filter((i) => i.status === "REJECTED").length,
          icon: "cancel",
          color: "#e15241",
          iconBg: "#fdeceb",
        },
      ]
    : PM_STAT_CARDS.map((card) => ({ ...card, value: data.stats[card.key] }));

  return (
    <div>
      <div className="mb-5.5">
        <div className="text-[22px] font-extrabold">{jenis ? `Dashboard ${jenis}` : "Dashboard"}</div>
        <div className="mt-1 text-[13px] text-[#8a7565]">
          {jenis
            ? `Ringkasan status persetujuan untuk permohonan ${jenis}.`
            : "Ringkasan seluruh item yang menunggu persetujuan Project Manager."}
        </div>
      </div>

      <div className={`mb-6 grid gap-3.5 ${jenis ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-5"}`}>
        {statCards.map((card) => (
          <div key={card.key} className="rounded-[10px] border border-[#f0ded0] bg-white p-3.5">
            <div
              className="mb-2.5 flex size-8 items-center justify-center rounded-lg"
              style={{ background: card.iconBg }}
            >
              <MaterialIcon name={card.icon} className="text-[17px]" style={{ color: card.color }} />
            </div>
            <div className="text-[22px] font-extrabold" style={{ color: card.color }}>
              {card.value}
            </div>
            <div className="mt-0.5 text-[11.5px] font-semibold text-[#8a7565]">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] font-extrabold">{jenis ? "Item Menunggu Persetujuan" : "Aktivitas Persetujuan Terbaru"}</div>
          {jenis && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setGroupByCompany((v) => !v)}
                className={`rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold ${groupByCompany ? "border-[#e0662e] bg-[#fdeadd] text-[#c14a1f]" : "border-[#e1bfb3] bg-white text-[#5c4a3d]"}`}
              >
                {groupByCompany ? "Per Kategori" : "Per Perusahaan"}
              </button>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as ApprovalCategory | "ALL")}
                className="rounded-lg border border-[#e8d5c5] px-2.5 py-1.5 text-[11.5px] text-[#5c4a3d]"
              >
                <option value="ALL">Semua Kategori</option>
                {APPROVAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {APPROVAL_CATEGORY_META[c].label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!jenis && (
          <div className="flex flex-col gap-2.5">
            {data.recentActivity.length === 0 && <p className="text-[13px] text-[#a68f80]">Belum ada aktivitas.</p>}
            {data.recentActivity.map((item) => (
              <div key={`${item.category}:${item.id}`} className="flex items-center justify-between rounded-[9px] border border-[#f0ded0] p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#fbeee5]">
                    <MaterialIcon name={APPROVAL_CATEGORY_META[item.category].msi} className="text-[16px] text-[#c14a1f]" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#20180f]">{item.title}</div>
                    <div className="mt-0.5 text-[11.5px] text-[#a68f80]">
                      {APPROVAL_CATEGORY_META[item.category].source} · {item.company} · {fmtDate(item.date)}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${PM_APPROVAL_STATUS_BADGE[item.status]}`}>
                  {PM_APPROVAL_STATUS_LABELS[item.status]}
                </span>
              </div>
            ))}
          </div>
        )}

        {jenis && !groupByCompany && (
          <div className="flex flex-col gap-2.5">
            {pending.length === 0 && <p className="text-[13px] text-[#a68f80]">Tidak ada item pending.</p>}
            {pending.map((item) => (
              <ApprovalRow key={`${item.category}:${item.id}`} item={item} onDecided={() => queryClient.invalidateQueries({ queryKey })} />
            ))}
          </div>
        )}

        {jenis && groupByCompany && (
          <div className="flex flex-col gap-4">
            {(groupedByCompany ?? []).length === 0 && <p className="text-[13px] text-[#a68f80]">Tidak ada item pending.</p>}
            {(groupedByCompany ?? []).map(([company, companyItems]) => (
              <div key={company}>
                <div className="mb-2 text-[12.5px] font-bold text-[#20180f]">
                  {company} <span className="font-normal text-[#a68f80]">({companyItems.length} item)</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {companyItems.map((item) => (
                    <ApprovalRow key={`${item.category}:${item.id}`} item={item} onDecided={() => queryClient.invalidateQueries({ queryKey })} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
