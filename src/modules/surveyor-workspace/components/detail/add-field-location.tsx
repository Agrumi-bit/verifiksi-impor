"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationItemFields } from "@/components/wizard/locations-field";
import { createEmptyLocation, LOCATION_TYPES, locationsSchema, type LocationValues } from "@/modules/shared/schema";

/**
 * "Tambah Lokasi Temuan Lapangan" — the surveyor records a facility found on site. Same
 * location form and validation as the company profile (documents required); saved via
 * POST /api/surveyor-workspace/assignments/{id}/field-locations, which adds it to the company
 * profile, this application and this assignment's On Site Verification list.
 */
export function AddFieldLocationButton({ assignmentNumber }: { assignmentNumber: string }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<{ locations: LocationValues[] }>({
    resolver: zodResolver(locationsSchema),
    mode: "onBlur",
    defaultValues: { locations: [createEmptyLocation() as LocationValues] },
  });

  function open() {
    form.reset({ locations: [createEmptyLocation() as LocationValues] });
    setNotes("");
    setIsOpen(true);
  }

  async function save() {
    if (!(await form.trigger())) {
      toast.error("Lengkapi data & dokumen lokasi temuan terlebih dahulu.");
      return;
    }
    setIsSaving(true);
    try {
      const location = { ...form.getValues("locations.0"), fieldNotes: notes.trim() || undefined };
      const response = await fetch(`/api/surveyor-workspace/assignments/${assignmentNumber}/field-locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Gagal menyimpan lokasi temuan");
      toast.success("Lokasi temuan lapangan tersimpan dan masuk ke daftar On Site Verification.");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["surveyor-workspace"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan lokasi temuan");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-sv-primary-container px-3.5 py-2 text-[13px] font-semibold text-sv-primary-container hover:bg-[#fff1ec]"
      >
        + Tambah Lokasi Temuan Lapangan
      </button>
      <Dialog open={isOpen} onOpenChange={(next) => !isSaving && setIsOpen(next)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tambah Lokasi Temuan Lapangan</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Fasilitas yang ditemukan saat survey dan belum tercantum di permohonan. Lokasi akan disimpan ke profil perusahaan
            (badge &quot;Temuan lapangan&quot;, status belum diverifikasi), ditautkan ke permohonan ini, dan langsung masuk ke
            daftar On Site Verification untuk diverifikasi.
          </p>
          <LocationItemFields form={form} index={0} onRemove={() => setIsOpen(false)} canRemove={false} availableTypes={LOCATION_TYPES} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold">Catatan temuan (opsional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Mis. gudang tambahan di belakang kantor, digunakan untuk penyimpanan bahan baku..."
              className="rounded-lg border border-border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="button" disabled={isSaving} onClick={save}>
              {isSaving ? "Menyimpan..." : "Simpan Lokasi Temuan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
