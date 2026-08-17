import { useQuery } from "@tanstack/react-query";

export type SuratTugasTemplateData = {
  headerImagePath: string | null;
  orgName: string;
  orgSubtitle: string;
  letterTitle: string;
  nomorLabel: string;
  docNumberLabel: string;
  docNumber: string;
  docRevisionLabel: string;
  docRevision: string;
  docAmendmentLabel: string;
  docAmendment: string;
  docEffectiveLabel: string;
  docEffectiveDate: string;
  openingSentence: string;
  namaLabel: string;
  peranLabel: string;
  assignmentPrefix: string;
  assignmentSuffix: string;
  perusahaanLabel: string;
  idAplikasiLabel: string;
  fasilitasLabel: string;
  tanggalLabel: string;
  closingSentence: string;
  draftNoticeText: string;
  signatureCity: string;
  signerLabel: string;
  footerImagePath: string | null;
  confidentialityNotice: string;
};

/** Admin-editable copy for the printed Surat Tugas letter — shared by Customer Relation and Project Manager Workspace. */
export function useSuratTugasTemplate() {
  return useQuery({
    queryKey: ["system-configuration", "surat-tugas-template"],
    queryFn: async () => {
      const response = await fetch("/api/system-configuration/surat-tugas-template");
      if (!response.ok) throw new Error("Gagal memuat template surat tugas");
      const json = (await response.json()) as { data: SuratTugasTemplateData };
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
