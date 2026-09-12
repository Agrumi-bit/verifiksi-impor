"use client";

import { FormField } from "@/components/form/form-field";
import { SearchSelectInput } from "@/components/form/search-select-input";
import { useActiveBrandOwners } from "@/modules/master-data/use-active-brand-owners";

type Props = {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
};

/**
 * Reusable searchable company selector for Step 2 — backed by the
 * BrandOwner registry (see MEMORY: this codebase's "Company Master" search
 * for brand ownership/representation is BrandOwner, not the Company table —
 * BrandOwner rows are frequently foreign/unaffiliated companies with no
 * Company Workspace account). Shows a read-only summary once a company is
 * selected, matching every "read-only company summary, don't let the user
 * edit Company Master fields here" note in the Step 2 spec.
 *
 * TODO(company-master): the spec calls for searching by company name *and
 * NIB*, and displaying NIB/Alamat/Status in the summary. BrandOwner has no
 * NIB/address/status-beyond-active-inactive — those fields belong to the
 * real Company Master. Swap the `useActiveBrandOwners` call for a real
 * Company Master search once that integration exists for this flow.
 */
export function CompanySearchSelect({ label, value, onChange, required, error, hint }: Props) {
  const { options, isLoading } = useActiveBrandOwners();
  const selected = options.find((o) => o.value === value);

  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <SearchSelectInput
        value={value ?? ""}
        onChange={onChange}
        options={options}
        allowFreeText={false}
        placeholder={isLoading ? "Memuat perusahaan..." : "Cari berdasarkan nama perusahaan atau kota..."}
      />
      {value && !selected && !isLoading && (
        <p className="mt-1.5 text-xs text-muted-foreground">Perusahaan tidak ditemukan.</p>
      )}
      {selected && (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
          <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Nama Perusahaan</dt>
              <dd className="font-semibold">{selected.label}</dd>
            </div>
            {selected.hint && (
              <div>
                <dt className="text-muted-foreground">Kota</dt>
                <dd className="font-medium">{selected.hint}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </FormField>
  );
}
