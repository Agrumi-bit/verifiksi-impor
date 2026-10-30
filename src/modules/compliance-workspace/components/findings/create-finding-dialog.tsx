"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FINDING_KIND_LABELS, FINDING_SEVERITIES, FINDING_SEVERITY_LABELS } from "../../finding-rules";
import { REQUIREMENTS } from "../../requirements";
import { WORKSPACE_KEYS, WORKSPACE_LABELS } from "../../workspace-status";
import { INPUT_CLASS } from "../styles";
import type { CaseListResponse } from "../case-list/use-case-list";
import { useCreateFinding, type NewFinding } from "./use-findings";

const NEW_KINDS = ["OPEN", "KLARIFIKASI", "CONFLICT"] as const;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1 text-[12px] text-[#64748B]", className)}>
      {label}
      {children}
    </label>
  );
}

function emptyForm(applicationId: string): NewFinding {
  return { applicationId, requirementKey: "", kind: "OPEN", severity: "SEDANG", sourceWorkspace: "", title: "", evidenceA: "", evidenceB: "", ownerId: null };
}

/** Catat Temuan — Compliance records a finding on a case; it never edits the case itself. */
export function CreateFindingDialog({
  open,
  onOpenChange,
  defaultApplicationId,
  pics,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultApplicationId: string;
  pics: { id: string; name: string }[];
  onCreated: (id: string, kind: NewFinding["kind"]) => void;
}) {
  const [form, setForm] = useState<NewFinding>(() => emptyForm(defaultApplicationId));
  const [formError, setFormError] = useState<string | null>(null);
  const create = useCreateFinding();
  const cases = useQuery({
    queryKey: ["compliance-workspace", "applications", "case-options"],
    enabled: open,
    queryFn: async () => {
      const response = await fetch("/api/compliance-workspace/applications?pageSize=all&sort=number&dir=asc");
      if (!response.ok) throw new Error("Gagal memuat permohonan.");
      return ((await response.json()) as { data: CaseListResponse }).data.rows;
    },
  });

  function update(patch: Partial<NewFinding>) {
    setForm((current) => ({ ...current, ...patch }));
    setFormError(null);
  }

  function handleOpenChange(next: boolean) {
    if (next) setForm(emptyForm(defaultApplicationId));
    setFormError(null);
    onOpenChange(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.applicationId || !form.requirementKey || !form.sourceWorkspace) {
      setFormError("Lengkapi permohonan, requirement, dan workspace sumber.");
      return;
    }
    if (form.title.trim().length < 10) {
      setFormError("Judul temuan minimal 10 karakter.");
      return;
    }
    try {
      const created = await create.mutateAsync({ ...form, ownerId: form.ownerId || null });
      onOpenChange(false);
      onCreated(created.id, form.kind);
    } catch (cause) {
      setFormError((cause as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[640px] bg-white text-[#10233F]">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Catat Temuan</DialogTitle>
            <DialogDescription>Temuan dicatat di Compliance. Perbaikan data tetap dilakukan oleh workspace sumber.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Permohonan" className="sm:col-span-2">
              <select value={form.applicationId} onChange={(event) => update({ applicationId: event.target.value })} className={INPUT_CLASS} disabled={cases.isLoading}>
                <option value="">{cases.isLoading ? "Memuat permohonan…" : "Pilih permohonan…"}</option>
                {(cases.data ?? []).map((row) => (
                  <option key={row.applicationId} value={row.applicationId}>{row.applicationNumber} · {row.companyName}</option>
                ))}
              </select>
            </Field>
            <Field label="Requirement">
              <select value={form.requirementKey} onChange={(event) => {
                const requirement = REQUIREMENTS.find((item) => item.key === event.target.value);
                update({ requirementKey: event.target.value, sourceWorkspace: form.sourceWorkspace || requirement?.source || "" });
              }} className={INPUT_CLASS}>
                <option value="">Pilih requirement…</option>
                {REQUIREMENTS.map((requirement) => (
                  <option key={requirement.key} value={requirement.key}>{requirement.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Workspace sumber">
              <select value={form.sourceWorkspace} onChange={(event) => update({ sourceWorkspace: event.target.value })} className={INPUT_CLASS}>
                <option value="">Pilih workspace…</option>
                {WORKSPACE_KEYS.map((key) => (
                  <option key={key} value={key}>{WORKSPACE_LABELS[key]}</option>
                ))}
              </select>
            </Field>
            <Field label="Jenis">
              <select value={form.kind} onChange={(event) => update({ kind: event.target.value as NewFinding["kind"] })} className={INPUT_CLASS}>
                {NEW_KINDS.map((kind) => (
                  <option key={kind} value={kind}>{FINDING_KIND_LABELS[kind]}</option>
                ))}
              </select>
            </Field>
            <Field label="Severity">
              <select value={form.severity} onChange={(event) => update({ severity: event.target.value as NewFinding["severity"] })} className={INPUT_CLASS}>
                {FINDING_SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>{FINDING_SEVERITY_LABELS[severity]}</option>
                ))}
              </select>
            </Field>
            <Field label="Judul temuan" className="sm:col-span-2">
              <input value={form.title} onChange={(event) => update({ title: event.target.value })} placeholder="mis. Alamat gudang pada Verifikator berbeda dengan hasil Surveyor." className={INPUT_CLASS} />
            </Field>
            <Field label="Data A (opsional)">
              <input value={form.evidenceA} onChange={(event) => update({ evidenceA: event.target.value })} placeholder="mis. Surveyor: Gudang Cikarang" className={INPUT_CLASS} />
            </Field>
            <Field label="Data B (opsional)">
              <input value={form.evidenceB} onChange={(event) => update({ evidenceB: event.target.value })} placeholder="mis. Verifikator: Gudang Karawang" className={INPUT_CLASS} />
            </Field>
            <Field label="Owner">
              <select value={form.ownerId ?? ""} onChange={(event) => update({ ownerId: event.target.value || null })} className={INPUT_CLASS}>
                <option value="">— Belum ada —</option>
                {pics.map((pic) => (
                  <option key={pic.id} value={pic.id}>{pic.name}</option>
                ))}
              </select>
            </Field>
          </div>

          {formError && <p role="alert" className="text-[12.5px] text-[#B91C1C]">{formError}</p>}

          <DialogFooter>
            <button type="button" onClick={() => handleOpenChange(false)} className={cn(INPUT_CLASS, "px-3.5 font-medium hover:bg-[#F5F7FA]")}>
              Batal
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="h-9 rounded-lg bg-[#1677FF] px-3.5 text-[13px] font-medium text-white outline-none hover:bg-[#0F62D6] focus-visible:ring-2 focus-visible:ring-[#1677FF]/40 disabled:opacity-60"
            >
              Simpan Temuan
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
