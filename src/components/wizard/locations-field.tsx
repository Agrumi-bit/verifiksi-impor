"use client";

import {
  Controller,
  useFieldArray,
  useWatch,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { Building2, Factory, Plus, Trash2, Warehouse } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form/form-field";
import { SelectableCard } from "@/components/form/selectable-card";
import { FileUploadField } from "@/components/form/file-upload-field";
import {
  LOCATION_TYPES,
  WAREHOUSE_REGISTRATION_TYPES,
  createEmptyLocation,
  type LocationType,
  type LocationValues,
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

type LocationItemProps<T extends FormWithLocations> = {
  form: UseFormReturn<T>;
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  availableTypes: readonly LocationType[];
  typeHint?: string;
};

function LocationItemFields<T extends FormWithLocations>({
  form,
  index,
  onRemove,
  canRemove,
  availableTypes,
  typeHint,
}: LocationItemProps<T>) {
  const { control, register, formState } = form;
  const locationErrors = (formState.errors.locations as { message?: string }[] | undefined)?.[
    index
  ] as Record<string, { message?: string } | undefined> | undefined;

  const locationType = useWatch({
    control,
    name: `locations.${index}.locationType` as Path<T>,
  }) as LocationType | undefined;
  const buildingStatus = useWatch({
    control,
    name: `locations.${index}.buildingStatus` as Path<T>,
  }) as LocationValues["buildingStatus"] | undefined;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Lokasi Baru</p>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Hapus
          </Button>
        )}
      </div>

      <FormField
        label="Location Type"
        required
        error={locationErrors?.locationType?.message}
        hint={typeHint}
      >
        <Controller
          control={control}
          name={`locations.${index}.locationType` as Path<T>}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {availableTypes.map((type) => {
                const meta = LOCATION_TYPE_META[type];
                const Icon = meta.icon;
                return (
                  <SelectableCard
                    key={type}
                    selected={field.value === type}
                    onSelect={() => field.onChange(type)}
                    className="items-center gap-1 py-3 text-center"
                  >
                    <Icon className="size-4" />
                    <span className="text-xs font-medium">{meta.label}</span>
                  </SelectableCard>
                );
              })}
            </div>
          )}
        />
      </FormField>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Address Information
        </h3>
        <FormField label="Address" required error={locationErrors?.address?.message}>
          <Input
            placeholder="e.g. Jl. Industri Raya No. 15, Kawasan Industri Cimahi"
            {...register(`locations.${index}.address` as Path<T>)}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="City" required error={locationErrors?.city?.message}>
            <Input placeholder="e.g. Cimahi" {...register(`locations.${index}.city` as Path<T>)} />
          </FormField>
          <FormField label="Province" required error={locationErrors?.province?.message}>
            <Input
              placeholder="Pilih Provinsi..."
              {...register(`locations.${index}.province` as Path<T>)}
            />
          </FormField>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Country" required error={locationErrors?.country?.message}>
            <Input {...register(`locations.${index}.country` as Path<T>)} />
          </FormField>
          <FormField label="Postal Code" required error={locationErrors?.postalCode?.message}>
            <Input
              placeholder="e.g. 40535"
              {...register(`locations.${index}.postalCode` as Path<T>)}
            />
          </FormField>
        </div>
      </div>

      <FormField
        label="Google Maps Link"
        error={locationErrors?.googleMapsLink?.message}
        hint="Link Google Maps sangat membantu saat proses verifikasi lapangan."
      >
        <Input
          placeholder="https://maps.google.com/xxxxx"
          {...register(`locations.${index}.googleMapsLink` as Path<T>)}
        />
      </FormField>

      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Status Bangunan
        </h3>
        <Controller
          control={control}
          name={`locations.${index}.buildingStatus` as Path<T>}
          render={({ field }) => (
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
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
                      ? "bg-amber-500 px-3 py-2 text-sm font-medium text-white"
                      : "bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50"
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
              <FormField label="Bukti Kepemilikan" error={locationErrors?.leaseProofOfOwnership?.message}>
                <Input {...register(`locations.${index}.leaseProofOfOwnership` as Path<T>)} />
              </FormField>
              <FormField
                label="Pemilik Asli"
                required
                error={locationErrors?.leaseOriginalOwnerName?.message}
              >
                <Input {...register(`locations.${index}.leaseOriginalOwnerName` as Path<T>)} />
              </FormField>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Tanggal Mulai Sewa"
                required
                error={locationErrors?.leaseStartDate?.message}
              >
                <Input type="date" {...register(`locations.${index}.leaseStartDate` as Path<T>)} />
              </FormField>
              <FormField
                label="Tanggal Berakhir Sewa"
                required
                error={locationErrors?.leaseEndDate?.message}
              >
                <Input type="date" {...register(`locations.${index}.leaseEndDate` as Path<T>)} />
              </FormField>
            </div>
            <Controller
              control={control}
              name={`locations.${index}.leaseDocumentPath` as Path<T>}
              render={({ field }) => (
                <FormField
                  label="Upload Dokumen Pendukung Kepemilikan"
                  required
                  error={locationErrors?.leaseDocumentPath?.message}
                >
                  <FileUploadField
                    namespace="temporary"
                    value={field.value as string | undefined}
                    onChange={field.onChange}
                    label="Upload Dokumen Pendukung Kepemilikan"
                  />
                </FormField>
              )}
            />
          </div>
        ) : (
          <Controller
            control={control}
            name={`locations.${index}.ownershipDocumentPath` as Path<T>}
            render={({ field }) => (
              <FormField
                label="Upload Dokumen Pendukung Kepemilikan"
                required
                error={locationErrors?.ownershipDocumentPath?.message}
              >
                <FileUploadField
                  namespace="temporary"
                  value={field.value as string | undefined}
                  onChange={field.onChange}
                  label="Upload Dokumen Pendukung Kepemilikan"
                />
              </FormField>
            )}
          />
        )}
      </div>

      {locationType === "GUDANG" && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tanda Daftar Gudang
          </h3>
          <FormField
            label="Jenis Tanda Daftar Gudang"
            required
            error={locationErrors?.warehouseRegistrationType?.message}
          >
            <Controller
              control={control}
              name={`locations.${index}.warehouseRegistrationType` as Path<T>}
              render={({ field }) => (
                <Select value={(field.value as string) ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        (value &&
                          WAREHOUSE_REGISTRATION_LABELS[
                            value as (typeof WAREHOUSE_REGISTRATION_TYPES)[number]
                          ]) ||
                        "Pilih jenis tanda daftar gudang..."
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {WAREHOUSE_REGISTRATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {WAREHOUSE_REGISTRATION_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Nomor Tanda Daftar Gudang"
              required
              error={locationErrors?.warehouseRegistrationNumber?.message}
            >
              <Input {...register(`locations.${index}.warehouseRegistrationNumber` as Path<T>)} />
            </FormField>
            <FormField
              label="Nomor NIB Pemilik Gudang"
              error={locationErrors?.warehouseOwnerNibNumber?.message}
            >
              <Input {...register(`locations.${index}.warehouseOwnerNibNumber` as Path<T>)} />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              label="Tanggal Penerbitan"
              error={locationErrors?.warehouseRegistrationIssueDate?.message}
            >
              <Input
                type="date"
                {...register(`locations.${index}.warehouseRegistrationIssueDate` as Path<T>)}
              />
            </FormField>
            <FormField
              label="Lembaga Penerbit"
              error={locationErrors?.warehouseRegistrationIssuingAuthority?.message}
            >
              <Input
                {...register(
                  `locations.${index}.warehouseRegistrationIssuingAuthority` as Path<T>,
                )}
              />
            </FormField>
          </div>
          <Controller
            control={control}
            name={`locations.${index}.warehouseRegistrationDocumentPath` as Path<T>}
            render={({ field }) => (
              <FormField
                label="Upload Dokumen Tanda Daftar Gudang"
                error={locationErrors?.warehouseRegistrationDocumentPath?.message}
              >
                <FileUploadField
                  namespace="temporary"
                  value={field.value as string | undefined}
                  onChange={field.onChange}
                  label="Upload Dokumen Pendukung Tanda Daftar Gudang"
                />
              </FormField>
            )}
          />
          <Controller
            control={control}
            name={`locations.${index}.warehouseLayoutDocumentPath` as Path<T>}
            render={({ field }) => (
              <FormField
                label="Upload Layout Gudang"
                error={locationErrors?.warehouseLayoutDocumentPath?.message}
              >
                <FileUploadField
                  namespace="temporary"
                  value={field.value as string | undefined}
                  onChange={field.onChange}
                  label="Upload Layout Gudang"
                />
              </FormField>
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
};

export function LocationsField<T extends FormWithLocations>({
  form,
  availableTypes = LOCATION_TYPES,
  typeHint,
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
      <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
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
        />
      ))}

      {locationsError?.message && (
        <p className="text-xs text-destructive">{locationsError.message}</p>
      )}

      <Button
        type="button"
        variant="outline"
        className="border-dashed"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onClick={() => append(createEmptyLocation() as any)}
      >
        <Plus className="size-4" />
        Add Location
      </Button>
    </div>
  );
}
