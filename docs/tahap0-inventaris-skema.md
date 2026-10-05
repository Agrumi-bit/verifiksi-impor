# Tahap 0 — Inventaris Skema (VKI · VIU Konsumsi · VIU Non Industri · VIU Industri)

Sumber: `origin/main` @ 5675f23 (dibaca saja, belum ada kode yang diubah).
Semua rujukan pasal di bawah = **yang dipakai kode SEKARANG** (Permenperin No. 27 Tahun 2025), BELUM tentu benar untuk setiap skema — perlu dikonfirmasi.

Legenda: **W** = Wajib · **W-Alt** = Wajib (alternatif) · **P** = Pendukung · **P?** = Pendukung jika tersedia · **O** = opsional/pilih salah satu · **—** = tidak ada di skema ini

## 1. Matriks dokumen saat ini

### A. Legalitas Perusahaan (step "Legal Information", data dari profil perusahaan)
| Key | Dokumen | VKI | VIU Kons. | VIU Non Ind. | VIU Ind. | Kondisi tampil | Pasal sekarang |
|---|---|---|---|---|---|---|---|
| nib | NIB | W | W | W | W | selalu | Ps 30 (2) b angka 2 |
| kbli-utama | KBLI Utama | W | W | W | W | selalu | Ps 32 (3) b |
| kbli-pendukung | KBLI Pendukung | P | P | P | P | selalu | Ps 32 (3) b |
| notarial | Akta Notaris (Pendirian) | P | P | P | P | selalu | Ps 31 (1) a |
| notarial-amendment | Akta Perubahan | P | P | P | P | jika ada file | Ps 31 (1) a + Ps 33 (4) b, c |
| sk | SK Kemenkumham | P | P | P | P | selalu | Ps 31 (1) a |

### B. Perpajakan (step "Tax Information")
| Key | Dokumen | VKI | VIU Kons. | VIU Non Ind. | VIU Ind. | Kondisi | Pasal sekarang |
|---|---|---|---|---|---|---|---|
| npwp | NPWP | W | W | W | W | selalu | Ps 30 (2) b angka 1 |
| tax-proof-summary | Bukti Bayar Pajak 3 Tahun | W | W | W | W | usia perusahaan ≠ < 3 th | Ps 30 (2) b angka 7 |
| tax-support:spt-tahunan, bpe, ssp, pph-badan, ppn, e-billing | Rincian bukti pajak | P | P | P | P | idem | Ps 31 (1) a |
| tax-support:skf | Surat Keterangan Fiskal | P? | P? | P? | P? | idem | Ps 31 (1) a |
| skt | SKT Pajak | W-Alt | W-Alt | W-Alt | W-Alt | usia perusahaan ≠ > 3 th | Ps 30 (2) b angka 7 |

### C. Dokumen Lokasi (step "Location Information", per lokasi)
| Key | Dokumen | VKI | VIU Kons. | VIU Non Ind. | VIU Ind. | Kondisi | Pasal sekarang |
|---|---|---|---|---|---|---|---|
| location:{id}:ownership:SHM/HGB/AJB/LAINNYA | Bukti kepemilikan | P | P | P | P | status bangunan MILIK_SENDIRI | Ps 31 (2) a |
| location:{id}:lease:SEWA_MENYEWA/PINJAM_PAKAI/KERJA_SAMA/LAINNYA | Perjanjian sewa/pakai | P | P | P | P | status bangunan sewa | Ps 31 (2) a |
| location:{id}:warehouseRegistration | Tanda Daftar Gudang | (jika ada gudang) | W | W | W | lokasi GUDANG | Ps 30 (2) b angka 6 |
| location:{id}:warehouseLayout | Layout Gudang | (jika ada gudang) | W | W | W | lokasi GUDANG | Ps 30 (2) b angka 6 |
Lokasi wajib (aturan baru): VKI = Kantor + Pabrik; VIU = Kantor + Gudang.

### D. Khusus VKI (step "Support Document" VKI + data produksi)
| Key | Dokumen | VKI | VIU (semua) | Pasal sekarang |
|---|---|---|---|---|
| vki-support:tidak-diperjualbelikan | SP Tidak Diperjualbelikan | W | — | Ps 30 (2) b angka 6 |
| vki-support:memiliki-menguasai | SP Memiliki atau Menguasai | W | — | Ps 30 (2) b angka 6 |
| vki-support:kebenaran-data | SP Kebenaran Data | W | — | Ps 30 (2) b angka 6 |
| vki-support:alur-proses | SP Alur Proses | W | — | Ps 30 (2) b angka 6 |
| vki-support:tenaga-kerja | SP Tenaga Kerja | W | — | Ps 30 (2) b angka 3 |
| vki-support:listrik:{bulan} | Bukti Bayar Listrik 3 bulan | (per bulan) | — | **tidak ada rujukan** |
| (data) mesin, produk, kapasitas, produksi, bahan baku, penjualan | Data kemampuan produksi | W | — | Ps 30 (2) a angka 1–6 |

### E. Khusus VIU — Bukti Kemampuan Finansial (step "Support Document"/"Bukti Kemampuan Finansial")
| Key | Dokumen | VKI | VIU Kons. (konsumsi-financial:) | VIU Non Ind. / Ind. (nonindustri-support:) | Pasal sekarang |
|---|---|---|---|---|---|
| surat-pernyataan-modal-kerja | SP Kepemilikan Modal Kerja (+ jumlah Rp) | — | W (UTAMA) | W (UTAMA) | **tidak ada definisi** |
| rekening-koran, surat-referensi-bank, laporan-keuangan, fasilitas-kredit | Pendukung finansial | — | O (pilih salah satu, hanya jika dipilih) | **"Wajib"** di compliance-defs vs "PENDUKUNG" di defs upload | teks "Persyaratan Bukti Kemampuan Finansial — VIU" (tanpa pasal) |
| keterangan-saldo, deposito, pinjaman-afiliasi, kontrak-po, proforma-invoice | Pendukung finansial | — | O | P? | idem |
⚠ VIU Konsumsi memakai ulang teks & status "Wajib" milik Non Industri → di laporan Konsumsi rekening koran dkk. tampil "Wajib" padahal opsional.

### F. Khusus VIU Industri — Mitra/Partner Industri (step "Partner Industri")
| Key | Dokumen | VIU Ind. | lainnya | Pasal sekarang |
|---|---|---|---|---|
| partner:{id}:nib | NIB Partner | W | — | teks "Persyaratan Mitra Industri — VIU" |
| partner:{id}:npwp | NPWP Partner | W | — | idem |
| partner:{id}:sk | SK Kemenkumham Partner | P | — | idem |
| partner:{id}:lhvki | LHVKI Partner | W | — | idem |

### G. Khusus VIU Konsumsi
| Key | Dokumen | VIU Kons. | Kondisi | Pasal sekarang |
|---|---|---|---|---|
| konsumsi-brand:{brandId}:evidence | Bukti merek (sertifikat merek dll.) | W | per merek | teks "Persyaratan Bukti Merek — VIU Konsumsi" |
| konsumsi-brand:{brandId}:rel:{code} | Dokumen hubungan merek (lisensi/penunjukan) | W (sesuai peran) | per merek, jika pemohon bukan pemilik | **tidak ada definisi** |
| konsumsi-qt:{brandId}:{commodityGroupId} | Sertifikat Hasil Uji Mutu | W | per Merek × Sub Kelompok (bisa dipakai bersama) | teks "Persyaratan Hasil Uji Mutu — VIU Konsumsi" |
| konsumsi-label:statement | SP Pemenuhan Label Berbahasa Indonesia | W | 1 per permohonan | **tidak ada definisi** |
| konsumsi-label:documentation | Dokumentasi Label Produk | W | 1 per permohonan | **tidak ada definisi** |
| support:{id} (konsumsiDocuments) | Dokumen pendukung manual (lama) | — (seharusnya sudah dihapus) | data lama | — |

## 2. Inventaris narasi (masalah utama)
- `verifikator-workspace/document-compliance-defs.ts` — `COMPLIANCE_SECTION_DEFS`: pembuka bab Legalitas, Perpajakan, Tenaga Kerja, Surat Pernyataan, Dokumen Lokasi **dipakai semua skema** dan menyebut "Verifikasi Kemampuan Industri (VKI)" + "Pasal 30 ayat (2)" (baris ±293–335). Bab Finansial Konsumsi, Dokumen Merek, Partner Industri sudah VIU-spesifik.
- `keterangan` per dokumen menyebut "alamat pabrik", "aktivitas industri yang dijalankan" (nib, kbli-utama, kbli-pendukung, tenaga-kerja).
- `verifikator-workspace/report-narrative.ts` (1.103 baris, 28 kemunculan VKI/Kemampuan Industri): narasi per dokumen LEGALITAS_DOCUMENTS, PERPAJAKAN_DOCUMENTS, lokasi, surat pernyataan, listrik, partner — tidak membaca skema (kecuali modal finansial: schemeLabel "bahan baku"/"barang konsumsi"). Contoh: KBLI Utama "…objek Verifikasi Kemampuan Industri (VKI)", KBLI Pendukung "…Laporan Hasil Verifikasi Kemampuan Industri", Akta Pendirian "…tidak termasuk dokumen yang dipersyaratkan Pasal 30 ayat (2)…".
- `components/report/document-verification-report.tsx`: header "Lembaga Verifikasi & Survey — VKI / VIU", kata pengantar "…Verifikasi Kemampuan Industri (VKI) / Verifikasi Importir Umum (VIU)…", kesimpulan "…Verifikasi Kemampuan Industri sesuai dengan ketentuan Permenperin…" (baris ±1245, 1256, 1750).

## 3. Tempat yang memakai daftar dokumen secara langsung (harus diganti resolver)
- `buildDocumentChecklist` dipanggil di 19 file: API company-workspace (4), customer-relation-workspace (4), project-manager-workspace (2), surveyor-workspace (1), technical-analyst (1), verifikator-workspace (6), dan `company-workspace/components/application-detail.tsx`.
- Definisi dokumen tersebar: `applications/schema.ts` (VKI_SUPPORT_DOC_DEFS, langkah wizard), `applications/financial-capability-defs.ts`, `applications/viu-schemes/konsumsi/*` (schema, submit-rules, document-rules, validate-submit, konsumsi-application-review), `company/schema.ts` + `company/document-fields.ts` (TAX_PROOF_TYPES), `verifikator-workspace/{schema,document-compliance-defs,document-checklist-items,report-narrative}.ts`, step wizard `step5-support-document.tsx`, `vki-step6-support-document.tsx`, `vki-step13-preview.tsx`, CR `documents-tab.tsx`, verifikator `document-verification-tab.tsx`, `company-workspace/components/profile-view.tsx`, PM dashboard & surveyor schema (string kategori).

## 4. Permohonan VIU dengan lebih dari satu jenis impor
`importTypes` adalah array — satu permohonan VIU bisa Konsumsi + Bahan Baku sekaligus. Sekarang checklist & laporan menggabungkan semuanya dalam satu daftar.
**Usulan:** satu laporan per permohonan dengan
1. Bab umum sekali saja (Legalitas, Perpajakan, Lokasi) — narasi memakai istilah "Verifikasi Importir Umum (VIU)" netral + menyebut jenis impor yang diajukan;
2. Bab khusus per skema berurutan (mis. "Bukti Kemampuan Finansial — Bahan Baku", "Mitra Industri", "Dokumen Merek & Uji Mutu — Barang Konsumsi"), masing-masing memakai narasi & pasal skemanya.
Alternatif: laporan terpisah per skema (dokumen umum diperiksa sekali tetapi dicetak di tiap laporan).

## 5. Yang perlu Anda konfirmasi
1. Rujukan pasal per dokumen untuk **masing-masing** skema VIU (Konsumsi, Non Industri, Industri) — saat ini semua memakai pasal VKI (Ps 30–33), dan dokumen khusus VIU belum punya pasal sama sekali.
2. Status Wajib/Pendukung per skema untuk dokumen umum (Akta, SK, KBLI Pendukung, Tanda Daftar & Layout Gudang, bukti pajak).
3. Bukti Kemampuan Finansial: di Non Industri & Industri, rekening koran/referensi bank/laporan keuangan/fasilitas kredit itu **wajib** atau **pilih salah satu**? (kode upload vs laporan saat ini bertentangan).
4. Bukti Bayar Listrik (VKI) — pasal yang benar.
5. Dokumen Label & dokumen hubungan merek (Konsumsi) — pasal/dasar persyaratan.
6. Pilihan untuk permohonan multi-jenis impor (bagian 4).

---
## 6. HASIL CEK PERMENPERIN 27/2025 (sumber: PDF yang diunggah)

Keputusan user: (a) permohonan multi-jenis impor → **satu laporan** (bab umum sekali + bab per skema); (b) Bukti finansial Non Industri & Industri → **cukup pilih salah satu**.

Dasar umum: Ps 25 (subjek VKI) · Ps 26 huruf a/b/c (subjek VIU Industri / Non Industri / Konsumsi) · Ps 28 (penunjukan LPV).

### VKI — Ps 30 ayat (2), verifikasi Ps 31, LHVKI Ps 32 (berlaku 3 th)
| Dokumen | Pasal benar | Catatan vs kode sekarang |
|---|---|---|
| Data produksi (mesin/hari, produksi & bahan baku 1 th, konversi, rencana 1 th, penjualan, stok) | Ps 30 (2) a angka 1–6 | sama |
| NPWP | Ps 30 (2) b angka 1 | sama |
| NIB / Perizinan Berusaha + KBLI | Ps 30 (2) b angka 2 (+ Ps 32 (3) b isi LHVKI) | sama |
| Data tenaga kerja / SP Tenaga Kerja | Ps 30 (2) b angka 3 | sama |
| Data mesin & peralatan produksi | Ps 30 (2) b angka 4 | sama |
| Gambar alur proses produksi | Ps 30 (2) b angka **5** | kode: angka 6 → **salah** |
| SP memiliki/menguasai gudang dan/atau unit limbah (Lampiran II huruf G) | Ps 30 (2) b angka 6 jo. ayat (3) | sama |
| Bukti bayar pajak 3 th / SKT (< 3 th) | Ps 30 (2) b angka 7 | sama |
| Bukti bayar listrik 3 bulan | Ps 30 (2) b angka **8** | kode: **tidak ada pasal** |
| SP tidak diperjualbelikan (Lamp. II A) & SP kebenaran data (Lamp. II D) | **bukan** syarat VKI — itu syarat Pertimbangan Teknis Ps 8 (2) a angka 2 c), d) | kode: Ps 30 (2) b angka 6 → **salah** |
| Akta, SK, Akta Perubahan | tidak disyaratkan Ps 30; hanya untuk perubahan LHVKI Ps 33 (4) b, c → Pendukung | — |
| Bukti kepemilikan/sewa kantor & pabrik | tidak disebut Ps 30; dasar cek lapangan Ps 31 (2) a → Pendukung | — |
| Tanda Daftar / Layout Gudang | tidak disyaratkan VKI → N/A | — |

### VIU — Ps 37 ayat (2), verifikasi Ps 38, LHVIU Ps 39 (berlaku 1 th)
| Dokumen | VIU Industri (huruf a angka 2) | VIU Non Industri (huruf b angka 2) | VIU Konsumsi (huruf c angka 2) |
|---|---|---|---|
| NPWP | a) W | a) W | a) W |
| NIB + KBLI (perdagangan besar) | b) KBLI 46411, 46414, 46699, 46100, 45301 | b) KBLI 46411, 46414, 46100 | b) KBLI 46411, 46412, 46414, 46499, 46691, 46699, 46795, 46100 |
| Bukti milik/sewa **kantor** | c) sisa sewa ≥ 1 th | c) ≥ 1 th | c) ≥ 1 th |
| Bukti milik/sewa **gudang** | d) sewa ≥ **2 th** | d) ≥ 1 th | d) ≥ 1 th |
| Tanda daftar gudang / SK gudang berikat / TPS | e) W | e) W | e) W |
| Kontrak kerja sama / jual beli ≥ 1 th | f) dengan **Perusahaan Industri** | f) dengan **Perusahaan Non Industri** | — |
| LHVKI mitra industri | g) W | — | — |
| Sertifikat merek (atau tanda pendaftaran merek, maks 9 bln — ayat 6–7) | — | — | f) W |
| Sertifikat uji mutu per merek per komoditas/sub, ≤ 6 bln | — | — | g) W |
| SP label berbahasa Indonesia + dokumentasi label (Lamp. II H) | — | — | h) W |
| SP kepemilikan modal kerja (Lamp. II I) | **tidak disyaratkan** | **tidak disyaratkan** | i) W |
| Perwakilan Resmi: akta penunjukan notaris, perjanjian lisensi/sublisensi, bukti pencatatan lisensi | — | — | ayat (3) a–c (lisensi & pencatatan dikecualikan bila pakai tanda pendaftaran — ayat 8) |
| Importir saja: surat penunjukan impor dari pemilik merek (di RI) / Perwakilan Resmi | — | — | ayat (4) |
| Legalitas Perwakilan Resmi (akta + perubahan, Perizinan, penunjukan, lisensi, pencatatan) | — | — | ayat (5) a–e |
| Identitas mitra (nama, alamat, NIB, KBLI, no. LHVKI) — isi LHVIU | Ps 39 (3) c | Ps 39 (4) c (tanpa LHVKI) | — |
| Data pengisian | kebutuhan per HS dari mitra industri 1 th + stok | kebutuhan per HS dari mitra non industri 1 th + stok | stok per HS |
| Bukti pajak 3 th / SKT | **tidak disyaratkan** (hanya NPWP) | idem | idem |
| Akta, SK | tidak disyaratkan → Pendukung | idem | idem |
| Bukti finansial pendukung (rekening koran dst.) | tidak ada di Permenperin → kebijakan internal, pilih salah satu | idem | pilih salah satu (pendukung SP modal) |
Verifikasi dokumen: Ps 38 (2) a (kelengkapan) & b (**kesesuaian KBLI dengan HS yang diimpor**); lapangan: Ps 38 (3).
