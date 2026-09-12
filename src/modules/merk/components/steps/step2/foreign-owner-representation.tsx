"use client";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/form-field";
import {
  MERK_REPRESENTATION_TYPES,
  MERK_REPRESENTATION_TYPE_LABELS,
  MERK_REPRESENTATION_TYPE_DESCRIPTIONS,
  MERK_AGREEMENT_TYPES,
  MERK_AGREEMENT_TYPE_LABELS,
  MERK_APPOINTMENT_SOURCES,
  MERK_APPOINTMENT_SOURCE_LABELS,
  type MerkRepresentationType,
  type MerkAgreementType,
  type MerkAppointmentSource,
  type MerkWizardValues,
} from "../../../schema";
import { RadioCardGroup } from "./radio-card-group";
import { CompanySearchSelect } from "./company-search-select";
import { ApiuPlaceholderCard } from "./apiu-placeholder-card";

type Props = { form: UseFormReturn<MerkWizardValues> };

/** Step 3 (Perwakilan) — foreign branch: how the brand chosen in Step 2 is
 * represented in Indonesia. */
export function ForeignOwnerRepresentation({ form }: Props) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = form;
  const representationType = useWatch({ control, name: "representationType" }) as
    | MerkRepresentationType
    | undefined;
  const appointmentSource = useWatch({ control, name: "appointmentSource" }) as
    | MerkAppointmentSource
    | undefined;
  const agreementType = useWatch({ control, name: "agreementType" }) as MerkAgreementType | undefined;
  const ownerName = useWatch({ control, name: "ownerName" });

  function clearRepresentationFields() {
    setValue("agreementType", undefined);
    setValue("agreementNumber", "");
    setValue("agreementStartDate", "");
    setValue("agreementEndDate", "");
    setValue("officialRepresentativeCompanyId", "");
    setValue("appointmentSource", undefined);
    setValue("appointmentLetterNumber", "");
    setValue("appointmentStartDate", "");
    setValue("appointmentEndDate", "");
  }

  function selectRepresentationType(next: MerkRepresentationType) {
    clearRepresentationFields();
    if (next === "other_official_representative") {
      setValue("appointmentSource", "official_representative");
    }
    setValue("representationType", next, { shouldValidate: true });
  }

  function selectAppointmentSource(next: MerkAppointmentSource) {
    if (next === "brand_owner") setValue("officialRepresentativeCompanyId", "");
    setValue("appointmentSource", next, { shouldValidate: true });
  }

  return (
    <section>
      <p className="mb-3 text-sm font-semibold">Perwakilan di Indonesia</p>
      <FormField
        label="Bagaimana merek ini diwakili di Indonesia?"
        required
        error={errors.representationType?.message}
      >
        <RadioCardGroup
          value={representationType}
          onChange={selectRepresentationType}
          options={MERK_REPRESENTATION_TYPES.map((value) => ({
            value,
            label: MERK_REPRESENTATION_TYPE_LABELS[value],
            description: MERK_REPRESENTATION_TYPE_DESCRIPTIONS[value],
          }))}
        />
      </FormField>

      {/* B1 — API-U merupakan Perwakilan Resmi */}
      {representationType === "apiu_official_representative" && (
        <div className="mt-4 flex flex-col gap-3">
          <ApiuPlaceholderCard badge="API-U + Perwakilan Resmi" />
          <div className="rounded-lg border border-border p-3.5">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">Hubungan Lisensi</p>
            <FormField label="Jenis Perjanjian" required error={errors.agreementType?.message}>
              <RadioCardGroup<MerkAgreementType>
                value={agreementType}
                onChange={(v) => setValue("agreementType", v, { shouldValidate: true })}
                options={MERK_AGREEMENT_TYPES.map((value) => ({
                  value,
                  label: MERK_AGREEMENT_TYPE_LABELS[value],
                }))}
                columns={2}
              />
            </FormField>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FormField label="Nomor Perjanjian">
                <Input placeholder="Opsional" {...register("agreementNumber")} />
              </FormField>
              <div />
              <FormField label="Tanggal Berlaku">
                <Input type="date" {...register("agreementStartDate")} />
              </FormField>
              <FormField label="Tanggal Berakhir">
                <Input type="date" {...register("agreementEndDate")} />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* B2 — Perwakilan Resmi adalah perusahaan lain */}
      {representationType === "other_official_representative" && (
        <div className="mt-4 flex flex-col gap-3">
          <Controller
            control={control}
            name="officialRepresentativeCompanyId"
            render={({ field }) => (
              <CompanySearchSelect
                label="Perwakilan Resmi di Indonesia"
                required
                error={errors.officialRepresentativeCompanyId?.message}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Importir</p>
            <ApiuPlaceholderCard badge="API-U" />
          </div>

          <div className="rounded-lg border border-border p-3.5">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">
              Penunjukan Importir
            </p>
            <FormField label="Pemberi Penunjukan">
              <Input value={MERK_APPOINTMENT_SOURCE_LABELS.official_representative} disabled readOnly />
            </FormField>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FormField label="Nomor Surat Penunjukan Importir">
                <Input placeholder="Opsional" {...register("appointmentLetterNumber")} />
              </FormField>
              <div />
              <FormField label="Tanggal Berlaku">
                <Input type="date" {...register("appointmentStartDate")} />
              </FormField>
              <FormField label="Tanggal Berakhir">
                <Input type="date" {...register("appointmentEndDate")} />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* B3 — API-U hanya bertindak sebagai Importir */}
      {representationType === "appointed_importer" && (
        <div className="mt-4 flex flex-col gap-3">
          <FormField
            label="Penunjukan Importir Berasal Dari"
            required
            error={errors.appointmentSource?.message}
          >
            <RadioCardGroup
              value={appointmentSource}
              onChange={selectAppointmentSource}
              options={MERK_APPOINTMENT_SOURCES.map((value) => ({
                value,
                label: MERK_APPOINTMENT_SOURCE_LABELS[value],
              }))}
              columns={2}
            />
          </FormField>

          {appointmentSource === "brand_owner" && (
            <FormField label="Pemberi Penunjukan">
              <Input value={ownerName || "—"} disabled readOnly />
            </FormField>
          )}
          {appointmentSource === "official_representative" && (
            <Controller
              control={control}
              name="officialRepresentativeCompanyId"
              render={({ field }) => (
                <CompanySearchSelect
                  label="Perwakilan Resmi di Indonesia"
                  required
                  error={errors.officialRepresentativeCompanyId?.message}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          )}

          {appointmentSource && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nomor Surat Penunjukan">
                <Input placeholder="Opsional" {...register("appointmentLetterNumber")} />
              </FormField>
              <div />
              <FormField label="Tanggal Berlaku">
                <Input type="date" {...register("appointmentStartDate")} />
              </FormField>
              <FormField label="Tanggal Berakhir">
                <Input type="date" {...register("appointmentEndDate")} />
              </FormField>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
