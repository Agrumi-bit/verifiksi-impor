"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Link2, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import { useExistingBrandQualityTests, type ExistingBrandQualityTest } from "../../../../hooks/use-brand-quality-tests";
import { createEmptyProductGroupCertificate, type ProductGroupCertificateValues } from "../../schema";
import {
  applyCertificateToGroups,
  certificateForGroup,
  groupSharedCertificates,
  isSameCertificate,
  newCertificateKey,
  otherGroupsSharing,
  upsertGroupCertificate,
} from "../../shared-certificates";
import { CERTIFICATE_STATUS_CLASSES, CERTIFICATE_STATUS_LABELS, computeCertificateStatus } from "./certificate-status";

export type BrandGroup = { commodityGroupId: string; commodityName: string };

type Props = {
  brandId: string;
  commodityGroupId: string;
  commodityName: string;
  /** Every Sub Kelompok of this Brand that has products on this application. */
  brandGroups: BrandGroup[];
  /** The application's whole `productGroupCertificates` list. */
  certificates: ProductGroupCertificateValues[];
  onCertificatesChange: (next: ProductGroupCertificateValues[]) => void;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const today = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

function isUsable(certificate: ProductGroupCertificateValues): boolean {
  const status = computeCertificateStatus(certificate, certificate, today());
  return status === "valid" || status === "expiring";
}

/**
 * One Merek x Sub Kelompok Komoditas group's Hasil Uji Mutu requirement. A certificate may cover
 * several Sub Kelompok of the same Brand (shared-certificates.ts): it can be reused from another
 * group of this application ("Dari permohonan ini"), picked from the Brand's existing Hasil Uji
 * Mutu rows of ANY Sub Kelompok ("Dari Hasil Uji Mutu"), or uploaded fresh — and applied to other
 * groups at once. A shared certificate is one certificate: editing it edits it everywhere, after
 * confirmation. The server re-resolves/re-validates every path at submit, never trusting this
 * panel's own state as final.
 */
export function CertificatePanel({ brandId, commodityGroupId, commodityName, brandGroups, certificates, onCertificatesChange }: Props) {
  const certificate = certificates.find((c) => c.brandId === brandId && c.commodityGroupId === commodityGroupId);
  const [mode, setMode] = useState<"existing" | "new">(certificate?.qualityTestId ? "existing" : "new");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [unlockedShareEdit, setUnlockedShareEdit] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const { data: existingOptions, isLoading: isLoadingExisting } = useExistingBrandQualityTests(brandId, commodityGroupId);

  const group = { brandId, commodityGroupId, commodityName };
  const current = certificate ?? createEmptyProductGroupCertificate(brandId, commodityGroupId, commodityName);
  const status = computeCertificateStatus(certificate, group, today());
  const groupName = (id: string) =>
    brandGroups.find((g) => g.commodityGroupId === id)?.commodityName ??
    certificates.find((c) => c.commodityGroupId === id)?.commodityName ??
    id;

  const sharedWith = certificate?.filePath ? otherGroupsSharing(certificates, certificate) : [];
  const isShared = sharedWith.length > 0;
  const editLocked = isShared && !current.qualityTestId && !unlockedShareEdit;

  // "Dari permohonan ini" — distinct usable certificates of other groups of the same Brand.
  const sameBrandOthers = certificates.filter((c) => c.brandId === brandId && c.commodityGroupId !== commodityGroupId && c.filePath && isUsable(c));
  const applicationOptions = groupSharedCertificates(sameBrandOthers).filter((bucket) => !(certificate && isSameCertificate(bucket[0], certificate)));

  // Groups of this Brand with no certificate yet — targets of "Gunakan untuk Sub Kelompok lain".
  const groupsWithoutCertificate = brandGroups.filter((g) => {
    if (g.commodityGroupId === commodityGroupId) return false;
    const existing = certificates.find((c) => c.brandId === brandId && c.commodityGroupId === g.commodityGroupId);
    return computeCertificateStatus(existing, { brandId, commodityGroupId: g.commodityGroupId }, today()) === "missing";
  });

  /** Gives a fresh certificate a share key (on every entry already using it) before reuse. */
  function withShareKey(list: ProductGroupCertificateValues[], source: ProductGroupCertificateValues) {
    if (source.qualityTestId || source.certificateKey) return { list, source };
    const keyed = { ...source, certificateKey: newCertificateKey() };
    return { list: upsertGroupCertificate(list, keyed, { propagateFrom: source }), source: keyed };
  }

  function pickFromApplication(source: ProductGroupCertificateValues) {
    const { list, source: keyed } = withShareKey(certificates, source);
    onCertificatesChange(upsertGroupCertificate(list, certificateForGroup(keyed, group)));
    setUnlockedShareEdit(false);
  }

  function pickFromQualityTests(option: ExistingBrandQualityTest) {
    onCertificatesChange(
      upsertGroupCertificate(certificates, {
        ...group,
        qualityTestId: option.id,
        certificateNumber: option.certificateNumber,
        laboratoryName: option.laboratoryName,
        issueDate: option.issueDate,
        validUntil: option.expiryDate ?? undefined,
        fileName: option.fileName,
        filePath: option.filePath,
      }),
    );
    setUnlockedShareEdit(false);
  }

  function updateNew(patch: Partial<ProductGroupCertificateValues>) {
    if (editLocked) {
      setEditConfirmOpen(true);
      return;
    }
    const next = { ...current, qualityTestId: undefined, ...patch };
    // Editing a shared certificate (confirmed) edits it for every group using it.
    onCertificatesChange(upsertGroupCertificate(certificates, next, { propagateFrom: isShared ? current : undefined }));
  }

  function detachThisGroup() {
    onCertificatesChange(upsertGroupCertificate(certificates, createEmptyProductGroupCertificate(brandId, commodityGroupId, commodityName)));
    setMode("new");
    setEditConfirmOpen(false);
  }

  function applyToGroups(targetIds: string[]) {
    if (!certificate) return;
    const { list, source } = withShareKey(certificates, certificate);
    const targets = brandGroups.filter((g) => targetIds.includes(g.commodityGroupId)).map((g) => ({ brandId, ...g }));
    onCertificatesChange(applyCertificateToGroups(list, source, targets));
    setApplyOpen(false);
  }

  async function handleFile(file: File) {
    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("namespace", "documents");
      const response = await fetch("/api/uploads", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Upload failed");
      const data = (await response.json()) as { path: string; name: string };
      updateNew({ filePath: data.path, fileName: data.name });
      setUploadStatus("idle");
    } catch {
      setUploadStatus("error");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-background p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          Sertifikat Hasil Uji Mutu
          {isShared && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10.5px] font-bold text-sky-700 dark:text-sky-400">
              <Link2 className="size-3" />
              Dipakai bersama
            </span>
          )}
        </p>
        <span className={`inline-flex h-5 items-center rounded-full px-2.5 text-[10.5px] font-bold ${CERTIFICATE_STATUS_CLASSES[status]}`}>
          {CERTIFICATE_STATUS_LABELS[status]}
          {status === "expiring" && certificate?.validUntil ? ` · ${formatDate(certificate.validUntil)}` : ""}
        </span>
      </div>
      {status === "valid" && certificate?.filePath && !certificate.validUntil && (
        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
          Sertifikat tidak memiliki batas berlaku — bukan error, tapi akan dikonfirmasi ulang oleh verifikator.
        </p>
      )}
      {isShared && (
        <p className="mt-2 rounded-md bg-sky-500/5 px-2.5 py-1.5 text-[11.5px] text-sky-800 dark:text-sky-300">
          Sertifikat ini juga dipakai di: <strong>{sharedWith.map((c) => groupName(c.commodityGroupId)).join(", ")}</strong>
        </p>
      )}

      <div className="mt-3 flex gap-1 rounded-lg bg-muted p-1 text-xs">
        <button type="button" onClick={() => setMode("existing")} className={`flex-1 rounded-md py-1.5 font-semibold ${mode === "existing" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
          Pilih sertifikat yang sudah ada
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("new");
            // Switching away from a picked certificate starts a blank manual entry for THIS group
            // only — never carries the picked row's fields over as if they were freshly typed.
            if (current.qualityTestId) detachThisGroup();
          }}
          className={`flex-1 rounded-md py-1.5 font-semibold ${mode === "new" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          Unggah baru
        </button>
      </div>

      {mode === "existing" ? (
        <div className="mt-3 flex flex-col gap-3">
          {certificate?.filePath && (
            <p className="text-[11.5px] text-muted-foreground">
              Dipakai saat ini: <strong className="text-foreground">{certificate.certificateNumber}</strong> — {certificate.laboratoryName}
            </p>
          )}
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Dari permohonan ini</p>
            {applicationOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada sertifikat lain di permohonan ini untuk merek yang sama.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {applicationOptions.map((bucket) => {
                  const source = bucket[0];
                  return (
                    <OptionCard
                      key={`${source.commodityGroupId}`}
                      title={source.certificateNumber}
                      lines={[
                        `${source.laboratoryName} · terbit ${formatDate(source.issueDate)} · berlaku s/d ${source.validUntil ? formatDate(source.validUntil) : "tidak ada batas"}`,
                        source.fileName,
                        `dipakai di: ${bucket.map((c) => groupName(c.commodityGroupId)).join(", ")}`,
                      ]}
                      onUse={() => pickFromApplication(source)}
                    />
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Dari Hasil Uji Mutu</p>
            {isLoadingExisting ? (
              <p className="text-xs text-muted-foreground">Memuat sertifikat...</p>
            ) : (existingOptions ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada sertifikat Hasil Uji Mutu yang berlaku untuk merek ini.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {(existingOptions ?? []).map((option) => (
                  <OptionCard
                    key={option.id}
                    title={option.certificateNumber}
                    selected={certificate?.qualityTestId === option.id}
                    lines={[
                      `${option.laboratoryName} · terbit ${formatDate(option.issueDate)} · berlaku s/d ${option.expiryDate ? formatDate(option.expiryDate) : "tidak ada batas"}`,
                      option.fileName,
                      `cakupan: ${option.coverageNames.join(", ")}`,
                    ]}
                    badge={option.coversGroup ? undefined : "Sub Kelompok berbeda"}
                    onUse={() => pickFromQualityTests(option)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {editLocked && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-500/30 px-2.5 py-2 text-[11.5px]">
              <span>Perubahan pada sertifikat ini akan berlaku untuk semua Sub Kelompok yang memakainya.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditConfirmOpen(true)}>
                Ubah sertifikat…
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="No. Sertifikat" required>
              <Input value={current.certificateNumber} readOnly={editLocked} onChange={(event) => updateNew({ certificateNumber: event.target.value })} />
            </FormField>
            <FormField label="Laboratorium" required>
              <Input value={current.laboratoryName} readOnly={editLocked} onChange={(event) => updateNew({ laboratoryName: event.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal Terbit" required>
              <Input type="date" className="font-mono" value={current.issueDate} readOnly={editLocked} onChange={(event) => updateNew({ issueDate: event.target.value })} />
            </FormField>
            <FormField label="Berlaku Sampai" hint="Kosongkan jika tidak ada batas berlaku.">
              <Input
                type="date"
                className="font-mono"
                value={current.validUntil ?? ""}
                readOnly={editLocked}
                onChange={(event) => updateNew({ validUntil: event.target.value || undefined })}
              />
            </FormField>
          </div>

          {current.filePath ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="truncate">{current.fileName}</span>
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              </span>
              <button type="button" onClick={() => updateNew({ filePath: "", fileName: "" })} className="shrink-0 text-xs font-semibold text-destructive hover:underline">
                Hapus
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/40">
              {uploadStatus === "uploading" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              {uploadStatus === "uploading" ? "Mengunggah..." : "Unggah File Sertifikat"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void handleFile(file);
                }}
              />
            </label>
          )}
        </div>
      )}

      {(status === "valid" || status === "expiring") && groupsWithoutCertificate.length > 0 && (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setApplyOpen(true)}>
          <Link2 className="size-3.5" />
          Gunakan sertifikat ini untuk Sub Kelompok lain…
        </Button>
      )}

      <Dialog open={editConfirmOpen} onOpenChange={setEditConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah sertifikat yang dipakai bersama?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sertifikat ini juga dipakai di: <strong className="text-foreground">{sharedWith.map((c) => groupName(c.commodityGroupId)).join(", ")}</strong>.
            Perubahan data atau file akan berlaku untuk semua Sub Kelompok tersebut.
          </p>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={detachThisGroup}>
              Pisahkan untuk {commodityName} saja
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditConfirmOpen(false)}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setUnlockedShareEdit(true);
                  setEditConfirmOpen(false);
                }}
              >
                Ubah untuk semua
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {applyOpen && (
        <ApplyToGroupsDialog
          groups={groupsWithoutCertificate}
          certificateNumber={current.certificateNumber}
          onClose={() => setApplyOpen(false)}
          onApply={applyToGroups}
        />
      )}
    </div>
  );
}

function OptionCard({ title, lines, badge, selected, onUse }: { title: string; lines: string[]; badge?: string; selected?: boolean; onUse: () => void }) {
  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${selected ? "border-primary bg-primary/5" : "border-border"}`}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 font-semibold">
          {title}
          {badge && <span className="rounded-full bg-amber-500/10 px-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">{badge}</span>}
        </p>
        {lines.map((line, index) => (
          <p key={index} className="truncate text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
      <Button type="button" size="sm" variant={selected ? "secondary" : "outline"} disabled={selected} onClick={onUse}>
        {selected ? "Dipakai" : "Gunakan"}
      </Button>
    </div>
  );
}

function ApplyToGroupsDialog({
  groups,
  certificateNumber,
  onClose,
  onApply,
}: {
  groups: BrandGroup[];
  certificateNumber: string;
  onClose: () => void;
  onApply: (commodityGroupIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(groups.map((g) => g.commodityGroupId));
  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gunakan sertifikat {certificateNumber} untuk Sub Kelompok lain</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Sub Kelompok merek ini yang belum punya sertifikat:</p>
        <div className="flex flex-col gap-1.5">
          {groups.map((g) => (
            <label key={g.commodityGroupId} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.includes(g.commodityGroupId)} onChange={() => toggle(g.commodityGroupId)} />
              {g.commodityName}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="button" disabled={selected.length === 0} onClick={() => onApply(selected)}>
            Terapkan ke {selected.length} Sub Kelompok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
