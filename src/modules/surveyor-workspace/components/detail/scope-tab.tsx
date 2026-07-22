import { MaterialIcon } from "../material-icon";

const SCOPE_ITEMS = [
  { title: "Keberadaan dan fungsi kantor", desc: "Memastikan kantor perusahaan berdiri dan berfungsi sesuai alamat terdaftar" },
  { title: "Keberadaan dan fungsi gudang", desc: "Verifikasi lokasi dan fungsi gudang penyimpanan barang" },
  { title: "Kesesuaian fasilitas penyimpanan", desc: "Memeriksa kondisi dan kapasitas fasilitas penyimpanan barang" },
  { title: "Observasi jenis barang", desc: "Mengamati jenis dan kategori barang yang tersimpan di lokasi" },
  { title: "Kesesuaian kegiatan usaha", desc: "Mencocokkan kegiatan usaha aktual dengan izin yang terdaftar" },
];

export function ScopeTab() {
  return (
    <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-8 shadow-sm">
      <div className="mb-1.5 flex items-center gap-3.5">
        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#fff1ec]">
          <MaterialIcon name="assignment" className="text-sv-primary-container" />
        </div>
        <h3 className="font-sv-headline-lg text-[19px] font-bold">Verification Scope</h3>
      </div>
      <div className="mb-6 ml-[56px] text-sm text-[#8a7565]">Ruang lingkup verifikasi lapangan</div>

      <div className="flex flex-col gap-3">
        {SCOPE_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-4 rounded-xl border border-[#f0ded0] bg-[#fdf5f2] p-5"
          >
            <div className="mt-0.5 flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#e7f6ee]">
              <MaterialIcon name="check_circle" className="text-[19px] text-[#027a48]" />
            </div>
            <div className="min-w-0">
              <div className="mb-0.5 text-[15px] font-bold">{item.title}</div>
              <div className="text-[13px] leading-relaxed text-[#8a7565]">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
