import { MaterialIcon } from "../material-icon";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

type Props = { payload: ApplicationWizardValues };

export function CompanyTab({ payload }: Props) {
  const kantor = payload.locations?.find((l) => l.locationType === "KANTOR");
  const officeAddress = kantor
    ? `${kantor.address}, ${kantor.city}, ${kantor.province}`
    : payload.locations?.[0]
      ? `${payload.locations[0].address}, ${payload.locations[0].city}`
      : undefined;

  const permits = [
    { name: "NIB (Nomor Induk Berusaha)", meta: payload.nibNumber, path: payload.nibDocumentPath },
    { name: "Daftar KBLI", meta: payload.kbliEntries?.map((e) => e.code).join(", "), path: payload.kbliDocumentPath },
    { name: "Akta Notaris", meta: payload.notarialDeedNumber, path: payload.notarialDocumentPath },
  ].filter((p) => p.path);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-8 shadow-sm">
        <div className="flex flex-wrap gap-9">
          <div className="w-[180px] flex-shrink-0">
            <div className="mb-3 flex aspect-square items-center justify-center rounded-xl border border-[#e8d5c5] bg-gradient-to-br from-[#fff1ec] to-[#f7ddd4]">
              <MaterialIcon name="business" className="text-[52px] text-sv-primary" />
            </div>
            <button
              type="button"
              className="w-full rounded-full border-[1.5px] border-sv-primary-container py-2.5 text-[12.5px] font-bold text-sv-primary-container"
            >
              Update Photo
            </button>
          </div>
          <div className="min-w-[320px] flex-1">
            <div className="mb-1.5 text-[11.5px] uppercase tracking-wide text-[#a68f80]">
              Registered Company Name
            </div>
            <h1 className="mb-6 font-sv-headline-lg text-3xl font-extrabold leading-tight">
              {payload.companyName}
            </h1>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[10px] border border-[#f0ded0] bg-[#fdf5f2] p-4">
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-[#a68f80]">
                  Import Category
                </div>
                <div className="flex items-center gap-2.5">
                  <MaterialIcon name="shopping_bag" className="text-sv-primary-container" />
                  <span className="text-[17px] font-bold">{payload.companyType}</span>
                </div>
              </div>
              <div className="rounded-[10px] border border-[#f0ded0] bg-[#fdf5f2] p-4">
                <div className="mb-2 text-[10.5px] uppercase tracking-wide text-[#a68f80]">
                  NIB (Business Registration)
                </div>
                <div className="flex items-center gap-2.5">
                  <MaterialIcon name="terminal" className="text-sv-primary-container" />
                  <span className="text-[17px] font-bold tracking-wide">{payload.nibNumber}</span>
                </div>
              </div>
            </div>
            <div className="rounded-[10px] border border-[#f0ded0] bg-[#fdf5f2] p-4">
              <div className="mb-2 text-[10.5px] uppercase tracking-wide text-[#a68f80]">
                Office Address
              </div>
              <div className="flex items-start gap-2.5">
                <MaterialIcon name="location_on" className="mt-0.5 text-sv-primary-container" />
                <span className="text-[15px] leading-relaxed text-[#594138]">{officeAddress || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex size-[42px] items-center justify-center rounded-[10px] bg-[#fff1ec]">
                <MaterialIcon name="description" className="text-sv-primary-container" />
              </div>
              <h3 className="font-sv-headline-lg text-[17px] font-bold">Required Permits</h3>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {permits.length === 0 && <p className="text-sm text-[#8a7565]">Belum ada dokumen terunggah.</p>}
            {permits.map((doc) => (
              <div
                key={doc.name}
                className="flex items-center justify-between rounded-[10px] border border-[#f0ded0] bg-[#fdf5f2] p-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-[38px] shrink-0 items-center justify-center rounded-lg border border-[#e8d5c5] bg-white">
                    <MaterialIcon name="picture_as_pdf" className="text-sv-primary-container" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{doc.name}</div>
                    <div className="text-[11px] text-[#a68f80]">{doc.meta || "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[14px] border border-[#e8d5c5] bg-white p-7 shadow-sm">
          <div className="mb-5 flex items-center gap-3.5">
            <div className="flex size-[42px] items-center justify-center rounded-[10px] bg-[#fff1ec]">
              <MaterialIcon name="person" className="text-sv-primary-container" />
            </div>
            <h3 className="font-sv-headline-lg text-[17px] font-bold">Key Personnel</h3>
          </div>
          <div className="mb-4 rounded-[10px] border border-[#f0ded0] bg-[#fdf5f2] p-5">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex size-[50px] shrink-0 items-center justify-center rounded-full bg-sv-primary-fixed text-[17px] font-bold text-sv-on-primary-fixed">
                {payload.contactFullName
                  ?.split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold">{payload.contactFullName}</div>
                <div className="text-[13px] text-[#8a7565]">{payload.contactDesignation}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 border-t border-[#e8d5c5] pt-3.5">
              <div className="flex items-center gap-2.5 text-[13.5px] text-[#594138]">
                <MaterialIcon name="phone" className="text-base text-[#a68f80]" />
                {payload.contactPhone}
              </div>
              <div className="flex items-center gap-2.5 text-[13.5px] text-[#594138]">
                <MaterialIcon name="mail" className="text-base text-[#a68f80]" />
                {payload.contactEmail}
              </div>
            </div>
          </div>
          <a
            href={`mailto:${payload.contactEmail}`}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-sv-primary-container py-2.5 text-[13px] font-bold text-white"
          >
            <MaterialIcon name="mail" />
            Contact Representative
          </a>
        </div>
      </div>
    </div>
  );
}
