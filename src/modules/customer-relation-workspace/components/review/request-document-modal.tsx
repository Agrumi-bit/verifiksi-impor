"use client";

import { useState } from "react";

type Props = {
  label: string;
  onClose: () => void;
  onSend: (note: string) => void | Promise<void>;
};

export function RequestDocumentModal({ label, onClose, onSend }: Props) {
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSend() {
    if (!note.trim()) return;
    setIsSending(true);
    try {
      await onSend(note.trim());
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-20 flex items-center justify-center bg-[rgba(30,18,10,.4)]"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-[90%] max-w-110 rounded-[14px] bg-white p-6.5">
        <div className="text-[15px] font-extrabold text-[#20180f]">Minta Dokumen</div>
        <div className="mb-4 mt-1 text-[12.5px] text-[#8a7565]">
          {label} belum lengkap. Tuliskan catatan permintaan untuk pemohon.
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Contoh: Mohon unggah dokumen yang masih terbaca kurang jelas..."
          className="w-full resize-y rounded-lg border-none bg-[#f7f2ec] p-2.75 font-sans text-[13px] text-[#20180f] outline-none"
        />
        <div className="mt-4.5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#e1bfb3] bg-white px-4.5 py-2.5 text-[13px] font-semibold text-[#261813]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!note.trim() || isSending}
            className="rounded-lg bg-[#e0662e] px-4.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
          >
            Kirim Permintaan
          </button>
        </div>
      </div>
    </div>
  );
}
