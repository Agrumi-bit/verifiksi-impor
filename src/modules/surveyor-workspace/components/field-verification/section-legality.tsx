"use client";

import { toast } from "sonner";

import { SectionShell } from "../office-verification/section-shell";
import { QuestionList, SurveyorNotes } from "../office-verification/question-list";
import { LEGALITY_QUESTIONS, LOCATION_LABEL, type FieldKind, type AnswerValues } from "./schema";

type WarehouseLegalityData = {
  registrationType?: string | null;
  registrationNumber?: string | null;
  issueDate?: string | null;
  issuingAuthority?: string | null;
  documentPath?: string | null;
};

type KbliEntry = { code: string; description: string };

type Props = {
  kind: FieldKind;
  warehouseData?: WarehouseLegalityData | null;
  kbliEntries?: KbliEntry[];
  kbliDocumentPath?: string | null;
  answers: Record<string, AnswerValues>;
  notes: string;
  onAnswer: (key: string, value: AnswerValues) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onSaveNext: () => void;
  isSaving?: boolean;
};

export function SectionLegality({
  kind,
  warehouseData,
  kbliEntries,
  kbliDocumentPath,
  answers,
  notes,
  onAnswer,
  onNotesChange,
  onSave,
  onSaveNext,
  isSaving,
}: Props) {
  const label = LOCATION_LABEL[kind];
  const isWarehouse = kind === "GUDANG";

  return (
    <SectionShell index={3} title={`Legalitas ${label}`} onSave={onSave} onSaveNext={onSaveNext} isSaving={isSaving}>
      {isWarehouse ? (
        <>
          <p className="mb-3 text-[13.5px] leading-relaxed text-[#4a5568]">
            Verifikasi dilakukan untuk memastikan bahwa nomor Tanda Daftar Gudang (TDG) yang tercantum dalam dokumen
            permohonan sesuai dengan dokumen TDG yang tersedia di lokasi gudang.
          </p>
          <p className="mb-4 text-[13.5px] leading-relaxed text-[#4a5568]">
            Surveyor melakukan pencocokan antara nomor TDG pada sistem dengan nomor TDG pada dokumen yang ditunjukkan
            di lokasi.
          </p>

          <div className="mb-3 text-sm font-extrabold text-[#1c2530]">Data Dokumen TDG</div>
          <div className="mb-5 rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
            <div className="mb-3.5 flex items-start justify-between gap-3 border-b border-[#eef1f5] pb-3.5">
              <div>
                <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Jenis Dokumen Gudang</div>
                <div className="text-[15px] font-bold text-[#1c2530]">
                  {warehouseData?.registrationType?.replaceAll("_", " ") || "Tanda Daftar Gudang"}
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
            <div className="mb-3.5 grid grid-cols-2 gap-4">
              <div>
                <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Nomor TDG</div>
                <div className="text-[14.5px] font-bold text-[#1c2530]">{warehouseData?.registrationNumber || "—"}</div>
              </div>
              <div>
                <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Tanggal Penerbitan</div>
                <div className="text-[14.5px] font-bold text-[#1c2530]">{warehouseData?.issueDate || "—"}</div>
              </div>
            </div>
            <div>
              <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Lembaga Penerbit</div>
              <div className="text-[14.5px] font-bold text-[#1c2530]">{warehouseData?.issuingAuthority || "—"}</div>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="mb-4 text-[13.5px] leading-relaxed text-[#4a5568]">
            Verifikasi dilakukan untuk memastikan bahwa nomor KBLI yang diajukan dalam dokumen permohonan telah
            sesuai dengan aktivitas usaha dan kegiatan industri yang dilaksanakan di lokasi perusahaan.
          </p>

          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold text-[#1c2530]">
              Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) pada Sistem
            </div>
            <button
              type="button"
              onClick={() => toast.info("Pratinjau dokumen akan tersedia di iterasi berikutnya.")}
              className="whitespace-nowrap rounded-lg border border-[#d7dbe0] bg-white px-3.5 py-2 text-[12.5px] font-bold text-[#1c2530]"
            >
              {kbliDocumentPath ? "View Document" : "Belum diunggah"}
            </button>
          </div>
          <div className="mb-5 flex flex-col gap-2.5">
            {(kbliEntries ?? []).length === 0 && (
              <p className="text-[13px] text-[#8a96a8]">Tidak ada entri KBLI pada dokumen permohonan.</p>
            )}
            {(kbliEntries ?? []).map((entry) => (
              <div key={entry.code} className="rounded-xl border border-[#dbe4f0] bg-white p-[18px]">
                <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Nomor KBLI</div>
                <div className="mb-2 text-[14.5px] font-bold text-[#1c2530]">{entry.code}</div>
                <div className="mb-0.5 text-[12.5px] text-[#3b82f6]">Uraian KBLI</div>
                <div className="text-[13.5px] text-[#1c2530]">{entry.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mb-3.5 text-sm font-extrabold text-[#1c2530]">Pertanyaan Verifikasi</div>
      <QuestionList questions={LEGALITY_QUESTIONS[kind]} answers={answers} onAnswer={onAnswer} />
      <SurveyorNotes
        value={notes}
        onChange={onNotesChange}
        placeholder={
          isWarehouse
            ? "Contoh: Nomor TDG pada dokumen sesuai dengan nomor yang tercantum dalam permohonan dan alamat gudang sesuai dengan lokasi yang diverifikasi."
            : "Contoh: Kode KBLI pada dokumen sesuai dengan aktivitas industri yang dilaksanakan di lokasi pabrik."
        }
      />
    </SectionShell>
  );
}
