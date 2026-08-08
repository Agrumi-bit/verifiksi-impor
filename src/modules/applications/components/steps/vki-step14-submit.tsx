"use client";

import { useState } from "react";
import { Send, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  onConfirmSubmit: () => void;
  isSubmitting: boolean;
};

export function VkiStep14Submit({ onConfirmSubmit, isSubmitting }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <Send className="size-8 text-primary" />
      </div>
      <h2 className="mt-2 text-base font-bold">Siap untuk Dikirim</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Pastikan seluruh data pada tahap sebelumnya telah benar. Setelah dikirim, permohonan akan masuk ke
        antrean review dan tidak dapat diedit kembali tanpa persetujuan verifikator.
      </p>
      <Button type="button" className="mt-4" onClick={() => setShowConfirm(true)}>
        Submit Permohonan
      </Button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-[420px] max-w-[92vw] rounded-2xl bg-background p-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3.5 flex size-13 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="size-6.5 text-primary" />
            </div>
            <div className="text-[15px] font-bold">Kirim Permohonan Ini?</div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Setelah dikirim, data tidak dapat diubah kecuali diminta oleh verifikator. Pastikan Anda sudah
              memeriksa halaman Preview.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                Periksa Lagi
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={isSubmitting}
                onClick={() => {
                  // Close immediately regardless of outcome — otherwise a failed
                  // (invalid) submit leaves this modal stuck open on top of the
                  // step-jump + error toast fired by the parent, hiding both.
                  setShowConfirm(false);
                  onConfirmSubmit();
                }}
              >
                {isSubmitting ? "Mengirim..." : "Ya, Kirim"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
