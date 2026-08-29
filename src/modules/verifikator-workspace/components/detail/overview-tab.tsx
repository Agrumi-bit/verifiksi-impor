import { MaterialIcon } from "../material-icon";
import type { AssignmentDetailData } from "../assignment-detail";
import { LOCATION_TYPE_LABELS } from "../../status";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Section({ title, icon, iconColor, children }: { title: string; icon: string; iconColor: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-[#f0ded0] bg-white p-5.5">
      <div className="mb-4 flex items-center gap-2">
        <MaterialIcon name={icon} className="text-[19px]" style={{ color: iconColor }} />
        <h3 className="text-[14.5px] font-extrabold text-[#20180f]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11.5px] text-[#8a7565]">{label}</div>
      <div className="mt-0.75 break-words text-[13px] font-bold text-[#20180f]">{value || "—"}</div>
    </div>
  );
}

export function OverviewTab({ data }: { data: AssignmentDetailData }) {
  const { company, verificationProgram, surveyInformation, progress, quickStats } = data;
  const payload = data.application.payload;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Company Information" icon="domain" iconColor="#2f6fe0">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field label="Nama Perusahaan" value={company.companyName} />
            <Field label="NIB" value={company.companyLegal?.nibNumber || payload.nibNumber} />
            <div className="sm:col-span-2">
              <Field label="Alamat" value={company.businessAddress} />
            </div>
            <Field label="PIC" value={payload.contactFullName ? `${payload.contactFullName} (${payload.contactDesignation ?? "—"})` : null} />
            <Field label="Telepon" value={payload.companyPhone} />
            <Field label="Email" value={payload.companyEmail} />
          </div>
        </Section>

        <Section title="Verification Locations" icon="location_on" iconColor="#1a9850">
          <div className="flex flex-col gap-3">
            {company.locations.length === 0 && <p className="text-[13px] text-[#8a7565]">Belum ada lokasi terdaftar.</p>}
            {company.locations.map((loc) => {
              const visit = surveyInformation.locationVisits.find(
                (v) => v.locationType === loc.locationType && v.address.includes(loc.address),
              );
              const isVerified = visit?.status === "COMPLETED";
              return (
                <div key={loc.id} className="rounded-[9px] bg-[#f7f2ec] p-3.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <div className="text-[13.5px] font-bold text-[#20180f]">{LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType}</div>
                      <div className="mt-0.5 text-[12px] text-[#8a7565]">{loc.address}</div>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        isVerified ? "bg-[#e2f7ea] text-[#1a9850]" : "bg-[#eae5de] text-[#4a4038]"
                      }`}
                    >
                      {isVerified ? "Verified" : "Belum Disurvei"}
                    </span>
                  </div>
                  <span className="mt-2 inline-block rounded-full bg-[#eae5de] px-2.5 py-0.75 text-[11px] font-semibold text-[#4a4038]">
                    {LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <Section title="Verification Progress" icon="trending_up" iconColor="#e0662e">
        <div className="mb-4 flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f0ede8]">
            <div className="h-full rounded-full bg-[#e0662e]" style={{ width: `${progress.overallProgress}%` }} />
          </div>
          <span className="text-[13px] font-bold text-[#20180f]">{progress.overallProgress}%</span>
        </div>
        <p className="mb-4 text-[13px] text-[#4a4038]">
          Current Stage: <span className="font-bold text-[#20180f]">{progress.currentStage}</span>
        </p>
        <div className="flex flex-col gap-3">
          {progress.timeline.map((event, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="size-2 rounded-full bg-[#e0662e]" />
                {i < progress.timeline.length - 1 && <span className="w-px flex-1 bg-[#f0ded0]" />}
              </div>
              <div className="pb-3">
                <div className="text-[12.5px] font-bold text-[#20180f]">{event.label}</div>
                <div className="text-[11px] text-[#8a7565]">{fmtDate(event.date)}</div>
                {event.description && <div className="mt-0.5 text-[12px] text-[#4a4038]">{event.description}</div>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Verification Program" icon="verified" iconColor="#2f6fe0">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Verification Program" value={verificationProgram.type} />
          <Field label="Verification Scope" value={verificationProgram.importTypes.join(", ")} />
          <Field
            label="Requested Products"
            value={
              verificationProgram.products.length
                ? `${verificationProgram.products.length} produk — ${verificationProgram.products.map((p) => p.materialType).join(", ")}`
                : "—"
            }
          />
        </div>
      </Section>

      <Section title="Quick Statistics" icon="query_stats" iconColor="#8a7565">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg bg-[#f7f2ec] p-3 text-center">
            <div className="text-[19px] font-extrabold text-[#20180f]">{quickStats.totalDocuments}</div>
            <div className="text-[10px] text-[#8a7565]">Total Documents</div>
          </div>
          <div className="rounded-lg bg-[#f7f2ec] p-3 text-center">
            <div className="text-[19px] font-extrabold text-[#1a9850]">{quickStats.documentsVerified}</div>
            <div className="text-[10px] text-[#8a7565]">Documents Verified</div>
          </div>
          <div className="rounded-lg bg-[#f7f2ec] p-3 text-center">
            <div className="text-[19px] font-extrabold text-[#20180f]">{quickStats.totalProducts}</div>
            <div className="text-[10px] text-[#8a7565]">Total Products</div>
          </div>
          <div className="rounded-lg bg-[#f7f2ec] p-3 text-center">
            <div className="text-[19px] font-extrabold text-[#1a9850]">{quickStats.productsVerified}</div>
            <div className="text-[10px] text-[#8a7565]">Products Verified</div>
          </div>
          <div className="rounded-lg bg-[#f7f2ec] p-3 text-center">
            <div className="text-[19px] font-extrabold text-[#c1361f]">{quickStats.totalFindings}</div>
            <div className="text-[10px] text-[#8a7565]">Total Findings</div>
          </div>
          <div className="rounded-lg bg-[#f7f2ec] p-3 text-center">
            <div className="text-[19px] font-extrabold text-[#b3650c]">{quickStats.pendingReview}</div>
            <div className="text-[10px] text-[#8a7565]">Pending Review</div>
          </div>
        </div>
      </Section>
    </div>
  );
}
