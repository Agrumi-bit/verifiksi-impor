"use client";

import { useState } from "react";

import { MaterialIcon } from "../material-icon";
import type { AssignmentStatusValue } from "../../status";
import type { TeamMemberSummary, TeamSummary } from "../assignment-detail";
import { SuratTugasViewModal } from "./surat-tugas-view-modal";

const WORKFLOW_STEPS = [
  { name: "Surveyor", stage: 0 },
  { name: "Verificator", stage: 1 },
  { name: "Technical", stage: 2 },
  { name: "Compliance", stage: 3 },
  { name: "Approval", stage: 4 },
];

const ROLE_META: { key: "surveyor" | "verifikator" | "technicalReviewer"; label: string; roleLabel: string }[] = [
  { key: "surveyor", label: "Surveyor", roleLabel: "Survey Lokasi - Fasilitas" },
  { key: "verifikator", label: "Verifikator", roleLabel: "Verifikasi Dokumen" },
  { key: "technicalReviewer", label: "Technical Reviewer", roleLabel: "Technical" },
];

type Props = {
  team: TeamSummary;
  status: AssignmentStatusValue;
  companyName: string;
  applicationNumber: string;
};

export function TeamTab({ team, status, companyName, applicationNumber }: Props) {
  const [viewing, setViewing] = useState<{ member: NonNullable<TeamMemberSummary>; roleLabel: string } | null>(null);
  const currentStage = status === "ASSIGNED" || status === "SCHEDULED" ? 0 : status === "IN_PROGRESS" ? 0 : 1;

  const roleRows = ROLE_META.map((role) => ({ ...role, member: team[role.key] }));
  const assignedCount = roleRows.filter((row) => row.member).length + team.teamMembers.length;
  const done = assignedCount > 0 && (status === "SUBMITTED" || status === "COMPLETED") ? assignedCount : 0;
  const progressPct = assignedCount > 0 ? Math.round((done / assignedCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[14px] border border-[#e8d5c5] border-l-4 border-l-sv-primary-container bg-white p-7 shadow-sm">
        <h3 className="mb-1 font-sv-headline-lg text-[19px] font-bold">Verification Workflow</h3>
        <div className="mb-6 text-sm text-[#8a7565]">Alur proses verifikasi dan approval</div>
        <div className="flex flex-wrap items-center gap-3.5">
          {WORKFLOW_STEPS.map((step, index) => {
            const active = step.stage === currentStage;
            return (
              <div key={step.name} className="flex items-center gap-3.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={
                      "flex size-[38px] shrink-0 items-center justify-center rounded-full border-[1.5px] " +
                      (active
                        ? "border-sv-primary-container bg-[#ffe9e2]"
                        : "border-[#ddd8d4] bg-[#f2f0ee]")
                    }
                  >
                    <MaterialIcon
                      name={active ? "priority_high" : "radio_button_unchecked"}
                      className={active ? "text-[19px] text-sv-primary-container" : "text-[19px] text-[#a39a92]"}
                    />
                  </div>
                  <div>
                    <div className="text-[14.5px] font-bold">{step.name}</div>
                    <div className={"text-xs " + (active ? "text-sv-primary-container" : "text-[#8a7565]")}>
                      {active ? "On Progress" : "Waiting"}
                    </div>
                  </div>
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <MaterialIcon name="chevron_right" className="text-[18px] text-[#c9b9ae]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
        <div className="mb-3.5 flex items-baseline justify-between">
          <h3 className="font-sv-headline-lg text-[16.5px] font-bold">Overall Verification Progress</h3>
          <span className="text-lg font-extrabold text-[#3b5bdb]">{progressPct}%</span>
        </div>
        <div className="mb-2.5 h-[9px] overflow-hidden rounded-full bg-[#e9e6e3]">
          <div className="h-full rounded-full bg-[#261813]" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-[13px] text-[#8a7565]">
          {done} / {assignedCount} team members completed their tasks
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
        <h3 className="mb-1 font-sv-headline-lg text-[16.5px] font-bold">Team Assignment</h3>
        <div className="mb-5 text-sm text-[#8a7565]">
          Anggota tim verifikasi (disinkronkan dari penugasan Customer Relation) beserta Surat Tugas masing-masing
        </div>
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[1.6fr_1.4fr_1.2fr] gap-3 border-b border-[#f0ded0] px-1 pb-3 text-[11.5px] uppercase tracking-wide text-[#a68f80]">
            <div>Nama</div>
            <div>Peran</div>
            <div>Surat Tugas</div>
          </div>
          {roleRows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1.6fr_1.4fr_1.2fr] items-center gap-3 border-b border-[#f5ebe1] px-1 py-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e2f7ea]">
                  <MaterialIcon name="person" className="text-[17px] text-[#027a48]" />
                </div>
                <span className="text-sm font-bold">{row.member?.name ?? "Belum ditugaskan"}</span>
              </div>
              <div className="text-[13px] text-[#594138]">{row.label}</div>
              <div>
                {row.member ? (
                  <button
                    type="button"
                    onClick={() => setViewing({ member: row.member!, roleLabel: row.roleLabel })}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-[#2f6fe0]"
                  >
                    <MaterialIcon name="description" className="text-[14px]" />
                    Lihat Surat Tugas
                  </button>
                ) : (
                  <span className="text-[12px] text-[#c9b9ae]">—</span>
                )}
              </div>
            </div>
          ))}
          {team.teamMembers.map((member, index) => (
            <div
              key={`extra-${index}`}
              className="grid grid-cols-[1.6fr_1.4fr_1.2fr] items-center gap-3 border-b border-[#f5ebe1] px-1 py-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e2f7ea]">
                  <MaterialIcon name="person" className="text-[17px] text-[#027a48]" />
                </div>
                <span className="text-sm font-bold">{member.name}</span>
              </div>
              <div className="text-[13px] text-[#594138]">{member.role ?? "—"}</div>
              <div className="text-[12px] text-[#c9b9ae]">—</div>
            </div>
          ))}
        </div>
      </div>

      {viewing && (
        <SuratTugasViewModal
          roleLabel={viewing.roleLabel}
          personName={viewing.member.name}
          date={viewing.member.date}
          letterNumber={viewing.member.letterNumber}
          letterStatus={viewing.member.letterStatus}
          companyName={companyName}
          applicationNumber={applicationNumber}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
