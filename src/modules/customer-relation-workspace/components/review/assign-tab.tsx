"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { FACILITY_OPTIONS, SCHEDULE_TYPE_DEFS, SCHEDULE_TYPES, type ScheduleType } from "../../status";
import { SuratTugasModal } from "../surat-tugas-modal";

type Schedule = {
  id: string;
  scheduleType: ScheduleType;
  typeLabel: string;
  facility: string | null;
  date: string | null;
  person: string;
  status: string;
  letterNumber: string | null;
  letterStatus: "DRAFT" | "PENDING" | "APPROVED";
};

type Person = { id: string; name: string; role: string };

const LETTER_STATUS_LABEL: Record<Schedule["letterStatus"], { label: string; bg: string; color: string }> = {
  DRAFT: { label: "Draft", bg: "#f2ece5", color: "#6b5b4c" },
  PENDING: { label: "Menunggu PM", bg: "#fdf0d5", color: "#a3690a" },
  APPROVED: { label: "Disetujui PM", bg: "#e5f6ec", color: "#1f8a4c" },
};

function fmtDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Props = {
  applicationId: string;
  schedules: Schedule[];
  onChanged: () => void;
};

export function AssignTab({ applicationId, schedules, onChanged }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>("survey");
  const [facility, setFacility] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [personId, setPersonId] = useState("");
  const [showPersonMenu, setShowPersonMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [letterSchedule, setLetterSchedule] = useState<Schedule | null>(null);

  const role = SCHEDULE_TYPE_DEFS[scheduleType].role;
  const { data: people } = useQuery({
    queryKey: ["customer-relation-workspace", "people", role],
    queryFn: async () => {
      const response = await fetch(`/api/customer-relation-workspace/people?role=${role}`);
      if (!response.ok) throw new Error("Gagal memuat daftar orang");
      const json = (await response.json()) as { data: Person[] };
      return json.data;
    },
    enabled: showForm,
  });

  const selectedPerson = people?.find((p) => p.id === personId);
  const saveDisabled = (scheduleType !== "survey" || facility) && personId && date ? false : true;

  function openForm() {
    setShowForm(true);
    setScheduleType("survey");
    setFacility(null);
    setPersonId("");
    setDate(new Date().toISOString().slice(0, 10));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/customer-relation-workspace/applications/${applicationId}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleType, facility: facility ?? undefined, date, personId }),
      });
      if (!response.ok) {
        toast.error("Gagal menyimpan jadwal");
        return;
      }
      toast.success("Jadwal berhasil ditambahkan.");
      setShowForm(false);
      onChanged();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(scheduleId: string) {
    const response = await fetch(`/api/customer-relation-workspace/applications/${applicationId}/schedules/${scheduleId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Gagal menghapus jadwal");
      return;
    }
    onChanged();
  }

  return (
    <div className="rounded-xl border border-[#f0ded0] bg-white p-5.5">
      <div className="text-[15px] font-extrabold text-[#20180f]">Penugasan</div>
      <p className="mb-4 mt-0.5 text-[12.5px] text-[#8a7565]">
        Tugaskan Surveyor, Verifikator, dan Technical Reviewer untuk aplikasi ini.
      </p>

      <div className="flex flex-col gap-3">
        {schedules.map((s) => {
          const def = SCHEDULE_TYPE_DEFS[s.scheduleType];
          const letter = LETTER_STATUS_LABEL[s.letterStatus];
          return (
            <div key={s.id} className="flex items-center justify-between rounded-[10px] border border-[#efe2d4] px-4 py-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md px-2.25 py-0.75 text-[10.5px] font-bold" style={{ background: def.bg, color: def.color }}>
                    {s.typeLabel}
                  </span>
                  {s.facility && <span className="text-[12px] text-[#8a7565]">{s.facility}</span>}
                </div>
                <div className="mt-1.5 text-[13px] text-[#20180f]">
                  {fmtDate(s.date)} · {s.person}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="whitespace-nowrap rounded-md px-2 py-0.75 text-[10.5px] font-bold" style={{ background: letter.bg, color: letter.color }}>
                  {letter.label}
                </span>
                <button
                  type="button"
                  onClick={() => setLetterSchedule(s)}
                  className="whitespace-nowrap rounded-lg border border-[#e1bfb3] bg-white px-3 py-1.75 text-[12px] font-bold text-[#c14a1f]"
                >
                  Surat Tugas
                </button>
                <button type="button" onClick={() => handleRemove(s.id)} aria-label="Hapus jadwal" className="text-[#a68f80]">
                  <Trash2 className="size-4.5" />
                </button>
              </div>
            </div>
          );
        })}
        {schedules.length === 0 && (
          <div className="py-2.5 text-center text-[12.5px] text-[#a68f80]">Belum ada jadwal penugasan.</div>
        )}
      </div>

      {!showForm ? (
        <button
          type="button"
          onClick={openForm}
          className="mt-4 flex items-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-[#e0662e] bg-white px-4.5 py-2.5 text-[12.5px] font-bold text-[#c14a1f]"
        >
          <Plus className="size-4.25" />
          Add Schedule
        </button>
      ) : (
        <div className="mt-4 rounded-[10px] border border-[#efe2d4] p-4">
          <div className="mb-2 text-[12px] font-bold text-[#20180f]">Jenis Jadwal</div>
          <div className="mb-3.5 grid grid-cols-3 gap-2.5">
            {SCHEDULE_TYPES.map((type) => {
              const def = SCHEDULE_TYPE_DEFS[type];
              const selected = scheduleType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setScheduleType(type);
                    setFacility(null);
                    setPersonId("");
                  }}
                  className="rounded-[9px] border-[1.5px] p-2.5 text-center text-[12px] font-bold"
                  style={{
                    borderColor: selected ? def.color : "transparent",
                    background: selected ? def.color : def.bg,
                    color: selected ? "#fff" : def.color,
                  }}
                >
                  {def.label}
                </button>
              );
            })}
          </div>

          {scheduleType === "survey" && (
            <div className="mb-3.5">
              <div className="mb-2 text-[12px] font-bold text-[#20180f]">
                Pilih Fasilitas <span className="text-[#e0662e]">*</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {FACILITY_OPTIONS.map((f) => {
                  const selected = facility === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFacility(f)}
                      className="rounded-[9px] border-[1.5px] p-2.5 text-center text-[12px] font-bold"
                      style={{
                        borderColor: selected ? "#e0662e" : "#e8dccd",
                        background: selected ? "#fdeadd" : "#fff",
                        color: selected ? "#c14a1f" : "#261813",
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4 grid grid-cols-2 gap-3.5">
            <div>
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">
                Tanggal <span className="text-[#e0662e]">*</span>
              </div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border-none bg-[#f7f2ec] px-3 py-2.25 text-[12.5px] text-[#20180f] outline-none"
              />
            </div>
            <div className="relative">
              <div className="mb-1.5 text-[12px] font-bold text-[#20180f]">
                Pilih Orang <span className="text-[#e0662e]">*</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPersonMenu((v) => !v)}
                className="flex w-full items-center justify-between rounded-lg bg-[#f7f2ec] px-3 py-2.25 text-[12.5px]"
                style={{ color: selectedPerson ? "#20180f" : "#a68f80" }}
              >
                {selectedPerson?.name ?? "Pilih Orang..."}
              </button>
              {showPersonMenu && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-50 overflow-y-auto rounded-lg border border-[#f0ded0] bg-white shadow-lg">
                  {people?.length ? (
                    people.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPersonId(p.id);
                          setShowPersonMenu(false);
                        }}
                        className="block w-full px-3 py-2.25 text-left text-[12.5px] text-[#261813] hover:bg-[#fbeee5]"
                      >
                        {p.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2.25 text-[12px] text-[#a68f80]">Belum ada pengguna dengan role ini.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[#e1bfb3] bg-white px-4 py-2.25 text-[12.5px] font-semibold text-[#261813]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveDisabled || isSaving}
              className="rounded-lg bg-[#e0662e] px-4 py-2.25 text-[12.5px] font-bold text-white disabled:opacity-60"
            >
              {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
            </button>
          </div>
        </div>
      )}

      {letterSchedule && (
        <SuratTugasModal
          applicationId={applicationId}
          schedule={letterSchedule}
          onClose={() => setLetterSchedule(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}
