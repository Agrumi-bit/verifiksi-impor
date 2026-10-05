# Skema Verifikasi — `src/modules/schemes`

Satu sumber kebenaran untuk dokumen, sifat dokumen, dasar hukum, istilah, dan narasi laporan
per skema. Dasar: **Permenperin No. 27 Tahun 2025** (dicek terhadap teks peraturan).

| Skema | Id | Subjek | Persyaratan | Isi laporan | Masa berlaku | Lokasi wajib |
|---|---|---|---|---|---|---|
| VKI | `VKI` | Ps 25 | Ps 30 (2) | LHVKI Ps 32 (3) | 3 th — Ps 32 (4) | Kantor + Pabrik |
| VIU Bahan Baku Industri | `VIU_BAHAN_BAKU_INDUSTRI` | Ps 26 a | Ps 37 (2) a | LHVIU Ps 39 (3) | 1 th — Ps 39 (6) | Kantor + Gudang |
| VIU Bahan Baku Non Industri | `VIU_BAHAN_BAKU_NON_INDUSTRI` | Ps 26 b | Ps 37 (2) b | LHVIU Ps 39 (4) | 1 th | Kantor + Gudang |
| VIU Barang Konsumsi | `VIU_KONSUMSI` | Ps 26 c | Ps 37 (2) c, (3)–(9) | LHVIU Ps 39 (5) | 1 th | Kantor + Gudang |

## Struktur

```
schemes/
  types.ts                 tipe: SchemeId, DocumentSifat, LegalBasis, SchemeDocumentDef, SchemeTerms…
  resolvers.ts             resolveScheme(s), findDocumentDef, resolveDocumentRequirement,
                           resolveSchemeDocuments, resolveReportContent, canFinalizeReport,
                           findForbiddenTerms, validateViuKbli
  registry.ts              SCHEMES / getScheme
  shared/
    common-documents.ts    identitas dokumen umum (key, label, bab) — TANPA sifat & pasal
    viu-common-documents.ts dokumen umum VIU dengan pasal skema masing-masing
    viu-legal.ts           pembangun sitasi VIU per huruf (a/b/c)
    financial-documents.ts Bukti Kemampuan Finansial (SP modal kerja + bukti pendukung)
    legal.ts               pasal() / internalLvi() / terkait()
  vki/ viu-konsumsi/ viu-bahan-baku-non-industri/ viu-bahan-baku-industri/
    terms.ts               istilah skema + istilah terlarang + KBLI (VIU)
    legal-basis.ts         semua rujukan pasal skema
    documents.ts           daftar dokumen skema (sifat + dasar hukum)
    narrative.ts           narasi laporan (diisi Tahap 2–5)
    report-sections.ts     urutan bab laporan
```

## Aturan

1. **Tidak ada fallback antar-skema.** Narasi/dokumen yang belum didefinisikan menjadi
   `[BELUM DIATUR untuk {skema}] …` dan `canFinalizeReport()` menolak finalisasi.
2. **Key yang tidak didefinisikan skema = tidak berlaku** (disembunyikan, file tidak dihapus).
   Contoh: `vki-support:*` pada permohonan VIU, `support:{id}` lama pada Konsumsi.
3. **Dokumen umum** berbagi identitas, tetapi sifat & pasal ditetapkan tiap skema.
4. **Permohonan VIU multi-jenis impor**: satu laporan — bab Legalitas, Perpajakan, Lokasi sekali,
   lalu bab khusus tiap skema (urutan Industri → Non Industri → Konsumsi). Sifat dokumen bersama =
   yang terkuat; dasar hukum tetap per skema.
5. **Dasar hukum** jenisnya: `REGULASI` (pasal), `INTERNAL_LVI` (persyaratan internal LVI, dicetak
   tanpa pasal), `TERKAIT` (pasal lain, mis. Pertimbangan Teknis Ps 8).

## Keputusan yang sudah dikonfirmasi (Okt 2026)

- Bukti pajak 3 th / SKT untuk VIU → **Pendukung** (Ps 37 hanya mensyaratkan NPWP).
- SP Kepemilikan Modal Kerja: Konsumsi = Ps 37 (2) c angka 2 huruf i); Industri & Non Industri =
  **wajib, persyaratan internal LVI**.
- Bukti finansial pendukung Industri & Non Industri → **cukup pilih salah satu**; Konsumsi → opsional.
- Kontrak kerja sama/jual beli ≥ 1 th → **wajib**: Industri (dengan Perusahaan Industri, Ps 37 (2) a
  angka 2 huruf f)) dan Non Industri (dengan Perusahaan Non Industri, huruf b angka 2 huruf f)) —
  field upload baru (Tahap 3/4).
- VKI: SP Tidak Diperjualbelikan & SP Kebenaran Data → **Pendukung** (dasar: Ps 8 (2) a, Pertimbangan
  Teknis). Alur proses = Ps 30 (2) b angka 5; listrik = angka 8.
- Validasi KBLI per skema → **hanya VIU** (Ps 37 (2) … angka 2 huruf b) jo. Ps 38 (2) b).
- Layout Gudang VIU → Pendukung (tidak disebut Ps 37).

## Tes

`npm test` (node:test + tsx). Snapshot matriks dokumen: `src/modules/schemes/__snapshots__/documents.json`;
perbarui dengan `UPDATE_SNAPSHOTS=1 npm test` setelah perubahan yang disetujui.

## Rollout per tahap (`schemes/rollout.ts`)

Aplikasi dilayani modul skema hanya jika **semua** skemanya aktif (`ACTIVE_SCHEMES`); aplikasi
campuran tetap memakai jalur lama sampai semua skemanya selesai dimigrasi.

| Tahap | Skema | Status |
|---|---|---|
| 2 | VIU Barang Konsumsi | aktif |
| 3 | VIU Bahan Baku Non Industri | belum |
| 4 | VIU Bahan Baku Industri | belum |
| 5 | VKI | belum |

### Titik integrasi

- `verifikator-workspace/schema.ts` → `buildDocumentChecklist` menyaring dokumen yang tidak
  didefinisikan skema (mis. `support:{id}` lama, SP VKI, dokumen lokasi Pabrik pada VIU).
- `verifikator-workspace/application-checklist.ts` → `buildApplicationDocumentChecklist()`:
  satu pintu server yang selalu menyertakan konteks Mitra Industri + Merek/Uji Mutu Konsumsi
  (dipakai laporan Verifikator/TA/PM/Company, Surveyor, PM detail, riwayat dokumen).
- `verifikator-workspace/scheme-compliance.ts` → kolom Persyaratan / Referensi Regulasi /
  Keterangan dan pembuka setiap bagian di tab Verifikasi Dokumen (Verifikator) dan Dokumen (CR).
- `verifikator-workspace/scheme-report.ts` → seluruh narasi Laporan Verifikasi Dokumen
  (kata pengantar, ringkasan, bab, per dokumen, kesimpulan), urutan bab, penomoran BAB romawi,
  dan dokumen pendukung yang tidak diunggah tidak dicetak.
- `applications/viu-kbli-requirements.ts` → daftar KBLI VIU dibaca dari `terms.allowedKbli`.
