"use client";

import { toast } from "sonner";

import { SectionShell } from "./section-shell";
import { SurveyorNotes } from "./question-list";
import { OWNERSHIP_QUESTION, SEWA_QUESTIONS, type AnswerValues } from "./schema";

type PayloadLocation = {
  ownershipDocumentPath?: string | null;
  leaseDocumentPath?: string | null;
  leaseOriginalOwnerName?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
};

type Props = {
  buildingStatus: "MILIK_SENDIRI" | "SEWA" | null;
  payloadLocation: PayloadLocation | null;
  ownershipAnswer: AnswerValues;
  sewaAnswers: Record<string, AnswerValues>;
  notes: string;
  onOwnershipAnswer: (value: AnswerValues) => void;
  onSewaAnswer: (key: string, value: AnswerValues) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

function AnswerButtons({ answer, onChange }: { answer: AnswerValues; onChange: (v: AnswerValues) => void }) {
  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        onClick={() => onChange({ ...answer, value: "sesuai" })}
        className="rounded-lg px-4 py-2 text-[13px] font-bold"
        style={
          answer.value === "sesuai"
            ? { background: "#16a34a", color: "#fff" }
            : { background: "#fff", color: "#4a4038", border: "1px solid #d7dbe0" }
        }
      >
        Sesuai
      </button>
      <button
        type="button"
        onClick={() => onChange({ ...answer, value: "tidak" })}
        className="rounded-lg px-4 py-2 text-[13px] font-bold"
        style={
          answer.value === "tidak"
            ? { background: "#dc2626", color: "#fff" }
            : { background: "#fff", color: "#4a4038", border: "1px solid #d7dbe0" }
        }
      >
        Tidak Sesuai
      </button>
    </div>
  );
}

export function Section3Ownership({
  buildingStatus,
  payloadLocation,
  ownershipAnswer,
  sewaAnswers,
  notes,
  onOwnershipAnswer,
  onSewaAnswer,
  onNotesChange,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  return (
    <SectionShell index={3} title="Status Kepemilikan Kantor" onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      <p className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568]">
        Verifikasi dilakukan untuk memastikan bahwa status kepemilikan atau penggunaan bangunan kantor sesuai dengan
        dokumen yang disampaikan oleh perusahaan serta kondisi yang ditemukan di lapangan.
      </p>
      <p className="mb-4 text-[13.5px] leading-relaxed text-[#4a5568]">
        Status kepemilikan kantor ditentukan berdasarkan data yang disampaikan dalam permohonan.
      </p>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-[14px] font-bold text-[#1c2530]">Status Bangunan</span>
        <span className="text-[12.5px] text-[#8a96a8]">(sesuai dengan data aplikasi)</span>
      </div>
      <div className="mb-5 flex overflow-hidden rounded-[9px] border border-[#dbe4f0]">
        <div
          className="flex-1 py-3 text-center text-[13.5px] font-bold"
          style={
            buildingStatus === "MILIK_SENDIRI" ? { background: "#3b82f6", color: "#fff" } : { color: "#8a96a8" }
          }
        >
          Milik Sendiri
        </div>
        <div
          className="flex-1 py-3 text-center text-[13.5px] font-bold"
          style={buildingStatus === "SEWA" ? { background: "#e0662e", color: "#fff" } : { color: "#8a96a8" }}
        >
          Sewa
        </div>
      </div>

      {buildingStatus === "MILIK_SENDIRI" && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
          <div>
            <div className="mb-1 text-sm font-bold text-[#1c2530]">Dokumen Kepemilikan</div>
            <div className="text-[13px] text-[#4a5568]">
              {payloadLocation?.ownershipDocumentPath ? "Dokumen Kepemilikan" : "Belum diunggah"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.info("Pratinjau dokumen akan tersedia di iterasi berikutnya.")}
            className="whitespace-nowrap rounded-lg border border-[#d7dbe0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#1c2530]"
          >
            View Document
          </button>
        </div>
      )}
      {buildingStatus === "MILIK_SENDIRI" && (
        <div className="mb-5 rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
          <div className="mb-1 text-[14.5px] font-bold text-[#1c2530]">{OWNERSHIP_QUESTION.title}</div>
          <div className="mb-3 text-[13px] text-[#4a5568]">{OWNERSHIP_QUESTION.question}</div>
          <AnswerButtons answer={ownershipAnswer} onChange={onOwnershipAnswer} />
        </div>
      )}

      {buildingStatus === "SEWA" && (
        <>
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
            <div>
              <div className="mb-1 text-sm font-bold text-[#1c2530]">Dokumen Sewa</div>
              <div className="text-[13px] text-[#4a5568]">
                {payloadLocation?.leaseDocumentPath ? "Dokumen Sewa Menyewa" : "Belum diunggah"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => toast.info("Pratinjau dokumen akan tersedia di iterasi berikutnya.")}
              className="whitespace-nowrap rounded-lg border border-[#d7dbe0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#1c2530]"
            >
              View Document
            </button>
          </div>

          <div className="mb-5 flex flex-col gap-4">
            <div className="rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
              <div className="mb-1 text-[14.5px] font-bold text-[#1c2530]">{SEWA_QUESTIONS[0].title}</div>
              <div className="mb-3 text-[13px] text-[#4a5568]">{SEWA_QUESTIONS[0].question}</div>
              <AnswerButtons
                answer={sewaAnswers[SEWA_QUESTIONS[0].key] ?? { value: null }}
                onChange={(v) => onSewaAnswer(SEWA_QUESTIONS[0].key, v)}
              />
            </div>

            <div className="rounded-xl border border-[#bcd4f5] bg-[#eaf2ff] p-[18px]">
              <div className="mb-3 text-[13.5px] font-bold text-[#1c2530]">Data Perjanjian Sewa</div>
              <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Nama Pemilik Bangunan</div>
              <div className="mb-3 text-sm font-bold text-[#1c2530]">
                {payloadLocation?.leaseOriginalOwnerName || "—"}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Tanggal Mulai Sewa</div>
                  <div className="text-sm font-bold text-[#1c2530]">{payloadLocation?.leaseStartDate || "—"}</div>
                </div>
                <div>
                  <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Tanggal Berakhir Sewa</div>
                  <div className="text-sm font-bold text-[#1c2530]">{payloadLocation?.leaseEndDate || "—"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
              <div className="mb-1 text-[14.5px] font-bold text-[#1c2530]">{SEWA_QUESTIONS[1].title}</div>
              <div className="mb-3 text-[13px] text-[#4a5568]">{SEWA_QUESTIONS[1].question}</div>
              <AnswerButtons
                answer={sewaAnswers[SEWA_QUESTIONS[1].key] ?? { value: null }}
                onChange={(v) => onSewaAnswer(SEWA_QUESTIONS[1].key, v)}
              />
              {sewaAnswers[SEWA_QUESTIONS[1].key]?.value === "tidak" && (
                <div className="mt-3.5 rounded-[10px] border border-[#f3b8b8] bg-[#fdecec] p-4">
                  <div className="mb-2.5 text-[13px] font-bold text-[#b91c1c]">Alasan Ketidaksesuaian</div>
                  <textarea
                    value={sewaAnswers[SEWA_QUESTIONS[1].key]?.reason ?? ""}
                    onChange={(e) =>
                      onSewaAnswer(SEWA_QUESTIONS[1].key, { ...sewaAnswers[SEWA_QUESTIONS[1].key], reason: e.target.value })
                    }
                    placeholder="Tuliskan alasan ketidaksesuaian..."
                    className="min-h-[50px] w-full resize-y rounded-lg border border-[#f3b8b8] bg-white p-2.5 text-[13px]"
                  />
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
              <div className="mb-1 text-[14.5px] font-bold text-[#1c2530]">{SEWA_QUESTIONS[2].title}</div>
              <div className="mb-3 text-[13px] text-[#4a5568]">{SEWA_QUESTIONS[2].question}</div>
              <AnswerButtons
                answer={sewaAnswers[SEWA_QUESTIONS[2].key] ?? { value: null }}
                onChange={(v) => onSewaAnswer(SEWA_QUESTIONS[2].key, v)}
              />
            </div>
          </div>
        </>
      )}

      <SurveyorNotes
        value={notes}
        onChange={onNotesChange}
        placeholder="Contoh: Kantor perusahaan menggunakan bangunan yang disewa dengan masa sewa selama 3 tahun dan masih berlaku hingga saat verifikasi dilakukan."
      />
    </SectionShell>
  );
}
