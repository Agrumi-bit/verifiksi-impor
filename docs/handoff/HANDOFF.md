# LPV TPT — Workspace Compliance (VIU)

Instruksi proyek untuk Claude Code. Baca file ini sebelum mengerjakan tugas apa pun di repo ini.

## Produk
Aplikasi web enterprise/government compliance berbahasa Indonesia untuk LPV TPT, modul
**VIU – Produk Tekstil sebagai Barang Konsumsi**. Ada dua area:

1. **Verifikator Workspace** – workflow verifikasi 11 tahap per permohonan.
2. **Compliance Workspace** – lapisan akhir: monitor → consolidate → trace → review → audit.
   Compliance **tidak** mengulang pekerjaan workspace lain.

Alur antar-workspace: Customer Relation → Surveyor → Verifikator → Technical Analyst → Project Manager → Compliance.

## Stack
- Vite + React 18 + TypeScript (strict)
- Tailwind CSS (token warna di `tailwind.config`), font Inter
- lucide-react untuk ikon
- React Router untuk routing
- State lokal (useState/useReducer) + mock data di `src/data/`. Tanpa backend dulu, tetapi akses data lewat
  lapisan `src/services/` (fungsi async) agar nanti mudah diganti API.
- Vitest + Testing Library untuk unit test rule engine.

## Referensi desain
Folder `design-reference/` berisi prototipe interaktif (format artboard `.dc.html`: markup inline-style +
`<script type="text/x-dc">` berisi logika). File ini **tidak bisa dijalankan langsung**. Gunakan sebagai sumber
kebenaran untuk layout, teks UI, data contoh, dan rule. Petakan `{{hole}}` → props/JSX, `<sc-if>` → kondisional,
`<sc-for>` → `.map()`, class `Component extends DCLogic` → komponen React + hooks.

| Route | File referensi | Tahap |
|---|---|---|
| `/verifikasi/:caseId/ringkasan` | Main.dc.html | 1 Ringkasan |
| `/verifikasi/:caseId/legalitas` | Legalitas.dc.html | 2 Perusahaan & Legalitas |
| `/verifikasi/:caseId/lokasi` | Lokasi.dc.html | 3 Lokasi |
| `/verifikasi/:caseId/merek` | Merek.dc.html | 4 Merek & Hubungan Importir |
| `/verifikasi/:caseId/rencana-impor` | RencanaImpor.dc.html | 5 Rencana Impor |
| `/verifikasi/:caseId/stok` | Stok.dc.html | 6 Stok Terkini |
| `/verifikasi/:caseId/uji-mutu` | UjiMutu.dc.html | 7 Uji Mutu |
| `/verifikasi/:caseId/label` | Label.dc.html | 8 Pernyataan Label |
| `/verifikasi/:caseId/modal-kerja` | ModalKerja.dc.html | 9 Modal Kerja |
| `/verifikasi/:caseId/review` | (belum ada desain) | 10 Review & Submit |
| `/verifikasi/:caseId/laporan` | (belum ada desain) | 11 Generate Laporan |
| `/compliance/*` | Compliance.dc.html | Dashboard, Daftar Permohonan, Workspace Results, Compliance Matrix, Temuan & Exception, Dossier, LHVIU, Audit Trail, Data Lineage, Riwayat Perubahan, Referensi, Pengaturan, Bantuan, Case Detail (11 tahap read-only) |

## Design tokens
Navy `#102A43` (sidebar) · Primary `#1677FF` · BG `#F5F7FA` · Card `#FFFFFF` · Border `#E5EAF0` ·
Text `#10233F` · Muted `#64748B` · Green `#16A34A` · Orange `#F59E0B` · Red `#DC2626` · Purple `#7C3AED` · Teal `#0F766E`.
rounded-xl, shadow halus, sticky table header, filter ringkas. Desktop-first, tetap rapi di tablet.

## Aturan domain (WAJIB, jangan dilanggar)
- **Jangan mengarang aturan regulasi.** Tidak ada modal minimum, stok minimum, OCR, atau kesimpulan label otomatis.
  Jika rujukan pasal tidak diketahui, tulis label netral ("Requirement Matrix VIU – …"), jangan nomor pasal karangan.
- Harga/nilai impor = **Data Pendukung**, tidak menentukan compliance.
- Coverage HS pada Uji Mutu = **Regulatory Traceability**, bukan syarat per HS.
- Sertifikat uji mutu per **merek × komoditas/subkomoditas**; usia 6 bulan dihitung terhadap **tanggal permohonan** (25 Jul 2025 pada data contoh).
- Label: **1 Surat Pernyataan per permohonan** + banyak dokumentasi label (checklist Lampiran II huruf H).
- Modal Kerja: **1 surat pernyataan per perusahaan**; nominal wajib tercantum; besaran nominal **tidak** memengaruhi compliance (checklist Lampiran II huruf I).
- Merek: rule engine `getRequiredDocuments(brand)` mengikuti Pasal 37 ayat 3–8 sesuai `Merek.dc.html`.
- Status engine vs override verifikator: tampilkan "Ditetapkan verifikator" jika di-override; override ke "Sesuai" diblokir bila ada kegagalan keras.
- Setiap perubahan dicatat di audit trail (waktu, user, teks).

## Aturan Compliance Workspace
- Tidak boleh ada: Buat Permohonan/Case, edit data pemohon, upload ulang evidence, survey, verifikasi teknis,
  approval PM, Generate/Approve/Publish LHVIU, delete case.
- Boleh: monitor, filter, export, assign PIC, mark for review, catat tindak lanjut temuan, minta klarifikasi ke workspace sumber.
- Handover:
  ```ts
  const allWorkspaceCompleted = (['customerRelation','surveyor','verifier','technicalAnalyst','projectManager'] as const)
    .every(k => c.workspaceStatus[k] === 'completed');
  // false → 'Menunggu Handover' (atau 'Handover Sebagian' bila ada workspace berstatus issue)
  // true  → 'Siap Konsolidasi' ; case Selesai → 'Handover Lengkap'
  ```
- Readiness: `waiting_handover` jika belum semua completed; `needs_follow_up` jika ada open issue/klarifikasi/conflict; selain itu `ready`.
- Compliance summary: 42 requirement = 40 requirement workspace (CR 6, SV 6, VF 20, TA 6, PM 2) + 2 administrative LPV.
- Resolved pada temuan wajib catatan ≥ 10 karakter.

## Konvensi kode
- Komponen per fitur di `src/features/<fitur>/`, komponen UI bersama di `src/components/ui/` (Badge, Card, DataTable, Drawer, Modal, Stepper, Tabs, Popover, EmptyState, Skeleton).
- Rule engine murni (tanpa React) di `src/domain/` dan wajib punya unit test.
- Semua teks UI berbahasa Indonesia; aksesibilitas: tombol asli, `aria-*`, fokus terlihat, dialog bisa ditutup Esc.
- Jalankan `npm run lint`, `npm run typecheck`, `npm test` sebelum menyatakan tugas selesai.
