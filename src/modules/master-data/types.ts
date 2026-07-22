export type MasterDataFieldType = "text" | "textarea" | "select";

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
