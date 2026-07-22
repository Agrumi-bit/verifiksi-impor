import { MaterialIcon } from "../material-icon";
import type { AssignmentDetailData } from "../assignment-detail";
import { LOCATION_TYPE_LABELS, LOCATION_VISIT_STATUS_LABELS } from "../../status";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[#e4e7f2] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <MaterialIcon name={icon} className="text-[#3454d1]" />
        <h3 className="text-[16px] font-bold text-[#1f2437]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-[#8891ab]">{label}</dt>
      <dd className="break-words text-sm font-semibold text-[#1f2437]">{value || "—"}</dd>
    </div>
  );
}

export function OverviewTab({ data }: { data: AssignmentDetailData }) {
  const { company, verificationProgram, surveyInformation, progress, quickStats } = data;

  return (
    <div className="flex flex-col gap-5">
      <Section title="Assignment Information" icon="badge">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Assignment Number" value={data.assignmentNumber} />
          <Field label="Assignment Date" value={fmtDate(data.createdAt)} />
          <Field label="Due Date" value={fmtDate(data.dueDate)} />
          <Field label="Priority" value={data.priority} />
          <Field label="Assignment Status" value={data.status} />
        </dl>
      </Section>

      <Section title="Company Information" icon="apartment">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Company Name" value={company.companyName} />
          <Field label="NIB" value={company.nibNumber} />
          <Field label="Business Address (Kantor)" value={company.businessAddress} />
          <Field
            label="Business Sector (KBLI)"
            value={company.kbliEntries.map((e) => `${e.code} — ${e.description}`).join("; ")}
          />
          <Field
            label="Factory / Office Location"
            value={company.locations
              .map((loc) => `${LOCATION_TYPE_LABELS[loc.locationType] ?? loc.locationType}: ${loc.address}, ${loc.city}`)
              .join(" | ")}
          />
        </dl>
      </Section>

      <Section title="Verification Program" icon="verified">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </dl>
      </Section>

      <Section title="Survey Information" icon="fact_check">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Assigned Surveyor" value={surveyInformation.surveyorName} />
          <Field label="Survey Date" value={fmtDate(surveyInformation.scheduledDate)} />
          <Field label="Survey Completion Date" value={fmtDate(surveyInformation.completionDate)} />
        </dl>
        <div className="mt-4 flex flex-col gap-2 border-t border-[#f0f2fa] pt-4">
          {surveyInformation.locationVisits.map((visit) => (
            <div key={visit.id} className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#3d4258]">
                {LOCATION_TYPE_LABELS[visit.locationType] ?? visit.locationType} — {visit.address}
                {visit.city ? `, ${visit.city}` : ""}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 font-bold ${
                  visit.status === "COMPLETED" ? "bg-[#e1f3ea] text-[#0f7a4d]" : "bg-[#eef0f6] text-[#5b6478]"
                }`}
              >
                {LOCATION_VISIT_STATUS_LABELS[visit.status]}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Verification Progress" icon="trending_up">
        <div className="mb-5 flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#eef0f6]">
            <div className="h-full rounded-full bg-[#3454d1]" style={{ width: `${progress.overallProgress}%` }} />
          </div>
          <span className="text-sm font-bold text-[#1f2437]">{progress.overallProgress}%</span>
        </div>
        <p className="mb-4 text-sm text-[#3d4258]">
          Current Stage: <span className="font-semibold text-[#1f2437]">{progress.currentStage}</span>
        </p>
        <div className="flex flex-col gap-3">
          {progress.timeline.map((event, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="size-2 rounded-full bg-[#3454d1]" />
                {i < progress.timeline.length - 1 && <span className="w-px flex-1 bg-[#e4e7f2]" />}
              </div>
              <div className="pb-3">
                <div className="text-xs font-semibold text-[#1f2437]">{event.label}</div>
                <div className="text-[11px] text-[#8891ab]">{fmtDate(event.date)}</div>
                {event.description && <div className="mt-0.5 text-xs text-[#5f6478]">{event.description}</div>}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Quick Statistics" icon="query_stats">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg bg-[#f6f7fb] p-3 text-center">
            <div className="text-xl font-extrabold text-[#1f2437]">{quickStats.totalDocuments}</div>
            <div className="text-[10px] text-[#8891ab]">Total Documents</div>
          </div>
          <div className="rounded-lg bg-[#f6f7fb] p-3 text-center">
            <div className="text-xl font-extrabold text-[#0f7a4d]">{quickStats.documentsVerified}</div>
            <div className="text-[10px] text-[#8891ab]">Documents Verified</div>
          </div>
          <div className="rounded-lg bg-[#f6f7fb] p-3 text-center">
            <div className="text-xl font-extrabold text-[#1f2437]">{quickStats.totalProducts}</div>
            <div className="text-[10px] text-[#8891ab]">Total Products</div>
          </div>
          <div className="rounded-lg bg-[#f6f7fb] p-3 text-center">
            <div className="text-xl font-extrabold text-[#0f7a4d]">{quickStats.productsVerified}</div>
            <div className="text-[10px] text-[#8891ab]">Products Verified</div>
          </div>
          <div className="rounded-lg bg-[#f6f7fb] p-3 text-center">
            <div className="text-xl font-extrabold text-[#c1352b]">{quickStats.totalFindings}</div>
            <div className="text-[10px] text-[#8891ab]">Total Findings</div>
          </div>
          <div className="rounded-lg bg-[#f6f7fb] p-3 text-center">
            <div className="text-xl font-extrabold text-[#b3650c]">{quickStats.pendingReview}</div>
            <div className="text-[10px] text-[#8891ab]">Pending Review</div>
          </div>
        </div>
      </Section>
    </div>
  );
}
