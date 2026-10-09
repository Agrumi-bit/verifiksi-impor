"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type DeletionSummary = {
  applicationNumber: string;
  assignments: number;
  locationVisits: number;
  surveyReports: number;
  messages: number;
  documentVersions: number;
  auditLogs: number;
  unlinkedBrandRows: number;
};

type Props = {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  onDeleted: () => void;
};

const ROW_LABELS: { key: keyof DeletionSummary; label: string }[] = [
  { key: "assignments", label: "Penugasan" },
  { key: "locationVisits", label: "Kunjungan lokasi" },
  { key: "surveyReports", label: "Laporan survey" },
  { key: "messages", label: "Pesan" },
  { key: "documentVersions", label: "Versi dokumen" },
  { key: "auditLogs", label: "Riwayat audit" },
];

/**
 * "Hapus Permohonan" — permanent delete for dummy/duplicate rows (Admin only; the API enforces
 * the role and re-checks the typed application number). The dialog loads what would be removed so
 * the count of real work at stake is visible before confirming.
 */
export function DeleteApplicationDialog({ applicationId, applicationNumber, companyName, onDeleted }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["applications", applicationId, "deletion-preview"],
    enabled: isOpen,
    queryFn: async () => {
      const response = await fetch(`/api/applications/${applicationId}/delete`);
      if (!response.ok) throw new Error("Gagal memuat rincian penghapusan");
      return ((await response.json()) as { data: DeletionSummary }).data;
    },
  });

  const matches = typed.trim() === applicationNumber;

  async function submit() {
    if (!matches) {
      toast.error("Nomor permohonan belum cocok.");
      return;
    }
    setIsDeleting(true);
    const response = await fetch(`/api/applications/${applicationId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmApplicationNumber: typed.trim() }),
    });
    setIsDeleting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Gagal menghapus permohonan.");
      return;
    }
    toast.success(`Permohonan ${applicationNumber} dihapus.`);
    setIsOpen(false);
    setTyped("");
    onDeleted();
  }

  const affected = summary ? ROW_LABELS.filter((row) => (summary[row.key] as number) > 0) : [];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTyped("");
          setIsOpen(true);
        }}
        className="flex items-center gap-1 text-[11.5px] font-semibold text-[#ba1a1a] hover:underline"
      >
        <Trash2 className="size-3.25" />
        Hapus
      </button>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setIsOpen(false);
            setTyped("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Hapus Permohonan</DialogTitle>
          </DialogHeader>

          <p className="text-[13px] text-[#4a4038]">
            Permohonan <span className="font-mono font-bold">{applicationNumber}</span> ({companyName}) akan dihapus
            permanen. Tindakan ini tidak dapat dibatalkan.
          </p>

          <div className="rounded-lg border border-[#f0ded0] bg-[#faf7f4] p-3 text-[12px] text-[#4a4038]">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">
              Data yang ikut terhapus
            </div>
            {isLoading && <p className="text-[#8a7565]">Memuat rincian...</p>}
            {!isLoading && summary && affected.length === 0 && (
              <p className="text-[#8a7565]">Tidak ada data turunan — hanya baris permohonan ini.</p>
            )}
            {!isLoading && affected.length > 0 && (
              <ul className="list-disc pl-5">
                {affected.map((row) => (
                  <li key={row.key}>
                    {row.label}: <span className="font-bold">{summary![row.key] as number}</span>
                  </li>
                ))}
              </ul>
            )}
            {!isLoading && summary && summary.unlinkedBrandRows > 0 && (
              <p className="mt-2 text-[11.5px] text-[#8a7565]">
                Data merek dan Uji Mutu ({summary.unlinkedBrandRows} baris) tidak dihapus — hanya tautannya ke
                permohonan ini yang dilepas, karena dipakai permohonan lain.
              </p>
            )}
            <p className="mt-2 text-[11.5px] text-[#8a7565]">
              File dokumen yang sudah diunggah tetap tersimpan di penyimpanan.
            </p>
          </div>

          <label className="text-[12.5px] font-bold text-[#20180f]">
            Ketik nomor permohonan untuk konfirmasi
            <input
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={applicationNumber}
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-input px-3 py-2 font-mono text-[12.5px] font-normal outline-none"
            />
          </label>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setTyped("");
              }}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              onClick={submit}
              disabled={!matches || isDeleting}
              className="bg-[#ba1a1a] text-white hover:bg-[#9c1616]"
            >
              {isDeleting ? "Menghapus..." : "Hapus Permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
