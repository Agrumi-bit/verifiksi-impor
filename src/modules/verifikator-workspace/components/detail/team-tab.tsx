"use client";

import { useState } from "react";

import { MaterialIcon } from "../material-icon";
import type { AssignmentDetailData, TeamMemberSummary } from "../assignment-detail";
import { SuratTugasViewModal } from "./surat-tugas-view-modal";

const ROLE_LABELS: Record<"Surveyor" | "Verifikator" | "Technical Reviewer", string> = {
  Surveyor: "Survey Lokasi - Fasilitas",
  Verifikator: "Verifikasi Dokumen",
  "Technical Reviewer": "Technical",
};

function fmtDate(value: string | null): string {
  if (!value) return "Tanggal belum dijadwalkan";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function TeamRow({
  icon,
  role,
  member,
  onViewSuratTugas,
}: {
  icon: string;
  role: "Surveyor" | "Verifikator" | "Technical Reviewer";
  member: TeamMemberSummary;
  onViewSuratTugas: (member: TeamMemberSummary, role: "Surveyor" | "Verifikator" | "Technical Reviewer") => void;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[9px] bg-[#f7f2ec] p-3.5">
      <div className="flex items-center gap-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fdeadd]">
          <MaterialIcon name={icon} className="text-[18px] text-[#e0662e]" />
        </div>
        <div>
          <div className="text-[11px] text-[#8a7565]">{role}</div>
          <div className="text-[13.5px] font-bold text-[#20180f]">{member?.name ?? "Belum ditugaskan"}</div>
        </div>
      </div>
      {member && (
        <div className="flex flex-col gap-1.5 border-t border-[#e8dccd] pt-2.5">
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#6b5b4c]">
            <MaterialIcon name="event" className="text-[14px] text-[#a68f80]" />
            {fmtDate(member.date)}
          </div>
          <button
            type="button"
            onClick={() => onViewSuratTugas(member, role)}
            className="flex w-fit items-center gap-1.5 text-[11.5px] font-bold text-[#2f6fe0]"
          >
            <MaterialIcon name="description" className="text-[14px]" />
            Lihat Surat Tugas
          </button>
        </div>
      )}
    </div>
  );
}

export function TeamTab({
  team,
  companyName,
  applicationNumber,
}: {
  team: AssignmentDetailData["team"];
  companyName: string;
  applicationNumber: string;
}) {
  const [viewing, setViewing] = useState<{ member: TeamMemberSummary; role: "Surveyor" | "Verifikator" | "Technical Reviewer" } | null>(null);

  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
      <div className="mb-4 flex items-center gap-2">
        <MaterialIcon name="groups" className="text-[19px] text-[#e0662e]" />
        <h3 className="text-[14.5px] font-extrabold text-[#20180f]">Tim Verifikasi</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TeamRow icon="engineering" role="Surveyor" member={team.surveyor} onViewSuratTugas={(member, role) => setViewing({ member, role })} />
        <TeamRow icon="fact_check" role="Verifikator" member={team.verifikator} onViewSuratTugas={(member, role) => setViewing({ member, role })} />
        <TeamRow
          icon="rate_review"
          role="Technical Reviewer"
          member={team.technicalReviewer}
          onViewSuratTugas={(member, role) => setViewing({ member, role })}
        />
      </div>

      {team.teamMembers.length > 0 && (
        <div className="mt-5 border-t border-[#f0ded0] pt-4">
          <div className="mb-2.5 text-[11px] font-bold tracking-wide text-[#8a7565]">ANGGOTA TIM LAINNYA</div>
          <div className="flex flex-col gap-2">
            {team.teamMembers.map((member, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[#f0ded0] px-3.5 py-2.5">
                <span className="text-[12.5px] font-bold text-[#20180f]">{member.name}</span>
                {member.role && <span className="text-[11.5px] text-[#8a7565]">{member.role}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {viewing?.member && (
        <SuratTugasViewModal
          roleLabel={ROLE_LABELS[viewing.role]}
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
