"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";
import { SCHEDULE_TYPE_DEFS, type ScheduleType } from "@/modules/customer-relation-workspace/status";
import { LETTER_STATUS_BADGE, LETTER_STATUS_LABELS } from "../../status";
import { SuratTugasView } from "./surat-tugas-view";
import type { PmApplicationDetail } from "./types";

type Person = { id: string; name: string; role: string };

type AssignmentInfo = {
  id: string;
  assignmentNumber: string;
  status: string;
  scheduledDate: string | null;
  location: string | null;
  letterStatus: string;
  letterNumber: string | null;
  letterReviewNote: string | null;
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function ReassignForm({
  scheduleType,
  onCancel,
  onSave,
  saving,
}: {
  scheduleType: ScheduleType;
  onCancel: () => void;
  onSave: (personId: string, date: string) => void;
  saving: boolean;
}) {
  const role = SCHEDULE_TYPE_DEFS[scheduleType].role;
  const [personId, setPersonId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: people } = useQuery({
    queryKey: ["project-manager-workspace", "people", role],
    queryFn: async () => {
      const response = await fetch(`/api/project-manager-workspace/people?role=${role}`);
      if (!response.ok) throw new Error("Gagal memuat daftar orang");
      const json = (await response.json()) as { data: Person[] };
      return json.data;
    },
  });

  return (
    <div className="mt-3 rounded-[9px] border border-dashed border-[#2f6fe0] bg-[#f5f8fe] p-3.5">
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Pilih Orang Baru</div>
          <select
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
            className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
          >
            <option value="">Pilih...</option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {people?.length === 0 && <div className="mt-1 text-[10.5px] text-[#a68f80]">Belum ada pengguna dengan role ini.</div>}
        </div>
        <div>
          <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#8a7565]">Tanggal</div>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[12.5px] text-[#20180f] outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#261813] disabled:opacity-50">
          Batal
        </button>
        <button
          type="button"
          disabled={saving || !personId}
          onClick={() => onSave(personId, date)}
          className="flex items-center gap-1.5 rounded-lg bg-[#2f6fe0] px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          <MaterialIcon name="save" className="text-[15px]" />
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}

function AssignmentCard({
  scheduleType,
  personName,
  assignment,
  applicationNumber,
  companyName,
  jenis,
}: {
  scheduleType: ScheduleType;
  personName: string | null;
  assignment: AssignmentInfo | null;
  applicationNumber: string;
  companyName: string;
  jenis: string;
}) {
  const def = SCHEDULE_TYPE_DEFS[scheduleType];
  const queryClient = useQueryClient();
  const [reassigning, setReassigning] = useState(false);
  const [viewingLetter, setViewingLetter] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const queryKey = ["project-manager-workspace", "applications", jenis, applicationNumber];

  async function handleReassign(personId: string, date: string) {
    if (!assignment) return;
    setSaving(true);
    const response = await fetch(`/api/project-manager-workspace/assignments/${assignment.id}/reassign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, date }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal mengalihkan penugasan");
      return;
    }
    toast.success(`${def.label} dialihkan.`);
    setReassigning(false);
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleLetterDecision(decision: "APPROVED" | "REJECTED") {
    if (!assignment) return;
    if (decision === "REJECTED" && !note.trim()) {
      toast.error("Catatan penolakan wajib diisi");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/project-manager-workspace/approvals/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "suratTugas", decision, note: note || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal menyimpan keputusan");
      return;
    }
    toast.success(decision === "APPROVED" ? "Surat Tugas disetujui." : "Surat Tugas dikembalikan ke Customer Relation.");
    setRejecting(false);
    setNote("");
    queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-4.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="rounded-md px-2.5 py-1 text-[11px] font-bold" style={{ background: def.bg, color: def.color }}>
          {def.label}
        </span>
        {assignment && (
          <span className={`rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${LETTER_STATUS_BADGE[assignment.letterStatus] ?? LETTER_STATUS_BADGE.DRAFT}`}>
            Surat Tugas: {LETTER_STATUS_LABELS[assignment.letterStatus] ?? assignment.letterStatus}
          </span>
        )}
      </div>

      {!assignment && <p className="text-[12.5px] text-[#a68f80]">Belum ada penugasan dari Customer Relation untuk kategori ini.</p>}

      {assignment && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[10.5px] font-bold text-[#a68f80]">PERSONEL</div>
              <div className="mt-1 text-[13.5px] font-extrabold text-[#20180f]">{personName ?? "Belum ditugaskan"}</div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold text-[#a68f80]">TANGGAL</div>
              <div className="mt-1 text-[13px] font-semibold text-[#20180f]">{fmtDate(assignment.scheduledDate)}</div>
            </div>
            {assignment.location && (
              <div>
                <div className="text-[10.5px] font-bold text-[#a68f80]">FASILITAS</div>
                <div className="mt-1 text-[13px] font-semibold text-[#20180f]">{assignment.location}</div>
              </div>
            )}
            <div>
              <div className="text-[10.5px] font-bold text-[#a68f80]">NOMOR SURAT</div>
              <div className="mt-1 text-[13px] font-semibold text-[#20180f]">{assignment.letterNumber ?? "—"}</div>
            </div>
          </div>

          {assignment.letterReviewNote && (
            <div className="mt-3 rounded-lg border border-dashed border-[#e8b1a3] bg-[#fbf8f4] p-2.5 text-[11.5px] leading-relaxed text-[#4a4038]">
              <span className="font-bold text-[#c1361f]">Catatan penolakan PM: </span>
              {assignment.letterReviewNote}
            </div>
          )}

          <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[#f0ded0] pt-3.5">
            <button
              type="button"
              onClick={() => setViewingLetter(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#fbeee5] px-3.5 py-1.75 text-[12px] font-bold text-[#7a2e15]"
            >
              <MaterialIcon name="description" className="text-[15px]" />
              Lihat Surat Tugas
            </button>
            {!reassigning && (
              <button
                type="button"
                onClick={() => setReassigning(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-1.75 text-[12px] font-semibold text-[#261813]"
              >
                <MaterialIcon name="swap_horiz" className="text-[15px]" />
                Alihkan Penugasan
              </button>
            )}
          </div>

          {reassigning && (
            <ReassignForm scheduleType={scheduleType} onCancel={() => setReassigning(false)} onSave={handleReassign} saving={saving} />
          )}

          {viewingLetter && (
            <SuratTugasView
              scheduleType={scheduleType}
              personName={personName}
              companyName={companyName}
              applicationNumber={applicationNumber}
              letter={assignment}
              onClose={() => setViewingLetter(false)}
              onApprove={() => handleLetterDecision("APPROVED")}
              onReject={() => setRejecting(true)}
              rejecting={rejecting}
              note={note}
              onNoteChange={setNote}
              onCancelReject={() => {
                setRejecting(false);
                setNote("");
              }}
              onConfirmReject={() => handleLetterDecision("REJECTED")}
              saving={saving}
            />
          )}
        </>
      )}
    </div>
  );
}

export function AssignmentTab({ data, applicationNumber, jenis }: { data: PmApplicationDetail; applicationNumber: string; jenis: string }) {
  const { survey, dokumen, technical } = data.assignments;
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[12.5px] text-[#8a7565]">
        Tinjau penugasan yang dibuat Customer Relation Workspace, alihkan personel/tanggal bila perlu, dan setujui atau tolak Surat Tugas
        sebelum berlaku resmi.
      </p>
      <AssignmentCard
        scheduleType="survey"
        personName={survey?.surveyorName ?? null}
        assignment={survey}
        applicationNumber={applicationNumber}
        companyName={data.company.companyName}
        jenis={jenis}
      />
      <AssignmentCard
        scheduleType="dokumen"
        personName={dokumen?.verifikatorName ?? null}
        assignment={dokumen}
        applicationNumber={applicationNumber}
        companyName={data.company.companyName}
        jenis={jenis}
      />
      <AssignmentCard
        scheduleType="technical"
        personName={technical?.technicalReviewerName ?? null}
        assignment={technical}
        applicationNumber={applicationNumber}
        companyName={data.company.companyName}
        jenis={jenis}
      />
    </div>
  );
}
