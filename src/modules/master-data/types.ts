export type MasterDataFieldType = "text" | "textarea" | "select" | "searchselect" | "checkbox";

export type MasterDataFieldOption = {
  value: string;
  label: string;
};

export type MasterDataField = {
  key: string;
  label: string;
  type: MasterDataFieldType;
  required?: boolean;
  placeholder?: string;
  options?: MasterDataFieldOption[];
  /** For a cascading select/searchselect — the key of the field this one's option list depends
   * on (e.g. "Sub Kelompok Komoditas" depends on "Kelompok Komoditas"). When set, `optionsFor`
   * is used instead of the static `options`, the field is disabled until the parent has a value,
   * and changing the parent clears this field's current selection (it may no longer be valid). */
  dependsOn?: string;
  optionsFor?: (parentValue: string) => MasterDataFieldOption[];
  /** Derives this field's initial value from the full row when editing, for fields whose value
   * isn't a direct column on the row (e.g. a cascading parent filter reconstructed from a nested
   * relation like `row.commodityGroup.industryGroupId`). Falls back to `row[field.key]` when
   * omitted. */
  deriveInitialValue?: (row: MasterDataRow) => string;
};

export type MasterDataColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => string;
};

export type MasterDataRow = Record<string, unknown> & {
  id: string;
  status: "ACTIVE" | "INACTIVE";
};
