"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";

import { DocumentsTab } from "./review/documents-tab";
import { AssignTab } from "./review/assign-tab";
import { TimelineTab } from "./review/timeline-tab";
import type { DocVerificationStatusValue } from "../status";

export type ApplicationDetail = {
  id: string;
  applicationNumber: string;
  company: string;
  jenis: string;
  category: string;
  submitted: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  docsLengkap: number;
  docsTotal: number;
  complete: boolean;
  crOutcome: string;
  crFollowUpDate: string | null;
  crNotes: string;
  documents: {
    key: string;
    label: string;
    category: string;
    documentPath: string | null;
    lengkap: boolean;
    status: DocVerificationStatusValue;
    rejectionNote: string;
    requestNote: string;
  }[];
  schedules: {
    id: string;
    scheduleType: "survey" | "dokumen" | "technical";
    typeLabel: string;
    facility: string | null;
    date: string | null;
    person: string;
    status: string;
    letterNumber: string | null;
    letterStatus: "DRAFT" | "PENDING" | "APPROVED";
  }[];
  workflowStages: { key: string; label: string; done: boolean; active: boolean }[];
};

const TABS = [
  { key: "docs", label: "Kelengkapan Dokumen" },
  { key: "assign", label: "Penugasan" },
  { key: "timeline", label: "Timeline" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function fmtDate(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function ApplicationReview({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("docs");
  const [editMode, setEditMode] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const queryKey = ["customer-relation-workspace", "applications", "detail", id];
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`/api/customer-relation-workspace/applications/${id}`);
      if (!response.ok) throw new Error("Permohonan tidak ditemukan");
      const json = (await response.json()) as { data: ApplicationDetail };
      return json.data;
    },
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ["customer-relation-workspace", "applications"] });
  }

  function startEdit() {
    setNotesDraft(data?.crNotes ?? "");
    setEditMode(true);
  }

  async function saveNotes() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/customer-relation-workspace/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edit: { notes: notesDraft } }),
      });
      if (!response.ok) {
        toast.error("Gagal menyimpan catatan");
        return;
      }
      toast.success("Catatan berhasil disimpan.");
      setEditMode(false);
      invalidate();
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="p-7 text-[13px] text-[#8a7565]">Memuat...</p>;
  if (isError || !data) return <p className="p-7 text-[13px] text-[#ba1a1a]">Permohonan tidak ditemukan.</p>;

  const showMarkAcceptedButton = data.complete && data.crOutcome === "Diproses";

  async function markAccepted() {
    const response = await fetch(`/api/customer-relation-workspace/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crOutcome: "Penugasan" }),
    });
    if (!response.ok) {
      toast.error("Gagal menandai permohonan diterima");
      return;
    }
    toast.success("Permohonan ditandai diterima — siap ditugaskan.");
    invalidate();
  }

  return (
    <div className="max-w-230 p-7">
      <div className="mb-4.5 flex items-center gap-2.5">
        <button type="button" onClick={() => router.back()} className="text-[#a68f80]">
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <div className="text-[20px] font-extrabold text-[#2b2420]">{data.company}</div>
          <div className="mt-0.5 text-[12px] text-[#8a7565]">
            {data.applicationNumber} · {data.jenis} · Diajukan {fmtDate(data.submitted)}
          </div>
        </div>
      </div>

      <div className="mb-4.5 rounded-xl border border-[#f0ded0] bg-white p-5.5">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[15px] font-extrabold text-[#20180f]">Data Aplikasi</div>
          {!editMode ? (
            <button
              type="button"
              onClick={startEdit}
              className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-1.75 text-[12.5px] font-semibold text-[#261813]"
            >
              <Pencil className="size-4" />
              Edit Catatan
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-1.75 text-[12.5px] font-semibold text-[#261813]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveNotes}
                disabled={isSaving}
                className="rounded-lg bg-[#e0662e] px-3.5 py-1.75 text-[12.5px] font-bold text-white disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-x-5 gap-y-3.5 sm:grid-cols-6">
          {[
            { label: "Nomor Permohonan", value: data.applicationNumber },
            { label: "Nama Perusahaan", value: data.company },
            { label: "Jenis Verifikasi", value: data.jenis },
            { label: "Klasifikasi Permohonan", value: data.category },
            { label: "Tanggal Pengajuan", value: fmtDate(data.submitted) },
            { label: "Due Date", value: "-" },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-[11.5px] font-semibold text-[#a68f80]">{f.label}</div>
              <div className="mt-0.75 text-[13.5px] font-semibold text-[#20180f]">{f.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-[#f5ebe1] pt-3.5">
          <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">Catatan Internal</div>
          {editMode ? (
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={3}
              placeholder="Catatan untuk tim review..."
              className="w-full resize-y rounded-lg border-none bg-[#f7f2ec] p-2.75 font-sans text-[13px] text-[#20180f] outline-none"
            />
          ) : (
            <p className="text-[13px] text-[#4a4038]">{data.crNotes || "—"}</p>
          )}
        </div>
      </div>

      <div className="mb-4.5 flex gap-1 border-b border-[#f0ded0]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="border-b-2.5 px-4.5 py-2.5 text-[13px]"
            style={{
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? "#c14a1f" : "#6b5b4c",
              borderColor: tab === t.key ? "#e0662e" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "docs" && (
        <DocumentsTab
          applicationId={id}
          company={data.company}
          documents={data.documents}
          docsSummary={`${data.docsLengkap}/${data.docsTotal} Dokumen Lengkap`}
          showMarkAcceptedButton={showMarkAcceptedButton}
          onMarkAccepted={markAccepted}
          onChanged={invalidate}
        />
      )}
      {tab === "assign" && <AssignTab applicationId={id} schedules={data.schedules} onChanged={invalidate} />}
      {tab === "timeline" && <TimelineTab stages={data.workflowStages} />}
    </div>
  );
}
