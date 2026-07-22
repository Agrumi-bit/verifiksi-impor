import { MaterialIcon } from "../material-icon";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

type Props = { payload: ApplicationWizardValues };

export function DocumentsTab({ payload }: Props) {
  const documents = [
    { name: "NIB", kategori: "Legalitas Perusahaan", path: payload.nibDocumentPath },
    { name: "Daftar KBLI", kategori: "Legalitas Perusahaan", path: payload.kbliDocumentPath },
    { name: "Akta Notaris", kategori: "Legalitas Perusahaan", path: payload.notarialDocumentPath },
    ...(payload.nonIndustriDocuments ?? []).map((d) => ({
      name: d.label,
      kategori: "Supporting Document",
      path: d.documentPath,
    })),
    ...(payload.konsumsiDocuments ?? []).map((d) => ({
      name: d.label,
      kategori: "Supporting Document",
      path: d.documentPath,
    })),
  ];

  const total = documents.length;
  const valid = documents.filter((d) => d.path).length;
  const missing = total - valid;

  const summary = [
    { label: "Total Dokumen", value: total, color: "#261813", bg: "#f2f0ee" },
    { label: "Valid", value: valid, color: "#027a48", bg: "#e2f7ea" },
    { label: "Missing", value: missing, color: "#ba1a1a", bg: "#fce8e6" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[14px] border border-[#e8d5c5] border-l-4 border-l-[#3b6ee0] bg-white p-7 shadow-sm">
        <h3 className="mb-1 font-sv-headline-lg text-[19px] font-bold">Document Summary</h3>
        <div className="mb-5 text-sm text-[#8a7565]">
          Ringkasan status dokumen permohonan {payload.verificationType}
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {summary.map((s) => (
            <div key={s.label} className="rounded-[10px] p-4" style={{ background: s.bg }}>
              <div className="mb-2 text-[12.5px] text-[#6b6259]">{s.label}</div>
              <div className="text-[26px] font-extrabold" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
        <h3 className="mb-1 font-sv-headline-lg text-[16.5px] font-bold">Application Documents</h3>
        <div className="mb-5 text-sm text-[#8a7565]">
          Dokumen permohonan {payload.verificationType} beserta status kelengkapan
        </div>
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[1.8fr_1.3fr_1fr] gap-3 border-b border-[#f0ded0] px-1 pb-3 text-[11.5px] uppercase tracking-wide text-[#a68f80]">
            <div>Dokumen</div>
            <div>Kategori</div>
            <div>Status</div>
          </div>
          {documents.map((doc, index) => (
            <div
              key={index}
              className="grid grid-cols-[1.8fr_1.3fr_1fr] items-center gap-3 border-b border-[#f5ebe1] px-1 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ffe9e2]">
                  <MaterialIcon name="description" className="text-[19px] text-sv-primary-container" />
                </div>
                <div className="min-w-0 text-sm font-bold">{doc.name}</div>
              </div>
              <div>
                <span className="rounded-full border border-[#e8d5c5] bg-[#fdf5f2] px-2.5 py-0.5 text-[11px] font-semibold text-[#4a4038]">
                  {doc.kategori}
                </span>
              </div>
              <div>
                {doc.path ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e2f7ea] px-2.5 py-1 text-[11.5px] font-bold text-[#027a48]">
                    <MaterialIcon name="check_circle" className="text-[13px]" />
                    Valid
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fce8e6] px-2.5 py-1 text-[11.5px] font-bold text-[#ba1a1a]">
                    <MaterialIcon name="cancel" className="text-[13px]" />
                    Missing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
