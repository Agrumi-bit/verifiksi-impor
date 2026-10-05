import { AlertTriangle, MapPin } from "lucide-react";

import { LOCATION_SOURCE_BADGE_STYLE, type ApplicationLocationSummary } from "@/modules/shared/location-meta";

const TYPE_LABEL: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };
const BUILDING_LABEL: Record<string, string> = { MILIK_SENDIRI: "Milik Sendiri", SEWA: "Sewa" };

/**
 * "Lokasi Permohonan" — the application's locations with their source badge (Profil perusahaan /
 * Ditambahkan saat permohonan / Temuan lapangan), "Data lokasi diperbarui setelah pengajuan" when
 * the company profile changed since submission, and a notice for each location the surveyor
 * found on site. Shared by the CR, Verifikator, PM and Admin application views.
 */
export function ApplicationLocationsPanel({ locations }: { locations: ApplicationLocationSummary[] }) {
  const discovered = locations.filter((loc) => loc.badge.tone === "field");
  return (
    <section className="rounded-xl border border-[#f0ded0] bg-white p-5">
      <div className="text-[15px] font-extrabold text-[#20180f]">Lokasi Permohonan</div>
      {discovered.map((loc) => (
        <div key={`notice-${loc.id}`} className="mt-3 flex items-start gap-2 rounded-lg border border-[#f0c78a] bg-[#fdf0d5] p-3 text-[12.5px] text-[#7a4a10]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Lokasi tambahan ditemukan saat survey</strong> — {TYPE_LABEL[loc.locationType] ?? loc.locationType}, {loc.address}
            {loc.fieldNotes ? `. Catatan: ${loc.fieldNotes}` : ""}
          </span>
        </div>
      ))}
      {locations.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-[#8a7565]">Belum ada lokasi.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {locations.map((loc) => {
            const style = LOCATION_SOURCE_BADGE_STYLE[loc.badge.tone];
            return (
              <div key={loc.id} className="rounded-lg border border-[#efe2d4] p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <MapPin className="size-4 text-[#a68f80]" />
                  <span className="text-[13px] font-bold text-[#20180f]">{TYPE_LABEL[loc.locationType] ?? loc.locationType}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ background: style.bg, color: style.color }}>
                    {loc.badge.label}
                  </span>
                  {loc.buildingStatus && (
                    <span className="rounded-full bg-[#f2f0ee] px-2 py-0.5 text-[10.5px] font-bold text-[#4a4038]">
                      {BUILDING_LABEL[loc.buildingStatus] ?? loc.buildingStatus}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-[12.5px] font-semibold text-[#20180f]">{loc.address}</div>
                <div className="text-[12px] text-[#8a7565]">{loc.cityProvince}</div>
                {loc.googleMapsLink && (
                  <a href={loc.googleMapsLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[12px] font-semibold text-[#2f6fe0] hover:underline">
                    Lihat di peta
                  </a>
                )}
                {loc.updatedAfterSubmission && (
                  <div className="mt-1.5 text-[11.5px] font-semibold text-[#a3690a]">Data lokasi diperbarui setelah pengajuan (menampilkan data terkini profil perusahaan)</div>
                )}
                {loc.missingFromProfile && (
                  <div className="mt-1.5 text-[11.5px] font-semibold text-[#8a7565]">Tidak lagi ada di profil perusahaan — menampilkan data saat pengajuan</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
