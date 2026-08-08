"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Info, Search, Send } from "lucide-react";

type ApplicationRow = {
  id: string;
  company: string;
  picName: string;
  picPhone: string;
  picEmail: string;
  crFollowUpDate: string | null;
};

type Message = { id: string; direction: "IN" | "OUT" | "SYSTEM"; text: string; createdAt: string };

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CrmView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [draft, setDraft] = useState("");

  const { data: applications } = useQuery({
    queryKey: ["customer-relation-workspace", "applications"],
    queryFn: async () => {
      const response = await fetch("/api/customer-relation-workspace/applications");
      if (!response.ok) throw new Error("Gagal memuat data");
      const json = (await response.json()) as { data: ApplicationRow[] };
      return json.data;
    },
  });

  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (applications ?? []).filter(
      (a) => !q || a.company.toLowerCase().includes(q) || a.picName.toLowerCase().includes(q),
    );
  }, [applications, search]);

  const activeId = selectedId ?? contacts[0]?.id ?? null;
  const activeApp = (applications ?? []).find((a) => a.id === activeId) ?? null;

  const { data: messages } = useQuery({
    queryKey: ["customer-relation-workspace", "messages", activeId],
    queryFn: async () => {
      const response = await fetch(`/api/customer-relation-workspace/applications/${activeId}/messages`);
      if (!response.ok) throw new Error("Gagal memuat pesan");
      const json = (await response.json()) as { data: Message[] };
      return json.data;
    },
    enabled: Boolean(activeId),
  });

  function invalidateMessages() {
    queryClient.invalidateQueries({ queryKey: ["customer-relation-workspace", "messages", activeId] });
  }
  function invalidateApplications() {
    queryClient.invalidateQueries({ queryKey: ["customer-relation-workspace", "applications"] });
  }

  async function sendMessage(text: string) {
    if (!activeId || !text.trim()) return;
    const response = await fetch(`/api/customer-relation-workspace/applications/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    if (!response.ok) {
      toast.error("Gagal mengirim pesan");
      return;
    }
    invalidateMessages();
  }

  async function handleSend() {
    const text = draft;
    setDraft("");
    await sendMessage(text);
  }

  async function fireQuickAction(action: "request-document" | "log-call") {
    if (!activeId) return;
    const response = await fetch(`/api/customer-relation-workspace/applications/${activeId}/quick-actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) {
      toast.error("Gagal mencatat aksi");
      return;
    }
    invalidateMessages();
  }

  async function setFollowUp(date: string | null) {
    if (!activeId) return;
    const response = await fetch(`/api/customer-relation-workspace/applications/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crFollowUpDate: date }),
    });
    if (!response.ok) {
      toast.error("Gagal menyimpan follow-up");
      return;
    }
    invalidateApplications();
  }

  const overdue = activeApp?.crFollowUpDate && activeApp.crFollowUpDate.slice(0, 10) < todayStr();

  return (
    <div className="-m-7 flex border-t border-[#f0ded0] bg-white" style={{ height: "calc(100vh - 60px)" }}>
      <div className="flex w-65 shrink-0 flex-col border-r border-[#f0ded0] bg-[#fffaf6]">
        <div className="p-4 pb-2.5">
          <div className="mb-2.5 text-[16px] font-extrabold text-[#20180f]">Chats — CRM</div>
          <div className="flex items-center gap-2 rounded-lg bg-[#f0ede8] px-3 py-2">
            <Search className="size-4 text-[#8a7565]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari perusahaan atau PIC..."
              className="flex-1 border-none bg-transparent text-[12.5px] text-[#20180f] outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((c) => {
            const isActive = c.id === activeId;
            const overdueContact = c.crFollowUpDate && c.crFollowUpDate.slice(0, 10) < todayStr();
            return (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="flex cursor-pointer items-center gap-3 border-b border-[#f5ebe1] px-4 py-3"
                style={{ background: isActive ? "#f0ded0" : "transparent" }}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-[14px] font-extrabold text-white">
                  {initialsOf(c.company)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="truncate text-[13.5px] font-bold text-[#20180f]">{c.company}</span>
                  </div>
                  <div className="truncate text-[12px] text-[#6b5b4c]">{c.picName || "—"}</div>
                </div>
                {c.crFollowUpDate && (
                  <span
                    className="material-symbols-outlined shrink-0 text-[16px]"
                    style={{ color: overdueContact ? "#c1361f" : "#a3690a" }}
                    title={`Follow-up: ${c.crFollowUpDate.slice(0, 10)}`}
                  >
                    event
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex min-w-95 flex-1 flex-col bg-[#efe6da]"
        style={{ backgroundImage: "radial-gradient(#e2d5c4 1px, transparent 1px)", backgroundSize: "18px 18px" }}
      >
        {activeApp ? (
          <>
            <div className="flex shrink-0 items-center justify-between border-b border-[#f0ded0] bg-[#fffaf6] px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9.5 items-center justify-center rounded-full bg-[#25d366] text-[13px] font-extrabold text-white">
                  {initialsOf(activeApp.company)}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#20180f]">{activeApp.company}</div>
                  <div className="text-[11.5px] text-[#8a7565]">
                    {activeApp.picName} · {activeApp.picPhone}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setShowInfoPanel((v) => !v)} aria-label="Info" className="text-[#8a7565]">
                <Info className="size-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-4.5">
              {(messages ?? []).map((m) =>
                m.direction === "SYSTEM" ? (
                  <div key={m.id} className="my-2 self-center rounded-lg bg-[#fdf0d5] px-3.5 py-1.5 text-[11.5px] font-semibold text-[#8a6a2f]">
                    {m.text}
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className="my-0.75 max-w-[62%] rounded-[10px] px-3 pb-1.5 pt-2 shadow-[0_1px_1px_rgba(0,0,0,.06)]"
                    style={{ alignSelf: m.direction === "OUT" ? "flex-end" : "flex-start", background: m.direction === "OUT" ? "#dcf8c6" : "#fff" }}
                  >
                    <div className="whitespace-pre-wrap text-[13px] text-[#20180f]">{m.text}</div>
                    <div className="mt-0.5 text-right text-[10px] text-[#8a7565]">
                      {new Date(m.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ),
              )}
              {(messages ?? []).length === 0 && (
                <div className="mt-6 self-center text-[12.5px] text-[#a68f80]">Belum ada percakapan.</div>
              )}
            </div>

            <div className="shrink-0 border-t border-[#f0ded0] bg-[#fffaf6] px-4 py-2.5">
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fireQuickAction("request-document")}
                  className="rounded-full border border-[#e1bfb3] bg-white px-3 py-1.25 text-[11.5px] font-semibold text-[#c14a1f]"
                >
                  Minta Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => fireQuickAction("log-call")}
                  className="rounded-full border border-[#e1bfb3] bg-white px-3 py-1.25 text-[11.5px] font-semibold text-[#c14a1f]"
                >
                  Catat Telepon
                </button>
                <button
                  type="button"
                  onClick={() => setFollowUp(todayStr())}
                  className="rounded-full border border-[#e1bfb3] bg-white px-3 py-1.25 text-[11.5px] font-semibold text-[#c14a1f]"
                >
                  Set Follow-up Hari Ini
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ketik pesan WhatsApp..."
                  className="flex-1 rounded-[22px] border border-[#e8dccd] px-4 py-2.75 text-[13px] text-[#20180f] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  aria-label="Kirim"
                  className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-[#e0662e]"
                >
                  <Send className="size-4.5 text-white" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-[#a68f80]">Belum ada kontak.</div>
        )}
      </div>

      {showInfoPanel && activeApp && (
        <div className="w-57.5 shrink-0 overflow-y-auto border-l border-[#f0ded0] bg-[#fffaf6] px-4 py-5">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2.5 flex size-16 items-center justify-center rounded-full bg-[#25d366] text-[20px] font-extrabold text-white">
              {initialsOf(activeApp.company)}
            </div>
            <div className="text-[14.5px] font-extrabold text-[#20180f]">{activeApp.company}</div>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[11px] font-semibold text-[#a68f80]">Nama PIC</div>
              <div className="mt-0.5 text-[13px] font-semibold text-[#20180f]">{activeApp.picName || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#a68f80]">Nomor WhatsApp</div>
              <div className="mt-0.5 text-[13px] font-semibold text-[#20180f]">{activeApp.picPhone || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-[#a68f80]">Email</div>
              <div className="mt-0.5 text-[13px] font-semibold text-[#20180f]">{activeApp.picEmail || "—"}</div>
            </div>
          </div>
          <div className="mt-4.5 border-t border-[#f0ded0] pt-4">
            <div className="mb-2 text-[12px] font-bold text-[#20180f]">Pengingat Follow-up</div>
            <input
              type="date"
              value={activeApp.crFollowUpDate?.slice(0, 10) ?? ""}
              onChange={(e) => setFollowUp(e.target.value || null)}
              className="w-full rounded-lg border border-[#e8dccd] bg-white px-2.5 py-2 text-[12.5px] text-[#20180f] outline-none"
            />
            {activeApp.crFollowUpDate && (
              <div
                className="mt-2 inline-block rounded-md px-2.5 py-1.25 text-[11px] font-bold"
                style={{ background: overdue ? "#fbe4de" : "#fdf0d5", color: overdue ? "#c1361f" : "#a3690a" }}
              >
                {overdue ? "Jatuh Tempo: " : "Follow-up: "}
                {activeApp.crFollowUpDate.slice(0, 10)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
