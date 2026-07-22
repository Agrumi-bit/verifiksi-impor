# Spesifikasi Platform Verifikasi & Survey (VKI/VIU)

> Disarikan dari riwayat prompt desain di Figma Make (`verifikasiplatform.make`, diekspor 2026-07-19). Dokumen ini adalah acuan requirement, bukan hasil rekayasa — isinya murni dari instruksi yang sudah diberikan saat mendesain platform ini.

## Ringkasan

Platform untuk lembaga verifikasi & survey yang menangani dua jenis verifikasi:

- **VKI** — Verifikasi Kemampuan Industri
- **VIU** — Verifikasi Importir Umum

## Struktur Menu Utama

```
Dashboard

Application Management
   ├ Application Dashboard
   ├ Create New Application
   ├ Application List
   ├ Application Review
   ├ Application Detail
   └ Application Status

VIU Management
   ├ Application List
   ├ Verification Assignment
   ├ Verification Schedule
   ├ Verification Document
   ├ On Site Verification
   ├ Validation
   ├ Supporting Documents Management
   └ Report

VKI Management
   (struktur sub-menu sama dengan VIU Management)

Mitra Management
   ├ Mitra Industri
   ├ Mitra Non Industri
   ├ Mitra Verification
   └ Merk

Company Management
   ├ Company Registry
   ├ Add New Company (multi-step wizard)
   └ Company Detail

User Management
   ├ User List
   ├ Add User
   ├ Role Management
   └ Permission Management

System Configuration
   ├ HS Code Master Data
   ├ KBLI Master Data
   ├ Commodity Classification
   ├ Unit of Measurement
   ├ Notification & Communication
   └ Application Setting
```

## Role Pengguna

- Super Admin
- Admin
- Surveyor
- Verifikator
- Technical Analyst
- Compliance
- Project Manager
- Perusahaan (Company) — akses eksternal untuk pemohon
- Government

Login page menyediakan profil terpisah untuk **Company** dan **Internal User** (Surveyor, Verifikator, Technical Analyst, Project Manager, Customer Relationship, Compliance, Super Admin, Government).

## Referensi Visual

Screenshot asli dari Figma Make (dilampirkan langsung selama sesi desain) ada di [docs/design-reference/](design-reference/):

| File | Isi |
|---|---|
| `login-page.png` | Halaman login "VKI & VIU Platform" |
| `wizard-step1-application-information.png` | Step 1 — pemilihan tipe verifikasi (VKI/VIU), kategori aplikasi, jenis impor |
| `wizard-step2-company-information.png` | Step 2 — Company Profile & Contact Information |
| `wizard-step3-legal-information.png` | Step 3 — NIB, KBLI, Notarial Deed |
| `wizard-step3-kbli-search-widget.png` | Step 3 — widget search KBLI (autocomplete dari master data) |
| `wizard-step4-location-information.png` | Step 4 — form lokasi lengkap |
| `wizard-step4-location-type-cards.png` | Step 4 — kartu toggle jenis lokasi (Kantor/Gudang/Industri) |
| `wizard-step4-location-type-kantor-gudang.png` | Step 4 — varian VIU (hanya Kantor & Gudang) |
| `wizard-step4-address-fields.png` | Step 4 — field alamat |
| `wizard-step4-status-bangunan-milik-sendiri.png` | Step 4 — toggle status bangunan, state "Milik Sendiri" |
| `wizard-step4-status-bangunan-sewa.png` | Step 4 — toggle status bangunan, state "Sewa" (field tambahan muncul) |
| `wizard-step4-tanda-daftar-gudang.png` | Step 4 — section Tanda Daftar Gudang |

Screenshot dashboard (mis. tampilan super admin) **belum ada** — bagian ini hanya tersimpan di dalam `canvas.fig` (format biner Figma yang tidak bisa diekstrak otomatis) dan perlu diexport manual dari Figma Make kalau dibutuhkan.

## Application Management

### Create New Application — Wizard 8 Step

1. **Company Information**
2. **Application Information** — menentukan jenis impor:
   1. Impor Bahan Baku dan/atau Bahan Penolong – Perusahaan Industri (API-U)
   2. Impor Bahan Baku dan/atau Bahan Penolong – Perusahaan Non Industri (API-U)
   3. Impor Barang Konsumsi
3. **Legal Information** — termasuk section KBLI (bisa diketik manual atau dipilih dari KBLI Master Data; deskripsi KBLI terisi otomatis saat dipilih dari master data)
4. **Location Information** — lihat detail di bawah
5. **Support Document** — dokumen yang wajib diupload menyesuaikan pilihan Step 2 (dynamic)
6. **Product Information** — terkait dengan pilihan Step 2 (jenis material, HS Code, dst.)
7. **Preview**
8. **Submit**

Step 2, 5, dan 6 **saling terkait secara dinamis**: pilihan jenis impor di Step 2 menentukan dokumen wajib di Step 5 dan field produk di Step 6.

Jika jenis impor = "Impor Bahan Baku ... Perusahaan Industri (API-U)": pemilihan Mitra Industri tujuan muncul di **Step 5** (bukan Step 2), dan cukup memilih mitra industri saja (tanpa form tambahan Jenis Material/Estimasi Volume/Tujuan Penggunaan — field tersebut ada di Step 6). LHVKI Perusahaan Industri terisi otomatis (terintegrasi dari modul Mitra Industri), begitu juga Nomor NIB Mitra Industri.

#### Step 4 — Location Information (detail)

Lokasi dipilih lewat toggle ON/OFF per jenis lokasi: **Kantor**, **Gudang**, **Pabrik**. Tombol **+ Tambah Lokasi** menambah lokasi secara bertahap.

Field alamat umum: Alamat, Kota, Provinsi, Negara, Kode Pos.

Section status bangunan (accordion): **Milik Sendiri** atau **Sewa**.
- Milik Sendiri → upload dokumen pendukung kepemilikan.
- Sewa → bukti kepemilikan asli, nama pemilik asli, tanggal mulai sewa, tanggal akhir sewa, upload dokumen pendukung kepemilikan/perjanjian sewa.

Section khusus **Gudang** — Tanda Daftar Gudang:
- Jenis tanda daftar gudang (dropdown): Tanda Daftar Gudang / Penetapan Gudang Berikat / Gudang Penimbunan Sementara
- Nomor daftar gudang
- Nomor NIB pemilik bangunan
- Tanggal penerbitan
- Lembaga penerbit
- Upload dokumen tanda daftar gudang
- Upload layout gudang

## VIU / VKI Management

### Verification Assignment — Sub Menu

```
Verification Assignment
   ├ Dashboard
   ├ Pending Assignment
   ├ Create Assignment
   ├ Assigned Applications
   ├ Verification Schedule
   ├ Team Workload
   ├ Assignment History
   └ Surat Tugas
```

### Create Assignment — Step Terakhir

**Step: Masa Berlaku Surat Tugas** (mengisi Bagian G Surat Tugas)

| Field | Tipe |
|---|---|
| Tanggal Mulai Berlaku | Date |
| Tanggal Berakhir | Date |

**Final Step: Konfirmasi Assignment** — preview ringkas (Company, Surveyor, Tanggal Verifikasi, Lokasi). Tombol aksi: Back, Save Draft, Submit Assignment.

**Setelah Submit, sistem otomatis:**
1. Ubah status Application → `Assigned`
2. Generate Surat Tugas VIU (PDF)
3. Simpan PDF ke database
4. Kirim notifikasi ke tim verifikasi

Surat Tugas yang dihasilkan:
- Nama file: `Surat_Tugas_VIU_[ApplicationID].pdf`
- Lokasi penyimpanan (namespace storage): `application_documents`
- `document_type`: `surat_tugas_viu`

> Catatan implementasi: namespace penyimpanan aktual di kode saat ini memakai `documents` (lihat `STORAGE_NAMESPACES` di `src/lib/storage/types.ts`) — perlu disamakan konvensinya saat modul ini diimplementasikan.

Modul lain di bawah VIU/VKI Management: Verification Document, On Site Verification, Validation, Supporting Documents Management, Report.

## Mitra Management

- **Mitra Industri** — form tambah baru berupa multi-step wizard, dibuat sebagai dedicated page (bukan pop-up/modal). Terintegrasi dengan Application Management (dipilih di Step 5 saat jenis impor = Industri API-U).
- **Mitra Non Industri** — mengelola data perusahaan non-industri yang menjadi mitra penerima bahan baku/bahan penolong dari perusahaan importir (API-U). Data dipakai untuk: verifikasi kontrak kerja sama importir–mitra, validasi legalitas mitra penerima barang, memastikan distribusi barang sesuai permohonan VIU. Struktur form mengikuti pola yang sama dengan Mitra Industri.
- **Mitra Verification** — (belum ada detail lebih lanjut dari transcript)
- **Merk** — mengelola data merek (brand) produk tekstil yang diimpor Perusahaan API-U sebagai barang konsumsi. Dipakai untuk: identifikasi produk impor, verifikasi kepemilikan/penggunaan merek, kesesuaian merek dengan produk, mencegah penggunaan merek tanpa izin.

## Company Management

- **Add New Company** — multi-step wizard. Step 2 (Legal Information) memakai section KBLI dengan format yang sama seperti Step 3 (Legal Information) pada Create New Application, supaya konsisten.
- **Company Detail**
- Semua data perusahaan disinkronkan ke **Company Registry** module.

## System Configuration / Master Data

### HS Code Master Data

Database referensi HS Code untuk sektor Tekstil dan Produk Tekstil (TPT), sesuai **Lampiran I Permenperin No. 27 Tahun 2025**. Dipakai sistem untuk: mengisi otomatis uraian barang, menentukan kelompok & sub kelompok komoditas, menentukan satuan standar. **Hanya dapat diakses oleh Admin Sistem / Administrator Tribhakti.**

Struktur menu: `Master Data → Daftar Pos Tarif / HS Code`

Field data HS Code:

| Field | Keterangan |
|---|---|
| Pos Tarif / HS Code | Kode HS barang |
| Uraian Barang | Deskripsi barang |
| Kelompok Komoditas | Kelompok utama komoditas |
| Sub Kelompok Komoditas | Sub kategori komoditas |
| Satuan | Satuan standar perdagangan |

### KBLI Master Data

Klasifikasi Baku Lapangan Usaha Indonesia — dipilih atau diketik manual di Step 3 Create New Application; deskripsi terisi otomatis saat dipilih dari master data.

### Commodity Classification

Mengelola klasifikasi komoditas tekstil dan produk tekstil (TPT) agar data HS Code punya pengelompokan konsisten. Membantu: pengelompokan produk impor, analisis komoditas, pelaporan statistik, sinkronisasi dengan HS Code.

Dua level: **Commodity Group** dan **Commodity Sub Group**.

**Commodity Group** — field: Commodity Group Name, Commodity Code, Description, Status (Aktif/Non Aktif). Fitur: Add, Edit, Deactivate (bukan delete), Search (by nama/kode).

**Commodity Sub Group** — field: Commodity Sub Group Name, Commodity Group (relasi ke Group), Sub Group Code, Description, Status (Aktif/Non Aktif).

### Unit of Measurement

Setting/pengaturan satuan (belum ada detail field lebih lanjut dari transcript).

## User Management

**Role Management** — role yang didefinisikan: Super Admin, Admin, Surveyor, Verifikator, Technical Analyst, Compliance, Project Manager, Perusahaan.

**User List** — daftar seluruh pengguna yang terdaftar dalam sistem.

## Login

Halaman login dengan profil terpisah untuk Company dan Internal User (lihat daftar role di atas).

---

*Dokumen ini akan diperbarui seiring detail baru dari desain Figma Make (screenshot, field tambahan) dikonfirmasi ke implementasi kode.*
