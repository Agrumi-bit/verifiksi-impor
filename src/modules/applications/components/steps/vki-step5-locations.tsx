"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, MapPin, Pencil, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LocationItemFields, type CompanyAddressValues } from "@/components/wizard/locations-field";
import {
  LOCATION_TYPES,
  REQUIRED_LOCATION_TYPE_LABELS,
  createEmptyLocation,
  getRequiredLocationTypes,
  locationSchema,
  locationsSchema,
  missingRequiredLocationTypes,
  type LocationType,
  type LocationValues,
} from "@/modules/shared/schema";
import {
  LOCATION_SOURCE_BADGE_STYLE,
  companyLocationIdOf,
  isLocationSnapshotStale,
  locationSourceBadge,
} from "@/modules/shared/location-meta";
import type { ApplicationWizardValues } from "../../schema";

const OWNERSHIP_LABEL: Record<string, string> = {
  MILIK_SENDIRI: "Milik Sendiri",
  SEWA: "Sewa",
};

type Props = {
  form: UseFormReturn<ApplicationWizardValues>;
  companyAddress?: CompanyAddressValues;
  availableTypes?: readonly LocationType[];
  typeHint?: string;
  /** Where "Ubah di profil perusahaan" goes — admin company detail vs Company Workspace profile. */
  companyProfileHref?: string;
  /** Saved application id (draft/revision/edit), recorded as the new location's source. */
  applicationId?: string | null;
};

/**
 * Step 5 "Location Information": the application's locations are picked from the company
 * profile (Company.locations, the single source of truth) instead of re-entered. Picking a
 * location copies a snapshot of it into payload.locations linked by `companyLocationId`; the
 * server refreshes that snapshot from the live profile on submit. "Tambah Lokasi Baru" saves the
 * new facility to the company profile first, then selects it.
 */
export function VkiStep5Locations({
  form,
  companyAddress,
  availableTypes = LOCATION_TYPES,
  typeHint,
  companyProfileHref,
  applicationId,
}: Props) {
  const queryClient = useQueryClient();
  const companyId = useWatch({ control: form.control, name: "companyId" });
  const selected = (useWatch({ control: form.control, name: "locations" }) ?? []) as LocationValues[];
  const verificationType = useWatch({ control: form.control, name: "verificationType" }) === "VKI" ? "VKI" : "VIU";
  const [isAdding, setIsAdding] = useState(false);

  const { data: companyLocations = [], isLoading } = useQuery({
    queryKey: ["companies", companyId, "locations"],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) throw new Error("Gagal memuat lokasi perusahaan");
      const json = (await response.json()) as { data: { locations: LocationValues[] | null } };
      return json.data.locations ?? [];
    },
    enabled: Boolean(companyId),
  });

  const selectedByCompanyId = new Map(selected.map((loc) => [companyLocationIdOf(loc), loc]));
  const companyIds = new Set(companyLocations.map((loc) => loc.id));
  // Entries already in the application that no longer match any company location (legacy
  // applications, or a location since removed from the profile) — still shown, never dropped silently.
  const orphanSelected = selected.filter((loc) => !companyIds.has(companyLocationIdOf(loc)));

  const requiredTypes = getRequiredLocationTypes(verificationType);
  const presentTypes = new Set(selected.map((loc) => loc.locationType));
  const missingTypes = missingRequiredLocationTypes(selected, verificationType);

  function setLocations(next: LocationValues[]) {
    form.setValue("locations", next as ApplicationWizardValues["locations"], { shouldDirty: true, shouldValidate: true });
  }

  function select(location: LocationValues) {
    if (selectedByCompanyId.has(location.id)) return;
    setLocations([...selected, { ...location, companyLocationId: location.id }]);
  }

  function deselect(companyLocationId: string) {
    setLocations(selected.filter((loc) => companyLocationIdOf(loc) !== companyLocationId));
  }

  async function handleAdded(location: LocationValues) {
    await queryClient.invalidateQueries({ queryKey: ["companies", companyId, "locations"] });
    setLocations([...selected, { ...location, companyLocationId: location.id }]);
    setIsAdding(false);
  }

  if (!companyId) {
    return <p className="text-sm text-muted-foreground">Pilih perusahaan terlebih dahulu di Step 1.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm font-bold">Lokasi Perusahaan</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Pilih lokasi yang diajukan dari daftar lokasi di profil perusahaan — tidak perlu mengisi ulang. Fasilitas yang
          belum terdaftar bisa ditambahkan lewat &quot;Tambah Lokasi Baru&quot;; lokasi itu langsung tersimpan di profil
          perusahaan.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
        <span className="text-xs font-semibold text-muted-foreground">Lokasi wajib:</span>
        {requiredTypes.map((type) => {
          const present = presentTypes.has(type);
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                present ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-destructive/10 text-destructive"
              }`}
            >
              {present ? <Check className="size-3" /> : <X className="size-3" />}
              {REQUIRED_LOCATION_TYPE_LABELS[type]}
            </span>
          );
        })}
      </div>

      {missingTypes.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {missingTypes.map((type) => {
            const candidates = companyLocations.filter((loc) => loc.locationType === type && !selectedByCompanyId.has(loc.id));
            return (
              <div key={type} className="flex flex-wrap items-center gap-2">
                <span>Lokasi {REQUIRED_LOCATION_TYPE_LABELS[type]} wajib dipilih.</span>
                {candidates.length > 0 ? (
                  candidates.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => select(loc)}
                      className="rounded-full border border-destructive/40 bg-white px-2.5 py-1 font-semibold text-destructive hover:bg-destructive/10"
                    >
                      Pilih {REQUIRED_LOCATION_TYPE_LABELS[type]} dari profil perusahaan — {loc.address}
                    </button>
                  ))
                ) : (
                  <span>Belum ada di profil perusahaan — tambahkan lewat &quot;Tambah Lokasi Baru&quot;.</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isLoading && <p className="text-xs text-muted-foreground">Memuat lokasi perusahaan...</p>}
      {!isLoading && companyLocations.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Profil perusahaan belum memiliki lokasi. Tambahkan lewat &quot;Tambah Lokasi Baru&quot;.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {companyLocations.map((loc) => {
          const picked = selectedByCompanyId.get(loc.id);
          return (
            <CompanyLocationCard
              key={loc.id}
              location={loc}
              selected={Boolean(picked)}
              stale={picked ? isLocationSnapshotStale(picked, loc) : false}
              onToggle={() => (picked ? deselect(loc.id) : select(loc))}
              companyProfileHref={companyProfileHref}
            />
          );
        })}
        {orphanSelected.map((loc) => (
          <CompanyLocationCard
            key={loc.id}
            location={loc}
            selected
            orphan
            onToggle={() => deselect(companyLocationIdOf(loc))}
          />
        ))}
      </div>

      {isAdding ? (
        <AddLocationForm
          companyId={companyId}
          applicationId={applicationId}
          availableTypes={availableTypes}
          typeHint={typeHint}
          companyAddress={companyAddress}
          onCancel={() => setIsAdding(false)}
          onAdded={handleAdded}
        />
      ) : (
        <Button type="button" variant="outline" className="border-dashed" onClick={() => setIsAdding(true)}>
          <Plus className="size-4" />
          Tambah Lokasi Baru
        </Button>
      )}
    </div>
  );
}

function CompanyLocationCard({
  location,
  selected,
  stale = false,
  orphan = false,
  onToggle,
  companyProfileHref,
}: {
  location: LocationValues;
  selected: boolean;
  stale?: boolean;
  orphan?: boolean;
  onToggle: () => void;
  companyProfileHref?: string;
}) {
  const cityProvince = [location.city, location.province].filter(Boolean).join(", ");
  const street = [location.address, location.addressDesa, location.addressKecamatan].filter(Boolean).join(", ");
  const completeness = locationSchema.safeParse(location);
  const badge = locationSourceBadge(location);
  const badgeStyle = LOCATION_SOURCE_BADGE_STYLE[badge.tone];

  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
      }`}
    >
      {/* Visual only — the whole card is the toggle (see role="checkbox" above). */}
      <input type="checkbox" checked={selected} readOnly tabIndex={-1} className="pointer-events-none mt-1 size-4 accent-[#e0662e]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">{REQUIRED_LOCATION_TYPE_LABELS[location.locationType as LocationType] ?? location.locationType}</span>
          {orphan ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
              Hanya di permohonan (tidak ada di profil perusahaan)
            </span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
              {badge.label}
            </span>
          )}
          <span className="rounded-md bg-primary px-2 py-0.5 text-[10.5px] font-bold text-primary-foreground">
            {OWNERSHIP_LABEL[location.buildingStatus] ?? location.buildingStatus}
          </span>
        </div>
        <div className="mt-1.5 text-sm font-semibold text-primary">{street}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {cityProvince} · {location.country} {location.postalCode}
          {location.locationType === "GUDANG" && location.warehouseRegistrationNumber
            ? ` · Tanda daftar gudang ${location.warehouseRegistrationNumber}`
            : ""}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {completeness.success ? (
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">✓ Data & dokumen lengkap</span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <AlertTriangle className="size-3.5" />
              Belum lengkap: {completeness.error.issues[0]?.message}
            </span>
          )}
          {stale && <span className="font-semibold text-amber-700">· Data lokasi di profil berubah — snapshot diperbarui saat disimpan/diajukan</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        {companyProfileHref && !orphan && (
          <Link
            href={companyProfileHref}
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#2f6fe0] hover:underline"
          >
            <Pencil className="size-3" />
            Ubah di profil perusahaan
          </Link>
        )}
      </div>
    </div>
  );
}

function AddLocationForm({
  companyId,
  applicationId,
  availableTypes,
  typeHint,
  companyAddress,
  onCancel,
  onAdded,
}: {
  companyId: string;
  applicationId?: string | null;
  availableTypes: readonly LocationType[];
  typeHint?: string;
  companyAddress?: CompanyAddressValues;
  onCancel: () => void;
  onAdded: (location: LocationValues) => Promise<void>;
}) {
  // Its own small form (same field component + validation as the Company Profile's locations)
  // so a half-filled new location never leaks into the application until it's saved.
  const miniForm = useForm<{ locations: LocationValues[] }>({
    resolver: zodResolver(locationsSchema),
    mode: "onBlur",
    defaultValues: { locations: [createEmptyLocation() as LocationValues] },
  });
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const valid = await miniForm.trigger();
    if (!valid) {
      toast.error("Lengkapi data lokasi baru terlebih dahulu.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: miniForm.getValues("locations.0"), applicationId: applicationId ?? undefined }),
      });
      const body = (await response.json().catch(() => null)) as { data?: LocationValues; error?: string } | null;
      if (!response.ok || !body?.data) throw new Error(body?.error ?? "Gagal menyimpan lokasi");
      toast.success("Lokasi baru tersimpan di profil perusahaan dan dipilih untuk permohonan ini.");
      await onAdded(body.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan lokasi");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/50 p-4">
      <div className="text-sm font-bold">Tambah Lokasi Baru</div>
      <p className="text-xs text-muted-foreground">
        Lokasi ini akan disimpan ke profil perusahaan (sumber: &quot;Ditambahkan saat permohonan&quot;) dan otomatis dipilih.
      </p>
      <LocationItemFields
        form={miniForm}
        index={0}
        onRemove={onCancel}
        canRemove={false}
        availableTypes={availableTypes}
        typeHint={typeHint}
        companyAddress={companyAddress}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Batal
        </Button>
        <Button type="button" onClick={save} disabled={isSaving}>
          {isSaving ? "Menyimpan..." : "Simpan ke Profil & Pilih"}
        </Button>
      </div>
    </div>
  );
}
