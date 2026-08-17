"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MaterialIcon } from "../material-icon";

type MessageDirection = "IN" | "OUT" | "SYSTEM";

type MessageData = {
  id: string;
  direction: MessageDirection;
  text: string;
  createdAt: string;
};

const DIRECTION_STYLE: Record<MessageDirection, { bg: string; color: string; icon: string; label: string }> = {
  SYSTEM: { bg: "#f2ece5", color: "#8a7565", icon: "smart_toy", label: "Sistem" },
  IN: { bg: "#e6f0fd", color: "#2f6fd6", icon: "call_received", label: "Dari Perusahaan" },
  OUT: { bg: "#fdeadd", color: "#e0662e", icon: "call_made", label: "Anda" },
};

function fmtDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Props = { assignmentId: string; basePath?: string };

export function CommunicationTab({ assignmentId, basePath = "/api/verifikator-workspace" }: Props) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const queryKey = [basePath, "assignments", assignmentId, "messages"];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`${basePath}/assignments/${assignmentId}/messages`);
      if (!response.ok) throw new Error("Gagal memuat pesan");
      const json = (await response.json()) as { data: MessageData[] };
      return json.data;
    },
  });

  const messages = data ?? [];

  async function send() {
    if (!text.trim()) return;
    setIsSending(true);
    const response = await fetch(`${basePath}/assignments/${assignmentId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setIsSending(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Gagal mengirim pesan");
      return;
    }
    setText("");
    queryClient.invalidateQueries({ queryKey });
  }

  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
      <div className="mb-4 flex items-center gap-2">
        <MaterialIcon name="forum" className="text-[19px] text-[#e0662e]" />
        <h3 className="text-[14.5px] font-extrabold text-[#20180f]">Communication</h3>
      </div>

      <div className="mb-4 flex max-h-[420px] flex-col gap-4 overflow-y-auto">
        {isLoading && <p className="text-[13px] text-[#8a7565]">Memuat...</p>}
        {!isLoading && messages.length === 0 && <p className="text-[13px] text-[#8a7565]">Belum ada pesan.</p>}
        {messages.map((message) => {
          const style = DIRECTION_STYLE[message.direction];
          return (
            <div key={message.id} className="flex gap-3">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: style.bg, color: style.color }}
              >
                <MaterialIcon name={style.icon} className="text-[16px]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold text-[#20180f]">{style.label}</span>
                  <span className="text-[11px] text-[#8a7565]">{fmtDateTime(message.createdAt)}</span>
                </div>
                <div className="mt-1 text-[12.5px] text-[#4a4038]">{message.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Tuliskan catatan / pesan..."
        className="w-full rounded-[10px] border border-[#e8d5c5] p-3.5 text-[13.5px] text-[#20180f] outline-none"
        rows={4}
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={send}
          disabled={isSending || !text.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[#e0662e] px-4 py-2.25 text-[12.5px] font-bold text-white disabled:opacity-50"
        >
          <MaterialIcon name="send" className="text-[15px]" />
          {isSending ? "Mengirim..." : "Kirim"}
        </button>
      </div>
    </div>
  );
}
