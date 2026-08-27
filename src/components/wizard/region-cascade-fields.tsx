"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useWatch, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

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

// Real company addresses were typed freely before this region database existed, so they carry
// noise the clean seeded names don't: administrative prefixes ("Kab. Boyolali"), trailing
// punctuation ("Penggung,"), and inconsistent spacing ("Teluk Naga" vs seeded "TELUKNAGA"). A
// plain case-insensitive equals only matches the lucky cases (simple province names); this
// strips prefixes/punctuation/whitespace so "Sama dengan alamat perusahaan" can actually resolve
// the dropdowns for real, messy, pre-existing data instead of just the street-address text field.
function normalizeRegionName(value: string): string {
  return value
    .toUpperCase()
    .replace(/^(KABUPATEN|KAB\.?|KOTA|KECAMATAN|KEC\.?|KELURAHAN|KEL\.?|DESA)\s+/, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, "");
}

function sameName(a: string | undefined, b: string | undefined): boolean {
  return Boolean(a) && Boolean(b) && normalizeRegionName(a!) === normalizeRegionName(b!);
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
 * desa/kelurahan (still editable afterward). Only resolved NAME strings live in the form
 * fields — the selected id at each level is derived from those names against the currently
 * loaded options rather than tracked as separate local state, so the dropdowns stay correct
 * even when something else writes into the form directly (e.g. the "Sama dengan alamat
 * perusahaan" checkbox calling `setValue`) instead of going through these selects' own
 * `onChange`. A `useEffect` + `setState` chain would do the same resolution one render late
 * per level and trips the project's `react-hooks/set-state-in-effect` lint rule; deriving
 * during render avoids both problems.
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
  const { setValue, register, control } = form;
  const setOpts = { shouldValidate: true, shouldDirty: true } as const;

  const watchedProvinceName = useWatch({ control, name: provinceFieldName }) as unknown as string | undefined;
  const watchedCityName = useWatch({ control, name: cityFieldName }) as unknown as string | undefined;
  const watchedDistrictName = useWatch({ control, name: districtFieldName }) as unknown as string | undefined;
  const watchedSubdistrictName = useWatch({ control, name: subdistrictFieldName }) as unknown as string | undefined;
  const watchedPostalCode = useWatch({ control, name: postalCodeFieldName }) as unknown as string | undefined;

  const provincesQuery = useRegionOptions<RegionOption>("/api/master-data/regions/provinces", ["regions", "provinces"]);
  const provinceId = provincesQuery.data?.find((o) => sameName(o.name, watchedProvinceName))?.id;
  const provinceIdStr = provinceId != null ? String(provinceId) : "";

  const citiesQuery = useRegionOptions<RegionOption>(
    provinceIdStr ? `/api/master-data/regions/cities?provinceId=${provinceIdStr}` : null,
    ["regions", "cities", provinceIdStr],
  );
  const cityId = citiesQuery.data?.find((o) => sameName(o.name, watchedCityName))?.id;
  const cityIdStr = cityId != null ? String(cityId) : "";

  const districtsQuery = useRegionOptions<RegionOption>(
    cityIdStr ? `/api/master-data/regions/districts?cityId=${cityIdStr}` : null,
    ["regions", "districts", cityIdStr],
  );
  const districtId = districtsQuery.data?.find((o) => sameName(o.name, watchedDistrictName))?.id;
  const districtIdStr = districtId != null ? String(districtId) : "";

  const subdistrictsQuery = useRegionOptions<SubdistrictOption>(
    districtIdStr ? `/api/master-data/regions/subdistricts?districtId=${districtIdStr}` : null,
    ["regions", "subdistricts", districtIdStr],
  );
  const subdistrictRow =
    subdistrictsQuery.data?.find((o) => sameName(o.name, watchedSubdistrictName) && o.postalCode === watchedPostalCode) ??
    subdistrictsQuery.data?.find((o) => sameName(o.name, watchedSubdistrictName));
  const subdistrictRowId = subdistrictRow?.id ?? "";

  function handleProvinceChange(value: string) {
    const name = provincesQuery.data?.find((o) => String(o.id) === value)?.name ?? "";
    setValue(provinceFieldName, name as never, setOpts);
    setValue(cityFieldName, "" as never, setOpts);
    setValue(districtFieldName, "" as never, setOpts);
    setValue(subdistrictFieldName, "" as never, setOpts);
    setValue(postalCodeFieldName, "" as never, setOpts);
  }

  function handleCityChange(value: string) {
    const name = citiesQuery.data?.find((o) => String(o.id) === value)?.name ?? "";
    setValue(cityFieldName, name as never, setOpts);
    setValue(districtFieldName, "" as never, setOpts);
    setValue(subdistrictFieldName, "" as never, setOpts);
    setValue(postalCodeFieldName, "" as never, setOpts);
  }

  function handleDistrictChange(value: string) {
    const name = districtsQuery.data?.find((o) => String(o.id) === value)?.name ?? "";
    setValue(districtFieldName, name as never, setOpts);
    setValue(subdistrictFieldName, "" as never, setOpts);
    setValue(postalCodeFieldName, "" as never, setOpts);
  }

  function handleSubdistrictChange(value: string) {
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
          value={provinceIdStr}
          onChange={handleProvinceChange}
          options={provincesQuery.data ?? []}
          isLoading={provincesQuery.isLoading}
          placeholder="Pilih Provinsi..."
        />
        <RegionSelect
          label="Kota / Kabupaten"
          required
          error={errors?.city}
          value={cityIdStr}
          onChange={handleCityChange}
          options={citiesQuery.data ?? []}
          disabled={!provinceIdStr}
          isLoading={citiesQuery.isLoading}
          placeholder={provinceIdStr ? "Pilih Kota/Kabupaten..." : "Pilih Provinsi dahulu"}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RegionSelect
          label="Kecamatan"
          required
          error={errors?.district}
          value={districtIdStr}
          onChange={handleDistrictChange}
          options={districtsQuery.data ?? []}
          disabled={!cityIdStr}
          isLoading={districtsQuery.isLoading}
          placeholder={cityIdStr ? "Pilih Kecamatan..." : "Pilih Kota/Kabupaten dahulu"}
        />
        <RegionSelect
          label="Desa / Kelurahan"
          required
          error={errors?.subdistrict}
          value={subdistrictRowId}
          onChange={handleSubdistrictChange}
          options={subdistrictsQuery.data ?? []}
          disabled={!districtIdStr}
          isLoading={subdistrictsQuery.isLoading}
          placeholder={districtIdStr ? "Pilih Desa/Kelurahan..." : "Pilih Kecamatan dahulu"}
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
