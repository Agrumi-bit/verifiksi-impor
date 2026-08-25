"use client";

import {
  Controller,
  useFieldArray,
  useWatch,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { Building2, ChevronDown, Factory, Plus, Trash2, Warehouse } from "lucide-react";

import { SelectableCard } from "@/components/form/selectable-card";
import { FileUploadField } from "@/components/form/file-upload-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, TextInput } from "@/modules/company/components/wizard-ui";
import { RegionCascadeFields } from "./region-cascade-fields";
import {
  LOCATION_TYPES,
  WAREHOUSE_REGISTRATION_TYPES,
  OWNERSHIP_DOCUMENT_TYPES,
  OWNERSHIP_DOCUMENT_TYPE_LABELS,
  LEASE_DOCUMENT_TYPES,
  LEASE_DOCUMENT_TYPE_LABELS,
  createEmptyLocation,
  type LocationType,
  type LocationValues,
  type LocationOwnershipDocEntry,
  type LocationLeaseDocEntry,
} from "@/modules/shared/schema";

const LOCATION_TYPE_META: Record<LocationType, { label: string; icon: typeof Building2 }> = {
  KANTOR: { label: "Kantor", icon: Building2 },
  GUDANG: { label: "Gudang", icon: Warehouse },
  PABRIK: { label: "Pabrik", icon: Factory },
};

const WAREHOUSE_REGISTRATION_LABELS: Record<
  (typeof WAREHOUSE_REGISTRATION_TYPES)[number],
  string
> = {
  TANDA_DAFTAR_GUDANG: "Tanda Daftar Gudang",
  PENETAPAN_GUDANG_BERIKAT: "Penetapan Gudang Berikat",
  GUDANG_PENIMBUNAN_SEMENTARA: "Gudang Penimbunan Sementara",
};

type FormWithLocations = FieldValues & { locations: LocationValues[] };

/** Matches the location schema's own address field names 1:1, so it can be copied straight across with `form.setValue`. */
export type CompanyAddressValues = {
  address: string;
  addressDesa: string;
  addressKecamatan: string;
  city: string;
  province: string;
  postalCode: string;
};

type LocationItemProps<T extends FormWithLocations> = {
  form: UseFormReturn<T>;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  availableTypes: readonly LocationType[];
  typeHint?: string;
  companyAddress?: CompanyAddressValues;
};

export function LocationItemFields<T extends FormWithLocations>({
  form,
  index,
  onRemove,
  canRemove,
  availableTypes,
  typeHint,
  companyAddress,
}: LocationItemProps<T>) {
  const { control, register, formState, setValue } = form;
  const locationErrors = (formState.errors.locations as { message?: string }[] | undefined)?.[
    index
  ] as Record<string, { message?: string } | undefined> | undefined;

  function applyCompanyAddress() {
    if (!companyAddress) return;
    const options = { shouldValidate: true, shouldDirty: true } as const;
    setValue(`locations.${index}.address` as Path<T>, companyAddress.address as never, options);
    setValue(`locations.${index}.addressDesa` as Path<T>, companyAddress.addressDesa as never, options);
    setValue(`locations.${index}.addressKecamatan` as Path<T>, companyAddress.addressKecamatan as never, options);
    setValue(`locations.${index}.city` as Path<T>, companyAddress.city as never, options);
    setValue(`locations.${index}.province` as Path<T>, companyAddress.province as never, options);
    setValue(`locations.${index}.postalCode` as Path<T>, companyAddress.postalCode as never, options);
  }

  const locationType = useWatch({
    control,
    name: `locations.${index}.locationType` as Path<T>,
  }) as LocationType | undefined;
  const buildingStatus = useWatch({
    control,
    name: `locations.${index}.buildingStatus` as Path<T>,
  }) as LocationValues["buildingStatus"] | undefined;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#efe2d4] bg-[#fffaf6] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#20180f]">Lokasi Baru</p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[12px] font-semibold text-[#c1361f]"
          >
            <Trash2 className="size-3.5" />
            Hapus
          </button>
        )}
      </div>

      <Field label="Location Type" required error={locationErrors?.locationType?.message} hint={typeHint}>
        <Controller
          control={control}
          name={`locations.${index}.locationType` as Path<T>}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {availableTypes.map((type) => {
                const meta = LOCATION_TYPE_META[type];
                const Icon = meta.icon;
                const selected = field.value === type;
                return (
                  <SelectableCard
                    key={type}
                    selected={selected}
                    onSelect={() => field.onChange(type)}
                    className="items-center gap-1 py-3 text-center"
                  >
                    <Icon className={selected ? "size-4 text-[#c14a1f]" : "size-4 text-[#8a7565]"} />
                    <span className={selected ? "text-xs font-bold text-[#c14a1f]" : "text-xs font-medium text-[#594138]"}>
                      {meta.label}
                    </span>
                  </SelectableCard>
                );
              })}
            </div>
          )}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">
            Address Information
          </h3>
          {companyAddress && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold text-[#594138]">
              <Checkbox onCheckedChange={(next) => next && applyCompanyAddress()} />
              Sama dengan alamat perusahaan
            </label>
          )}
        </div>
        <Field label="Jalan" required error={locationErrors?.address?.message}>
          <TextInput
            variant="white"
            placeholder="e.g. Jl. Industri Raya No. 15, Kawasan Industri Cimahi"
            {...register(`locations.${index}.address` as Path<T>)}
          />
        </Field>
        <RegionCascadeFields
          form={form}
          provinceFieldName={`locations.${index}.province` as Path<T>}
          cityFieldName={`locations.${index}.city` as Path<T>}
          districtFieldName={`locations.${index}.addressKecamatan` as Path<T>}
          subdistrictFieldName={`locations.${index}.addressDesa` as Path<T>}
          postalCodeFieldName={`locations.${index}.postalCode` as Path<T>}
          errors={{
            province: locationErrors?.province?.message,
            city: locationErrors?.city?.message,
            district: locationErrors?.addressKecamatan?.message,
            subdistrict: locationErrors?.addressDesa?.message,
            postalCode: locationErrors?.postalCode?.message,
          }}
        />
      </div>

      <Field
        label="Google Maps Link"
        error={locationErrors?.googleMapsLink?.message}
        hint="Link Google Maps sangat membantu saat proses verifikasi lapangan."
      >
        <TextInput
          variant="white"
          placeholder="https://maps.google.com/xxxxx"
          {...register(`locations.${index}.googleMapsLink` as Path<T>)}
        />
      </Field>

      <div className="flex flex-col gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">
          Status Bangunan
        </h3>
        <Controller
          control={control}
          name={`locations.${index}.buildingStatus` as Path<T>}
          render={({ field }) => (
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#e8dccd]">
              {(
                [
                  ["MILIK_SENDIRI", "Milik Sendiri"],
                  ["SEWA", "Sewa"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => field.onChange(value)}
                  className={
                    field.value === value
                      ? "bg-[#e0662e] px-3 py-2 text-[13px] font-semibold text-white"
                      : "bg-white px-3 py-2 text-[13px] font-semibold text-[#594138] hover:bg-[#fdeadd]/50"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        />

        {buildingStatus === "SEWA" ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bukti Kepemilikan" error={locationErrors?.leaseProofOfOwnership?.message}>
                <TextInput variant="white" {...register(`locations.${index}.leaseProofOfOwnership` as Path<T>)} />
              </Field>
              <Field label="Pemilik Asli" required error={locationErrors?.leaseOriginalOwnerName?.message}>
                <TextInput variant="white" {...register(`locations.${index}.leaseOriginalOwnerName` as Path<T>)} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tanggal Mulai Sewa" required error={locationErrors?.leaseStartDate?.message}>
                <TextInput variant="white" type="date" {...register(`locations.${index}.leaseStartDate` as Path<T>)} />
              </Field>
              <Field label="Tanggal Berakhir Sewa" required error={locationErrors?.leaseEndDate?.message}>
                <TextInput variant="white" type="date" {...register(`locations.${index}.leaseEndDate` as Path<T>)} />
              </Field>
            </div>
            <Field label="Dokumen Pendukung Penguasaan" required error={locationErrors?.leaseDocuments?.message}>
              <Controller
                control={control}
                name={`locations.${index}.leaseDocuments` as Path<T>}
                render={({ field }) => {
                  const entries = (field.value as LocationLeaseDocEntry[] | undefined) ?? [];
                  return (
                    <div className="flex flex-col gap-3">
                      {LEASE_DOCUMENT_TYPES.map((type) => {
                        const entryIndex = entries.findIndex((e) => e.type === type);
                        const checked = entryIndex !== -1;
                        return (
                          <div key={type} className="rounded-lg border border-[#e8dccd] bg-white p-3">
                            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-[#261813]">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) => {
                                  if (next) field.onChange([...entries, { type, documentPath: undefined }]);
                                  else field.onChange(entries.filter((e) => e.type !== type));
                                }}
                              />
                              {LEASE_DOCUMENT_TYPE_LABELS[type]}
                            </label>
                            {checked && (
                              <div className="mt-3">
                                <FileUploadField
                                  namespace="temporary"
                                  value={entries[entryIndex]?.documentPath}
                                  onChange={(path) =>
                                    field.onChange(entries.map((e) => (e.type === type ? { ...e, documentPath: path } : e)))
                                  }
                                  label={`Upload ${LEASE_DOCUMENT_TYPE_LABELS[type]}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
            </Field>
          </div>
        ) : (
          <Field label="Dokumen Pendukung Kepemilikan" required error={locationErrors?.ownershipDocuments?.message}>
            <Controller
              control={control}
              name={`locations.${index}.ownershipDocuments` as Path<T>}
              render={({ field }) => {
                const entries = (field.value as LocationOwnershipDocEntry[] | undefined) ?? [];
                return (
                  <div className="flex flex-col gap-3">
                    {OWNERSHIP_DOCUMENT_TYPES.map((type) => {
                      const entryIndex = entries.findIndex((e) => e.type === type);
                      const checked = entryIndex !== -1;
                      return (
                        <div key={type} className="rounded-lg border border-[#e8dccd] bg-white p-3">
                          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-[#261813]">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) => {
                                if (next) field.onChange([...entries, { type, documentPath: undefined }]);
                                else field.onChange(entries.filter((e) => e.type !== type));
                              }}
                            />
                            {OWNERSHIP_DOCUMENT_TYPE_LABELS[type]}
                          </label>
                          {checked && (
                            <div className="mt-3">
                              <FileUploadField
                                namespace="temporary"
                                value={entries[entryIndex]?.documentPath}
                                onChange={(path) =>
                                  field.onChange(entries.map((e) => (e.type === type ? { ...e, documentPath: path } : e)))
                                }
                                label={`Upload ${OWNERSHIP_DOCUMENT_TYPE_LABELS[type]}`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
          </Field>
        )}
      </div>

      {locationType === "GUDANG" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#a68f80]">
            Tanda Daftar Gudang
          </h3>
          <Field label="Jenis Tanda Daftar Gudang" required error={locationErrors?.warehouseRegistrationType?.message}>
            <Controller
              control={control}
              name={`locations.${index}.warehouseRegistrationType` as Path<T>}
              render={({ field }) => (
                <div className="relative">
                  <select
                    value={(field.value as string) ?? ""}
                    onChange={(event) => field.onChange(event.target.value)}
                    className="w-full appearance-none rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 pr-8 text-[13px] text-[#261813] outline-none"
                  >
                    <option value="" disabled>
                      Pilih jenis tanda daftar gudang...
                    </option>
                    {WAREHOUSE_REGISTRATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {WAREHOUSE_REGISTRATION_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#a68f80]" />
                </div>
              )}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nomor Tanda Daftar Gudang" required error={locationErrors?.warehouseRegistrationNumber?.message}>
              <TextInput variant="white" {...register(`locations.${index}.warehouseRegistrationNumber` as Path<T>)} />
            </Field>
            <Field label="Nomor NIB Pemilik Gudang" error={locationErrors?.warehouseOwnerNibNumber?.message}>
              <TextInput variant="white" {...register(`locations.${index}.warehouseOwnerNibNumber` as Path<T>)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal Penerbitan" error={locationErrors?.warehouseRegistrationIssueDate?.message}>
              <TextInput variant="white" type="date" {...register(`locations.${index}.warehouseRegistrationIssueDate` as Path<T>)} />
            </Field>
            <Field label="Lembaga Penerbit" error={locationErrors?.warehouseRegistrationIssuingAuthority?.message}>
              <TextInput variant="white" {...register(`locations.${index}.warehouseRegistrationIssuingAuthority` as Path<T>)} />
            </Field>
          </div>
          <Controller
            control={control}
            name={`locations.${index}.warehouseRegistrationDocumentPath` as Path<T>}
            render={({ field }) => (
              <Field label="Upload Dokumen Tanda Daftar Gudang" error={locationErrors?.warehouseRegistrationDocumentPath?.message}>
                <FileUploadField
                  namespace="temporary"
                  value={field.value as string | undefined}
                  onChange={field.onChange}
                  label="Upload Dokumen Pendukung Tanda Daftar Gudang"
                />
              </Field>
            )}
          />
          <Controller
            control={control}
            name={`locations.${index}.warehouseLayoutDocumentPath` as Path<T>}
            render={({ field }) => (
              <Field label="Upload Layout Gudang" error={locationErrors?.warehouseLayoutDocumentPath?.message}>
                <FileUploadField
                  namespace="temporary"
                  value={field.value as string | undefined}
                  onChange={field.onChange}
                  label="Upload Layout Gudang"
                />
              </Field>
            )}
          />
        </div>
      )}
    </div>
  );
}

type LocationsFieldProps<T extends FormWithLocations> = {
  form: UseFormReturn<T>;
  availableTypes?: readonly LocationType[];
  typeHint?: string;
  /** When provided, each location card gets a "Sama dengan alamat perusahaan" checkbox that copies these values in. */
  companyAddress?: CompanyAddressValues;
};

export function LocationsField<T extends FormWithLocations>({
  form,
  availableTypes = LOCATION_TYPES,
  typeHint,
  companyAddress,
}: LocationsFieldProps<T>) {
  const { control, formState } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    name: "locations" as any,
  });
  const locationsError = formState.errors.locations as { message?: string } | undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg border border-[#b7cdf0] bg-[#eaf1fc] p-3 text-xs text-[#2f5fa8]">
        Tambahkan semua lokasi fasilitas perusahaan yang terkait dengan
        kegiatan usaha — termasuk kantor pusat, gudang, dan pabrik. Setiap
        lokasi diinput sebagai satu entri terpisah.
      </p>

      {fields.map((field, index) => (
        <LocationItemFields
          key={field.id}
          form={form}
          index={index}
          onRemove={() => remove(index)}
          canRemove={fields.length > 1}
          availableTypes={availableTypes}
          typeHint={typeHint}
          companyAddress={companyAddress}
        />
      ))}

      {locationsError?.message && (
        <p className="text-xs text-[#c1361f]">{locationsError.message}</p>
      )}

      <button
        type="button"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptyLocation() as any)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#e1bfb3] bg-white py-2.5 text-[13px] font-semibold text-[#e0662e]"
      >
        <Plus className="size-4" />
        Add Location
      </button>
    </div>
  );
}
