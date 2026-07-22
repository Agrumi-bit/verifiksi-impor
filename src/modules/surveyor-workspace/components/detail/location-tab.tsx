import { MaterialIcon } from "../material-icon";
import { LOCATION_TYPE_LABELS } from "../../status";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

type Props = { payload: ApplicationWizardValues };

export function LocationTab({ payload }: Props) {
  const locations = payload.locations ?? [];

  return (
    <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-8 shadow-sm">
      <div className="mb-1.5 flex items-center gap-3.5">
        <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#fff1ec]">
          <MaterialIcon name="location_on" className="text-sv-primary-container" />
        </div>
        <h3 className="font-sv-headline-lg text-[19px] font-bold">Location Information</h3>
      </div>
      <div className="mb-6 ml-[56px] text-sm text-[#8a7565]">Lokasi yang akan diverifikasi</div>

      {locations.length === 0 ? (
        <p className="ml-[56px] text-sm text-[#8a7565]">Belum ada lokasi terdaftar.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {locations.map((loc, index) => (
            <div
              key={index}
              className="flex flex-col overflow-hidden rounded-xl border border-[#f0ded0] bg-[#fdf5f2]"
            >
              <div
                className="relative flex h-[120px] items-center justify-center"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg,#f2f0ee,#f8f5f2), linear-gradient(#e8e2dc 1px,transparent 1px), linear-gradient(90deg,#e8e2dc 1px,transparent 1px)",
                  backgroundSize: "cover, 24px 24px, 24px 24px",
                }}
              >
                <MaterialIcon name="location_on" className="text-[36px] text-sv-primary-container" />
                <span className="absolute right-3 top-2.5 rounded-md bg-white/85 px-2 py-1 text-[10.5px] font-semibold text-[#6b6259]">
                  Map preview
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="mb-2.5 w-fit rounded-full border border-[#e8d5c5] bg-white px-3 py-0.5 text-xs font-semibold text-[#4a4038]">
                  {LOCATION_TYPE_LABELS[loc.locationType]?.replace(/ \(.+\)/, "") ?? loc.locationType}
                </span>
                <div className="mb-0.5 text-base font-bold">{loc.address}</div>
                <div className="mb-4 text-[13px] text-[#8a7565]">
                  {loc.city}, {loc.province}
                </div>
                {loc.googleMapsLink ? (
                  <a
                    href={loc.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-[#e1bfb3] bg-white py-2.5 text-[13px] font-semibold"
                  >
                    <MaterialIcon name="map" className="text-base" />
                    View Map
                  </a>
                ) : (
                  <span className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-[#e1bfb3] bg-white py-2.5 text-[13px] font-semibold text-[#a68f80]">
                    <MaterialIcon name="map" className="text-base" />
                    Tidak ada link peta
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
