"use client";

import type { ReactNode } from "react";

import { RichTextEditor } from "@/components/form/rich-text-editor";

export function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">{children}</div>;
}

export function Section({ letter, title, children }: { letter?: string; title: string; children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
      <div className="mb-2 text-[14px] font-extrabold text-[#20180f]">
        {letter ? `${letter}. ` : ""}
        {title}
      </div>
      {children}
    </div>
  );
}

export function ModuleIntro({ icon, iconColor, title, subtitle }: { icon: string; iconColor: string; title: string; subtitle: string }) {
  return (
    <>
      <div className="mb-1 flex items-center gap-2.5">
        <span className="material-symbols-outlined text-[19px]" style={{ color: iconColor }}>
          {icon}
        </span>
        <div className="text-[14.5px] font-extrabold text-[#20180f]">{title}</div>
      </div>
      <div className="mb-4 text-[12px] text-[#8a7565]">{subtitle}</div>
    </>
  );
}

export function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="mb-4 flex flex-col gap-3 text-[12.5px] leading-[1.75] text-[#4a4038]">
      {items.map((p, i) => (
        <p key={i} className="m-0">
          {p}
        </p>
      ))}
    </div>
  );
}

export function Formula({ children }: { children: ReactNode }) {
  return <div className="mb-4 rounded-lg bg-[#f7f2ec] px-3.5 py-3 text-center text-[12.5px] font-bold text-[#20180f]">{children}</div>;
}

export function StatBoxes({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-[9px] bg-[#f7f2ec] px-3.5 py-3">
          <div className="text-[11px] text-[#8a7565]">{s.label}</div>
          <div className="mt-0.75 text-[16px] font-extrabold text-[#20180f]">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

export function EditableStatBox({
  label,
  value,
  onChange,
  canEdit,
  unit,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  canEdit: boolean;
  unit?: string;
  placeholder?: string;
}) {
  return (
    <div className="rounded-[9px] bg-[#f7f2ec] px-3.5 py-3">
      <div className="text-[11px] text-[#8a7565]">{label}</div>
      <div className="mt-0.75 flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          disabled={!canEdit}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "0"}
          className="w-full min-w-0 border-none bg-transparent text-[16px] font-extrabold text-[#20180f] outline-none placeholder:text-[#c9b8a5] disabled:opacity-60"
        />
        {unit && <span className="shrink-0 text-[12px] font-semibold text-[#8a7565]">{unit}</span>}
      </div>
    </div>
  );
}

export function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 rounded-[10px] border-[1.5px] border-[#e0662e] bg-[#fdeadd] px-5 py-4.5 text-center">
      <div className="text-[12px] font-bold text-[#8a5a3a]">{label}</div>
      <div className="mt-1 text-[28px] font-extrabold text-[#c14a1f]">{value}</div>
    </div>
  );
}

export function ResultBanner({ bg, color, icon, text }: { bg: string; color: string; icon: string; text: string }) {
  return (
    <div className="mt-1 flex items-center gap-2 rounded-[9px] px-3.5 py-3" style={{ background: bg }}>
      <span className="material-symbols-outlined text-[18px]" style={{ color }}>
        {icon}
      </span>
      <span className="text-[12.5px] font-bold" style={{ color }}>
        {text}
      </span>
    </div>
  );
}

export function Table({ headers, minWidth = 600, children }: { headers: string[]; minWidth?: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[9px] border border-[#efe2d4]">
      <table className="w-full border-collapse text-[12px]" style={{ minWidth }}>
        <thead>
          <tr className="bg-[#e0662e]">
            {headers.map((h) => (
              <th key={h} className="border border-[#c14a1f] px-3 py-2.5 text-left text-[11px] font-bold text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <td className={`border border-[#efe2d4] px-3 py-2 text-[#4a4038] ${strong ? "font-bold text-[#20180f]" : ""}`}>{children}</td>;
}

export function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors disabled:opacity-60"
      style={{ background: checked ? "#1a9850" : "#d8cabb" }}
    >
      <span
        className="absolute top-[2px] size-[18px] rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

export function AnalystNote({
  value,
  onChange,
  canEdit,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  canEdit: boolean;
  placeholder?: string;
}) {
  return (
    <div className="mt-4">
      <div className="mb-1.5 text-[12.5px] font-bold text-[#20180f]">Catatan Analis</div>
      <RichTextEditor value={value} onChange={onChange} disabled={!canEdit} placeholder={placeholder ?? "Tuliskan catatan analis..."} />
    </div>
  );
}

export function StatusPill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span className="rounded-full px-2.5 py-0.75 text-[10.5px] font-bold whitespace-nowrap" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

export function ConclusionCard({
  text,
  onTextChange,
  status,
  onMarkSesuai,
  onMarkTidakSesuai,
  onSubmit,
  canEdit,
  submitting,
}: {
  text: string;
  onTextChange: (value: string) => void;
  status: "PENDING" | "SESUAI" | "TIDAK_SESUAI";
  onMarkSesuai: () => void;
  onMarkTidakSesuai: () => void;
  onSubmit: () => void;
  canEdit: boolean;
  submitting: boolean;
}) {
  const submitDisabled = !canEdit || submitting || status === "PENDING" || !text.trim();
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
      <div className="mb-2.5 text-[13.5px] font-bold text-[#20180f]">Kesimpulan Analis</div>
      <textarea
        rows={3}
        value={text}
        disabled={!canEdit}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Tuliskan kesimpulan hasil analisis teknis..."
        className="w-full resize-y rounded-lg border-none bg-[#f7f2ec] px-3 py-2.75 text-[12.5px] text-[#20180f] outline-none disabled:opacity-60"
      />
      <div className="mt-2.5 flex gap-2.5">
        <button
          type="button"
          disabled={!canEdit}
          onClick={onMarkSesuai}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[#1a9850] px-3 py-2.5 text-[12.5px] font-bold disabled:opacity-60"
          style={{ background: status === "SESUAI" ? "#1a9850" : "#fff", color: status === "SESUAI" ? "#fff" : "#1a9850" }}
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Sesuai
        </button>
        <button
          type="button"
          disabled={!canEdit}
          onClick={onMarkTidakSesuai}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-[1.5px] border-[#c1361f] px-3 py-2.5 text-[12.5px] font-bold disabled:opacity-60"
          style={{ background: status === "TIDAK_SESUAI" ? "#c1361f" : "#fff", color: status === "TIDAK_SESUAI" ? "#fff" : "#c1361f" }}
        >
          <span className="material-symbols-outlined text-[16px]">cancel</span>
          Tidak Sesuai
        </button>
      </div>
      <button
        type="button"
        disabled={submitDisabled}
        onClick={onSubmit}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[9px] bg-[#e0662e] px-5 py-3 text-[13.5px] font-bold text-white disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]">send</span>
        {submitting ? "Menyimpan..." : "Submit Hasil Analisis"}
      </button>
    </div>
  );
}
