/**
 * Merk (brand) management is exposed on two surfaces that share the `Merk` model:
 *
 *  - Internal staff dashboard (`/mitra/merk`) — unscoped, sees every company's brands.
 *  - Company self-service workspace (`/company-workspace/supporting/brands`) — scoped
 *    to the signed-in user's `companyId` by the API.
 *
 * The table, wizard, and detail components are identical between the two; only the
 * endpoints, routes, and copy differ. Those differences live here so the components
 * stay generic and there is exactly one implementation of each.
 */
export type MerkSurface = {
  /** Base path for list `GET ${apiBase}` and per-row `PATCH ${apiBase}/${id}`. */
  apiBase: string;
  /** Route of the list page (used as the wizard/detail "back" target). */
  listHref: string;
  /** Route of the "new brand" wizard page. */
  newHref: string;
  /** When set, table rows link to `${detailHrefBase}/${id}`; when null, no detail link. */
  detailHrefBase: string | null;
  title: string;
  description: string | null;
  newLabel: string;
  wizardSubtitle: string;
  /** Gates Brand Detail's "Audit" tab — permission-based, not a second RBAC
   * system: platform staff can see field-level change history, a company
   * user cannot. */
  showAudit: boolean;
  /** Shows the "Perusahaan" column on the brand list — meaningless on the
   * Company surface, where every row is already the caller's own company. */
  showCompanyColumn: boolean;
};

export const INTERNAL_MERK_SURFACE: MerkSurface = {
  apiBase: "/api/merk",
  listHref: "/mitra/merk",
  newHref: "/mitra/merk/new",
  detailHrefBase: "/mitra/merk",
  title: "Merk",
  description: null,
  newLabel: "+ Tambah Merek",
  wizardSubtitle: "Tambah Merek Baru",
  showAudit: true,
  showCompanyColumn: true,
};

export const COMPANY_BRAND_SURFACE: MerkSurface = {
  apiBase: "/api/company-workspace/brands",
  listHref: "/company-workspace/supporting/brands",
  newHref: "/company-workspace/supporting/brands/new",
  // Company users may view their own brand's detail (read-only sections plus
  // permitted edit actions) — the Audit tab there hides itself, admin-only.
  detailHrefBase: "/company-workspace/supporting/brands",
  title: "Brand Management",
  description:
    "Daftar merek produk tekstil yang terdaftar untuk perusahaan Anda.",
  newLabel: "+ Register New Brand",
  wizardSubtitle: "Register New Brand",
  showAudit: false,
  showCompanyColumn: false,
};
