# Urutan perintah untuk Claude Code di VS Code

Jalankan satu per satu. Tunggu tiap tahap selesai dan cek di browser (`npm run dev`) sebelum lanjut.

---

## 0. Rencana (pakai Plan Mode / Shift+Tab sampai "plan mode")
```
Baca CLAUDE.md dan semua file di design-reference/. Buat rencana implementasi bertahap
untuk aplikasi ini (struktur folder, routing, komponen UI bersama, model data TypeScript,
rule engine di src/domain, mock data). Jangan menulis kode dulu, tampilkan rencananya.
```

## 1. Scaffold
```
Buat proyek Vite + React + TypeScript di folder ini sesuai CLAUDE.md: Tailwind (dengan design token),
lucide-react, React Router, ESLint, Vitest + Testing Library. Tambahkan script lint, typecheck, test.
Pastikan npm run dev, npm run typecheck, dan npm test berjalan.
```

## 2. App shell & komponen UI bersama
```
Implementasikan app shell (sidebar navy, top bar dengan breadcrumb, notifikasi, avatar) dan komponen
UI bersama di src/components/ui (Badge, Card, DataTable dengan sticky header, Drawer, Modal, Tabs,
Popover, Stepper 11 tahap, EmptyState, Skeleton). Ikuti tampilan di design-reference/Main.dc.html
dan Compliance.dc.html.
```

## 3. Model data & mock
```
Buat tipe TypeScript dan mock data di src/data serta service async di src/services berdasarkan data
contoh di design-reference (case VIU-2025-000123 PT Maju Tekstil Indonesia, merek, rencana impor,
stok, sertifikat, label, modal kerja, serta 128 permohonan Compliance). Portkan generator data
deterministik dari Compliance.dc.html.
```

## 4. Workflow Verifikator (ulangi per tahap)
```
Implementasikan tahap 1 Ringkasan (/verifikasi/:caseId/ringkasan) persis seperti
design-reference/Main.dc.html, termasuk mode edit, validasi, dan navigasi ke tahap 2.
```
Lanjutkan dengan prompt yang sama untuk: Legalitas → Lokasi → Merek → RencanaImpor → Stok →
UjiMutu → Label → ModalKerja. Untuk tahap dengan rule engine tambahkan:
```
Pindahkan logika rule (mis. getRequiredDocuments, evaluatePlan, getStockComplianceStatus,
getCertificateAge/evaluateCert, getLabelComplianceStatus, getWorkingCapitalCompliance) ke
src/domain sebagai fungsi murni dan buat unit test untuk setiap cabang rule-nya.
```

## 5. Compliance Workspace
```
Implementasikan Compliance Workspace dari design-reference/Compliance.dc.html, mulai dari halaman
Daftar Permohonan (/compliance/permohonan): summary cards, filter + filter lanjutan, quick chips,
tabel 13 kolom (mode Table/Compact), sorting, paginasi, bulk action, popover issue, menu baris,
quick drawer Ringkasan Case, skeleton & empty state. Logika handover & readiness di src/domain
dengan unit test.
```
Kemudian:
```
Lanjutkan halaman Compliance lain: Dashboard, Workspace Results, Compliance Matrix, Temuan & Exception
(dengan tindak lanjut), Dossier, LHVIU & Final Output, Audit Trail, Data Lineage, Riwayat Perubahan,
Referensi, Pengaturan, Bantuan, dan Compliance Case Detail 11 tahap read-only dengan source badge.
```

## 6. Verifikasi akhir
```
Jalankan lint, typecheck, dan test, perbaiki semua error. Lalu periksa setiap route dan pastikan
tidak ada tombol yang dilarang di CLAUDE.md (Buat Permohonan, Approve, Generate LHVIU, Delete, dll).
```

## Tips
- Satu tahap per prompt; minta Claude menampilkan diff sebelum menerima.
- Jika hasil melenceng: "Bandingkan dengan design-reference/<file> dan samakan layout/teksnya."
- Commit git setelah tiap tahap berhasil.
