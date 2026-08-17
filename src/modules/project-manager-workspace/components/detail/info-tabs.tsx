"use client";

import type { PmApplicationDetail } from "./types";

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(value: string): string {
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-[#a68f80]">{label}</div>
      <div className="mt-0.5 text-[12.5px] font-semibold text-[#20180f]">{value || "—"}</div>
    </div>
  );
}

export function OverviewTab({ data }: { data: PmApplicationDetail }) {
  const { assignments } = data;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-3 text-[14px] font-extrabold text-[#20180f]">Application Summary</div>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Application ID" value={data.applicationNumber} />
          <Field label="Application Type" value={data.verificationType} />
          <Field label="Submission Date" value={fmtDate(data.createdAt)} />
          <Field label="Current Stage" value={data.stage} />
          <Field label="Application Status" value={data.status} />
          <Field label="SLA" value={data.slaDetail} />
        </div>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-3 text-[14px] font-extrabold text-[#20180f]">Assignment</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[#f0ded0] p-3">
            <div className="text-[10.5px] font-bold text-[#a68f80]">SURVEYOR</div>
            <div className="mt-1.5 text-[13px] font-bold text-[#20180f]">{assignments.survey?.surveyorName ?? "Belum ditugaskan"}</div>
            {assignments.survey && <div className="mt-1 text-[11px] text-[#8a7565]">{assignments.survey.status}</div>}
          </div>
          <div className="rounded-lg border border-[#f0ded0] p-3">
            <div className="text-[10.5px] font-bold text-[#a68f80]">VERIFIKATOR</div>
            <div className="mt-1.5 text-[13px] font-bold text-[#20180f]">{assignments.dokumen?.verifikatorName ?? "Belum ditugaskan"}</div>
            {assignments.dokumen && <div className="mt-1 text-[11px] text-[#8a7565]">{assignments.dokumen.status}</div>}
          </div>
          <div className="rounded-lg border border-[#f0ded0] p-3">
            <div className="text-[10.5px] font-bold text-[#a68f80]">TECHNICAL ANALIS</div>
            <div className="mt-1.5 text-[13px] font-bold text-[#20180f]">{assignments.technical?.technicalReviewerName ?? "Belum ditugaskan"}</div>
            {assignments.technical && <div className="mt-1 text-[11px] text-[#8a7565]">{assignments.technical.status}</div>}
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-3 text-[14px] font-extrabold text-[#20180f]">Document Verification</div>
        <div className="flex gap-4 text-[12px]">
          <span className="font-bold text-[#1a9850]">{data.documentChecklist.filter((d) => d.status === "VALID" || d.status === "VERIFIED").length} Verified</span>
          <span className="font-bold text-[#c98a1f]">{data.documentChecklist.filter((d) => d.status === "PENDING").length} Pending</span>
          <span className="font-bold text-[#e15241]">{data.documentChecklist.filter((d) => d.status === "REJECTED").length} Rejected</span>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
        <div className="mb-3 text-[14px] font-extrabold text-[#20180f]">Production Capability</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Machines" value={String(data.machines.length)} />
          <Field label="Products" value={String(data.products.length)} />
          <Field label="Raw Materials" value={String(data.rawMaterialUsage.length)} />
          <Field label="Sales Records" value={String(data.sales.length)} />
        </div>
      </div>
    </div>
  );
}

export function ApplicationInfoTab({ data }: { data: PmApplicationDetail }) {
  const sections = [
    { title: "Application Information", fields: [{ label: "Application ID", value: data.applicationNumber }, { label: "Application Type", value: data.verificationType }] },
    { title: "Applicant Information", fields: [{ label: "Company", value: data.company.companyName }, { label: "NIB", value: data.company.nibNumber }] },
    { title: "Business Activity", fields: (data.company.kbliEntries ?? []).slice(0, 2).map((k) => ({ label: k.code, value: k.description })) },
    { title: "Submission Information", fields: [{ label: "Submitted On", value: fmtDate(data.createdAt) }, { label: "Category", value: data.applicationCategory }] },
  ];
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5 flex flex-col gap-4">
      {sections.map((sec) => (
        <div key={sec.title}>
          <div className="mb-2 text-[13px] font-extrabold text-[#20180f]">{sec.title}</div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {sec.fields.map((f) => (
              <Field key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CompanyTab({ data }: { data: PmApplicationDetail }) {
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
      <div className="text-[14px] font-extrabold text-[#20180f]">{data.company.companyName}</div>
      <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="NIB" value={data.company.nibNumber} />
        <Field label="SKT" value={data.company.sktNumber ?? "—"} />
        {(data.company.kbliEntries ?? []).map((k) => (
          <Field key={k.code} label={`KBLI ${k.code}`} value={k.description} />
        ))}
        <Field label="Business Address" value={data.businessAddress ?? "—"} />
      </div>
    </div>
  );
}

export function TimelineTab({ data }: { data: PmApplicationDetail }) {
  return (
    <div className="rounded-[10px] border border-[#f0ded0] bg-white p-5">
      <div className="mb-3.5 text-[14px] font-extrabold text-[#20180f]">Timeline</div>
      <div className="flex flex-col gap-3.5">
        {data.timeline.map((event, i) => (
          <div key={`${event.title}-${i}`} className="flex gap-3">
            <div className="mt-1 size-2 shrink-0 rounded-full bg-[#e0662e]" />
            <div>
              <div className="text-[12.5px] font-bold text-[#20180f]">{event.title}</div>
              <div className="text-[11px] text-[#a68f80]">{fmtDateTime(event.time)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
