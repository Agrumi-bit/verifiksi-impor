"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminLoginSlides, loginSlideImageHref, type AdminLoginSlide } from "../use-login-slides";
import { LOGIN_SLIDE_STATUS_BADGE, LOGIN_SLIDE_STATUS_LABELS, isLoginSlideCurrentlyVisible } from "../login-slides";
import { LoginSlideFormDrawer } from "./login-slide-form-drawer";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function LoginSlidesPage() {
  const { data: slides, isLoading, isError } = useAdminLoginSlides();
  const queryClient = useQueryClient();
  const queryKey = ["system-configuration", "login-slides"];
  const [editing, setEditing] = useState<AdminLoginSlide | null | "new">(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    queryClient.invalidateQueries({ queryKey });
  }

  async function handleMove(id: string, direction: -1 | 1) {
    if (!slides) return;
    const index = slides.findIndex((s) => s.id === id);
    const swapWith = index + direction;
    if (index === -1 || swapWith < 0 || swapWith >= slides.length) return;
    const ids = slides.map((s) => s.id);
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    setBusyId(id);
    const response = await fetch("/api/system-configuration/login-slides/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setBusyId(null);
    if (!response.ok) {
      toast.error("Gagal mengubah urutan");
      return;
    }
    reload();
  }

  async function handleToggleStatus(slide: AdminLoginSlide) {
    setBusyId(slide.id);
    const nextStatus = slide.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const response = await fetch(`/api/system-configuration/login-slides/${slide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusyId(null);
    if (!response.ok) {
      toast.error("Gagal mengubah status");
      return;
    }
    toast.success(nextStatus === "ACTIVE" ? "Slide diaktifkan." : "Slide dinonaktifkan.");
    reload();
  }

  async function handleDuplicate(slide: AdminLoginSlide) {
    setBusyId(slide.id);
    const response = await fetch(`/api/system-configuration/login-slides/${slide.id}/duplicate`, { method: "POST" });
    setBusyId(null);
    if (!response.ok) {
      toast.error("Gagal menduplikasi slide");
      return;
    }
    toast.success("Slide diduplikasi sebagai draft.");
    reload();
  }

  async function handleDelete(slide: AdminLoginSlide) {
    if (!window.confirm(`Hapus slide "${slide.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusyId(slide.id);
    const response = await fetch(`/api/system-configuration/login-slides/${slide.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!response.ok) {
      toast.error("Gagal menghapus slide");
      return;
    }
    toast.success("Slide dihapus.");
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div>
          <div className="text-[13.5px] font-extrabold text-[#2b2420]">Login Page Content</div>
          <p className="mt-1 text-[12.5px] text-[#8a7565]">Kelola konten promosi yang tampil di panel kanan halaman login.</p>
        </div>
        <div className="flex gap-2.5">
          <a
            href="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#e1bfb3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#261813]"
          >
            <ExternalLink className="size-3.5" />
            Preview Login Page
          </a>
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 rounded-lg bg-[#e0662e] px-3.5 py-2 text-[12.5px] font-bold text-white"
          >
            <Plus className="size-3.5" />
            Add Slide
          </button>
        </div>
      </div>

      {isLoading && <p className="text-[13px] text-[#8a7565]">Memuat slide...</p>}
      {isError && <p className="text-[13px] text-[#c1361f]">Gagal memuat daftar slide.</p>}

      {slides && slides.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-[#e0d5c8] bg-white p-10 text-center">
          <p className="text-[13px] font-semibold text-[#20180f]">Belum ada slide.</p>
          <p className="mt-1 text-[12px] text-[#a68f80]">
            Selama belum ada slide aktif, halaman login menampilkan panel netral bawaan aplikasi.
          </p>
        </div>
      )}

      {slides && slides.length > 0 && (
        <div className="overflow-x-auto rounded-[10px] border border-[#f0ded0] bg-white">
          <table className="w-full min-w-240 border-collapse text-[12px]">
            <thead>
              <tr style={{ background: "#e0662e" }}>
                {["Order", "Preview", "Title", "Category", "Status", "Start", "End", "Updated", "Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap border border-[#c14a1f] px-3 py-2 text-left text-[11px] font-bold text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slides.map((slide, index) => {
                const isBusy = busyId === slide.id;
                const isLive = isLoginSlideCurrentlyVisible(slide);
                return (
                  <tr key={slide.id} className="border-t border-[#efe2d4]">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            disabled={isBusy || index === 0}
                            onClick={() => handleMove(slide.id, -1)}
                            aria-label="Naikkan urutan"
                            className="text-[#8a7565] disabled:opacity-30"
                          >
                            <ChevronUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || index === slides.length - 1}
                            onClick={() => handleMove(slide.id, 1)}
                            aria-label="Turunkan urutan"
                            className="text-[#8a7565] disabled:opacity-30"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                        </div>
                        <span className="font-semibold text-[#20180f]">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={loginSlideImageHref(slide.imagePath)} alt={slide.title} className="h-10 w-16 rounded object-cover" />
                    </td>
                    <td className="max-w-50 px-3 py-2 font-semibold text-[#20180f]">{slide.title}</td>
                    <td className="px-3 py-2 text-[#4a4038]">{slide.label || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <span className={`w-fit rounded-full px-2.5 py-0.75 text-[10.5px] font-bold ${LOGIN_SLIDE_STATUS_BADGE[slide.status]}`}>
                          {LOGIN_SLIDE_STATUS_LABELS[slide.status]}
                        </span>
                        {isLive && <span className="w-fit rounded-full bg-[#eaf1fd] px-2 py-0.5 text-[9px] font-bold text-[#3355c8]">Live now</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#4a4038]">{fmtDate(slide.startDate)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#4a4038]">{fmtDate(slide.endDate)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#4a4038]">
                      <div>{fmtDate(slide.updatedAt)}</div>
                      {slide.updatedByName && <div className="text-[10px] text-[#a68f80]">oleh {slide.updatedByName}</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button type="button" disabled={isBusy} onClick={() => setEditing(slide)} aria-label="Edit" className="text-[#2f6fe0] disabled:opacity-50">
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" disabled={isBusy} onClick={() => handleDuplicate(slide)} aria-label="Duplicate" className="text-[#8a7565] disabled:opacity-50">
                          <Copy className="size-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleStatus(slide)}
                          className="rounded-md border border-[#e1bfb3] px-2 py-1 text-[10.5px] font-semibold text-[#261813] disabled:opacity-50"
                        >
                          {slide.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" disabled={isBusy} onClick={() => handleDelete(slide)} aria-label="Delete" className="text-[#dc2626] disabled:opacity-50">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && <LoginSlideFormDrawer slide={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
