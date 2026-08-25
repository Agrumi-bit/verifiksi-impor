"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { Field, TextInput } from "@/modules/company/components/wizard-ui";

type RegionOption = { id: number; name: string };
type SubdistrictOption = { id: string; name: string; postalCode: string };

function useRegionOptions<TOption>(url: string | null, queryKey: unknown[]) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(url as string);
      if (!response.ok) throw new Error("Gagal memuat data wilayah");
      const json = (await response.json()) as { data: TOption[] };
      return json.data;
    },
    enabled: Boolean(url),
  });
}

function RegionSelect({
  label,
  required,
  error,
  value,
  onChange,
  options,
  disabled,
  placeholder,
  isLoading,
}: {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: number | string; name: string }[];
  disabled?: boolean;
  placeholder: string;
  isLoading?: boolean;
}) {
  return (
    <Field label={label} required={required} error={error}>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border border-[#e8dccd] bg-white px-3 py-2.5 pr-8 text-[13px] text-[#261813] outline-none disabled:bg-[#f7f2ec] disabled:text-[#a68f80]"
        >
          <option value="">{isLoading ? "Memuat..." : placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#a68f80]" />
      </div>
    </Field>
  );
}

type RegionCascadeFieldsProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  provinceFieldName: Path<T>;
  cityFieldName: Path<T>;
  districtFieldName: Path<T>;
  subdistrictFieldName: Path<T>;
  postalCodeFieldName: Path<T>;
  errors?: {
    province?: string;
    city?: string;
    district?: string;
    subdistrict?: string;
    postalCode?: string;
  };
};

/**
 * Four cascading selects (Provinsi -> Kota/Kabupaten -> Kecamatan -> Desa/Kelurahan) backed by
 * the seeded `IndonesiaRegion` table, plus a Kode Pos field that auto-fills from the selected
 * desa/kelurahan (still editable afterward — a subdistrict can legitimately have more than one
 * postal code, so the auto-filled value is a starting point, not a lock). Only resolved NAME
 * strings are written into the form fields, not the region table's own ids — matches what every
 * existing consumer (reports, verifikator views, etc.) already expects.
 */
export function RegionCascadeFields<T extends FieldValues>({
  form,
  provinceFieldName,
  cityFieldName,
  districtFieldName,
  subdistrictFieldName,
  postalCodeFieldName,
  errors,
}: RegionCascadeFieldsProps<T>) {
  const { setValue, register } = form;
  const [provinceId, setProvinceId] = useState("");
  const [cityId, setCityId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [subdistrictRowId, setSubdistrictRowId] = useState("");

  const setOpts = { shouldValidate: true, shouldDirty: true } as const;

  const provincesQuery = useRegionOptions<RegionOption>("/api/master-data/regions/provinces", ["regions", "provinces"]);
  const citiesQuery = useRegionOptions<RegionOption>(
    provinceId ? `/api/master-data/regions/cities?provinceId=${provinceId}` : null,
    ["regions", "cities", provinceId],
  );
  const districtsQuery = useRegionOptions<RegionOption>(
    cityId ? `/api/master-data/regions/districts?cityId=${cityId}` : null,
    ["regions", "districts", cityId],
  );
  const subdistrictsQuery = useRegionOptions<SubdistrictOption>(
    districtId ? `/api/master-data/regions/subdistricts?districtId=${districtId}` : null,
    ["regions", "subdistricts", districtId],
  );

  function handleProvinceChange(value: string) {
    setProvinceId(value);
    setCityId("");
    setDistrictId("");
    setSubdistrictRowId("");
    const name = provincesQuery.data?.find((o) => String(o.id) === value)?.name ?? "";
    setValue(provinceFieldName, name as never, setOpts);
    setValue(cityFieldName, "" as never, setOpts);
    setValue(districtFieldName, "" as never, setOpts);
    setValue(subdistrictFieldName, "" as never, setOpts);
    setValue(postalCodeFieldName, "" as never, setOpts);
  }

  function handleCityChange(value: string) {
    setCityId(value);
    setDistrictId("");
    setSubdistrictRowId("");
    const name = citiesQuery.data?.find((o) => String(o.id) === value)?.name ?? "";
    setValue(cityFieldName, name as never, setOpts);
    setValue(districtFieldName, "" as never, setOpts);
    setValue(subdistrictFieldName, "" as never, setOpts);
    setValue(postalCodeFieldName, "" as never, setOpts);
  }

  function handleDistrictChange(value: string) {
    setDistrictId(value);
    setSubdistrictRowId("");
    const name = districtsQuery.data?.find((o) => String(o.id) === value)?.name ?? "";
    setValue(districtFieldName, name as never, setOpts);
    setValue(subdistrictFieldName, "" as never, setOpts);
    setValue(postalCodeFieldName, "" as never, setOpts);
  }

  function handleSubdistrictChange(value: string) {
    setSubdistrictRowId(value);
    const option = subdistrictsQuery.data?.find((o) => o.id === value);
    setValue(subdistrictFieldName, (option?.name ?? "") as never, setOpts);
    setValue(postalCodeFieldName, (option?.postalCode ?? "") as never, setOpts);
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <RegionSelect
          label="Provinsi"
          required
          error={errors?.province}
          value={provinceId}
          onChange={handleProvinceChange}
          options={provincesQuery.data ?? []}
          isLoading={provincesQuery.isLoading}
          placeholder="Pilih Provinsi..."
        />
        <RegionSelect
          label="Kota / Kabupaten"
          required
          error={errors?.city}
          value={cityId}
          onChange={handleCityChange}
          options={citiesQuery.data ?? []}
          disabled={!provinceId}
          isLoading={citiesQuery.isLoading}
          placeholder={provinceId ? "Pilih Kota/Kabupaten..." : "Pilih Provinsi dahulu"}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RegionSelect
          label="Kecamatan"
          required
          error={errors?.district}
          value={districtId}
          onChange={handleDistrictChange}
          options={districtsQuery.data ?? []}
          disabled={!cityId}
          isLoading={districtsQuery.isLoading}
          placeholder={cityId ? "Pilih Kecamatan..." : "Pilih Kota/Kabupaten dahulu"}
        />
        <RegionSelect
          label="Desa / Kelurahan"
          required
          error={errors?.subdistrict}
          value={subdistrictRowId}
          onChange={handleSubdistrictChange}
          options={subdistrictsQuery.data ?? []}
          disabled={!districtId}
          isLoading={subdistrictsQuery.isLoading}
          placeholder={districtId ? "Pilih Desa/Kelurahan..." : "Pilih Kecamatan dahulu"}
        />
      </div>
      <div className="sm:w-1/2 sm:pr-1.5">
        <Field label="Kode Pos" required error={errors?.postalCode} hint="Terisi otomatis, bisa disesuaikan bila perlu.">
          <TextInput variant="white" placeholder="e.g. 40122" {...register(postalCodeFieldName)} />
        </Field>
      </div>
    </>
  );
}
