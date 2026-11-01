"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NotificationItem = { id: string; kind: string; title: string; body: string | null; href: string | null; readAt: string | null; createdAt: string };
type NotificationData = { items: NotificationItem[]; unread: number };

const QUERY_KEY = ["notifications"];
/** The bell checks for new notifications this often (and whenever the window regains focus). */
const POLL_MS = 60_000;

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

async function markRead(body: { ids: string[] } | { all: true }) {
  const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Gagal menandai notifikasi");
}

/**
 * The bell in a workspace's top bar: unread count, the latest notifications, and a click opens the
 * assignment or application it is about (marking it read). `className` styles the trigger for the
 * workspace's palette.
 */
export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<NotificationData> => {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Gagal memuat notifikasi");
      return ((await response.json()) as { data: NotificationData }).data;
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });
  const read = useMutation({ mutationFn: markRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }) });

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  function open(item: NotificationItem) {
    if (!item.readAt) read.mutate({ ids: [item.id] });
    if (item.href) router.push(item.href);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("relative rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]", className)}
        aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold leading-none text-white tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-[380px] max-w-[calc(100vw-24px)] rounded-xl border border-[#E5EAF0] bg-white p-0 shadow-lg ring-0">
        <div className="flex items-center justify-between border-b border-[#EEF2F6] px-4 py-3">
          <div className="text-[13.5px] font-semibold text-[#0F172A]">Notifikasi</div>
          <button
            type="button"
            disabled={unread === 0 || read.isPending}
            onClick={() => read.mutate({ all: true })}
            className="flex items-center gap-1 text-[12px] font-medium text-[#1677FF] hover:underline disabled:text-[#94A3B8] disabled:no-underline"
          >
            <CheckCheck className="size-3.5" aria-hidden />
            Tandai semua dibaca
          </button>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12.5px] text-[#64748B]">Belum ada notifikasi.</p>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={cn("flex w-full gap-3 border-b border-[#F1F5F9] px-4 py-3 text-left hover:bg-[#F8FAFC]", !item.readAt && "bg-[#F0F7FF]")}
                >
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-[#1677FF]")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[12.5px] leading-snug text-[#0F172A]", !item.readAt && "font-semibold")}>{item.title}</span>
                    {item.body && <span className="mt-0.5 block text-[12px] leading-snug text-[#475569]">{item.body}</span>}
                    <span className="mt-1 block text-[11px] text-[#94A3B8]">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
