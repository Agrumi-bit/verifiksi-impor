"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-semibold text-[#594138]">
        {label}
        {required && <span className="text-[#e0662e]"> *</span>}
      </div>
      {children}
      {hint && !error && <div className="mt-1 text-[11px] text-[#a68f80]">{hint}</div>}
      {error && <div className="mt-1 text-[11px] text-[#ba1a1a]">{error}</div>}
    </div>
  );
}

const mutedInputClass =
  "w-full rounded-lg border-none bg-[#f2f0ee] px-3 py-2.5 text-[13px] text-[#261813] outline-none";
const whiteInputClass =
  "w-full rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 text-[13px] text-[#261813] outline-none";

export function TextInput({
  variant = "muted",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { variant?: "muted" | "white" }) {
  return <input {...props} className={variant === "white" ? whiteInputClass : mutedInputClass} />;
}

export function OptionCard({
  code,
  desc,
  selected,
  onClick,
}: {
  code: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[9px] border-[1.5px] p-3.5"
      style={{ borderColor: selected ? "#e0662e" : "#e8dccd", background: selected ? "#fdeadd" : "#fff" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[12.5px] font-bold" style={{ color: selected ? "#c14a1f" : "#261813" }}>
          {code}
        </div>
        {selected && <span className="text-[16px] text-[#e0662e]">✓</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-[#8a7565]">{desc}</div>
    </div>
  );
}

export function SimpleOptionCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-[9px] border-[1.5px] p-2.5 text-center"
      style={{ borderColor: selected ? "#e0662e" : "#e8dccd", background: selected ? "#fdeadd" : "#fff" }}
    >
      <div className="text-[12.5px] font-bold" style={{ color: selected ? "#c14a1f" : "#261813" }}>{label}</div>
    </div>
  );
}

export function CollapsibleCard({
  title,
  description,
  saved,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  saved: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border-[1.5px] p-4.5"
      style={{ borderColor: saved ? "#e0662e" : "#efe2d4", background: saved ? "#fff8f4" : "#fff" }}
    >
      <div onClick={onToggle} className="flex cursor-pointer items-center justify-between">
        <div className="flex items-center gap-2">
          {saved && <span className="text-[18px] text-[#e0662e]">✓</span>}
          <div>
            <div className="text-[14px] font-extrabold text-[#20180f]">{title}</div>
            <div className="mt-0.5 text-[12px] text-[#8a7565]">{description}</div>
          </div>
        </div>
        <span className="text-[22px] text-[#8a7565]">{open ? "▾" : "▸"}</span>
      </div>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function UploadBox({
  label,
  value,
  onFile,
  hint,
}: {
  label: string;
  value?: string;
  onFile: (path: string) => void;
  hint?: string;
}) {
  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("namespace", "temporary");
    const response = await fetch("/api/uploads", { method: "POST", body: formData });
    if (!response.ok) return;
    const data = (await response.json()) as { path: string };
    onFile(data.path);
  }

  return (
    <label className="block cursor-pointer rounded-[10px] border-[1.5px] border-dashed border-[#e1d8cc] p-6 text-center">
      <div className="text-[22px] text-[#8a7565]">{value ? "✓" : "⭱"}</div>
      <div className="mt-1.5 text-[13px] font-semibold text-[#594138]">
        {value ? value.split("/").pop() : label}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] text-[#a68f80]">{hint}</div>}
      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={handleChange} />
    </label>
  );
}
