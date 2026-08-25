"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Contact,
  Download,
  FileText,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import type { KbliEntryValues, LocationValues } from "@/modules/shared/schema";
import { STATUS_LABELS, type ApplicationStatusValue } from "@/modules/company-workspace/status";
import { APPLICATION_STATUS_STYLE } from "@/modules/applications/status-style";
import type { CompanyContactValues, TaxProofEntryValues } from "../schema";
import { TAX_PROOF_TYPE_LABELS } from "../schema";
import { avatarColor, fmtDate, initials, STATUS_LABEL, STATUS_STYLE, type CompanyStatusValue } from "../utils";

type ApplicationSummary = {
  id: string;
  applicationNumber: string;
  verificationType: string;
  status: ApplicationStatusValue;
  createdAt: string;
};

type CompanyDetailData = {
  id: string;
  status: CompanyStatusValue;
  companyName: string;
  apiType: string | null;
  companyType: string;
  investmentStatus: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string | null;
  contacts: CompanyContactValues[];
  addressJalan: string | null;
  addressDesa: string | null;
  addressKecamatan: string | null;
  addressKota: string | null;
  addressProvinsi: string | null;
  addressKodePos: string | null;
  nibNumber: string;
  nibIssueDate: string;
  notarialDeedNumber: string;
  notarialDeedIssueDate: string;
  skNumber: string | null;
  skDate: string | null;
  npwpNumber: string | null;
  npwpIssuer: string | null;
  companyAge: string | null;
  taxProofs: TaxProofEntryValues[];
  sktNumber: string | null;
  sktIssuer: string | null;
  sktDate: string | null;
  kbliEntries: KbliEntryValues[];
  locations: LocationValues[];
  createdAt: string;
  applications: ApplicationSummary[];
};

const TABS = ["Profil", "PIC", "Legal", "Pajak", "Application"] as const;
type Tab = (typeof TABS)[number];

const AGE_LABEL: Record<string, string> = {
  OVER_3: "Lebih dari 3 Tahun",
  UNDER_3: "Kurang dari 3 Tahun",
};


function addressSummary(data: CompanyDetailData): string {
  return [data.addressJalan, data.addressDesa, data.addressKecamatan, data.addressKota, data.addressProvinsi, data.addressKodePos]
    .filter(Boolean)
    .join(", ") || "-";
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#f0ded0] bg-white p-5.5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-[30px] items-center justify-center rounded-lg bg-[#fdeadd]">
          <Icon className="size-4 text-[#e0662e]" />
        </div>
        <div className="text-[13.5px] font-extrabold text-[#20180f]">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10.5px] font-bold tracking-[0.03em] text-[#a68f80]">{label}</div>
      <div className="text-[13.5px] font-bold text-[#20180f]">{children}</div>
    </div>
  );
}

function DocCard({
  label,
  fields,
}: {
  label: string;
  fields: { label: string; value: string }[];
}) {
  return (
    <div className="flex gap-4.5 rounded-xl border border-[#f0ded0] bg-white p-4.5">
      <div className="flex w-24 shrink-0 flex-col gap-[5px] rounded-md border border-[#e5d9cb] bg-white p-2.5 shadow-sm" style={{ aspectRatio: "210/297" }}>
        <div className="h-[5px] w-[55%] rounded-sm bg-[#e8dccd]" />
        <div className="mt-1 h-[3px] w-[85%] rounded-sm bg-[#f0e6d9]" />
        <div className="h-[3px] w-[80%] rounded-sm bg-[#f0e6d9]" />
        <div className="h-[3px] w-[70%] rounded-sm bg-[#f0e6d9]" />
        <div className="mt-1.5 h-[3px] w-[75%] rounded-sm bg-[#f0e6d9]" />
        <div className="h-[3px] w-[60%] rounded-sm bg-[#f0e6d9]" />
        <FileText className="mt-auto size-5 self-center text-[#e0662e]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-extrabold text-[#20180f]">{label}</div>
        <div className="mt-2.5 flex flex-wrap gap-5">
          {fields.map((f) => (
            <div key={f.label}>
              <div className="text-[10.5px] text-[#a68f80]">{f.label}</div>
              <div className="mt-0.5 text-[12.5px] font-bold text-[#20180f]">{f.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex size-8 shrink-0 items-center justify-center self-center rounded-lg border border-[#e8dccd]">
        <Download className="size-4 text-[#8a7565]" />
      </div>
    </div>
  );
}

type Props = { id: string };

export function CompanyDetail({ id }: Props) {
  const [tab, setTab] = useState<Tab>("Profil");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["companies", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${id}`);
      if (!response.ok) throw new Error("Perusahaan tidak ditemukan");
      const json = (await response.json()) as { data: CompanyDetailData };
      return json.data;
    },
  });

  if (isLoading) {
    return <p className="p-7 text-[13px] text-[#8a7565]">Memuat...</p>;
  }
  if (isError || !data) {
    return <p className="p-7 text-[13px] text-[#ba1a1a]">Data perusahaan tidak ditemukan.</p>;
  }

  const contacts = data.contacts.length > 0 ? data.contacts : [];
  const pic = contacts[0]?.name ?? "-";

  return (
    <div className="min-h-full bg-[#fbeee5] p-7">
      <div className="mb-4.5 flex items-center gap-2.5">
        <Link
          href="/company"
          aria-label="Kembali ke daftar perusahaan"
          className="flex size-8 items-center justify-center rounded-lg text-[#a68f80] outline-none transition-colors duration-150 hover:bg-[#f2f0ee] hover:text-[#594138] focus-visible:ring-2 focus-visible:ring-[#e0662e]"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="text-[20px] font-extrabold text-[#2b2420]">Detail Perusahaan</div>
      </div>

      <div
        className="mb-5 rounded-2xl border border-[#f0ded0] p-[26px_28px]"
        style={{ background: "linear-gradient(135deg,#fff7f1,#fdf1e8)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex size-16 shrink-0 items-center justify-center rounded-[14px] text-[18px] font-extrabold text-white shadow-[0_4px_10px_rgba(60,30,10,.12)]"
              style={{ background: avatarColor(data.companyName) }}
            >
              {initials(data.companyName)}
            </div>
            <div>
              <div className="text-[21px] font-extrabold text-[#20180f]">{data.companyName}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#8a7565]">
                <MapPin className="size-3.5" />
                {data.addressKota || "-"}, {data.addressProvinsi || "-"}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {data.apiType && (
                  <span className="rounded-full bg-[#e6e9fb] px-2.5 py-1 text-[11px] font-bold text-[#4a4fb0]">
                    {data.apiType}
                  </span>
                )}
                <span className="rounded-full bg-[#f2f0ee] px-2.5 py-1 text-[11px] font-bold text-[#594138]">
                  {data.companyType}
                </span>
              </div>
            </div>
          </div>
          <span
            className="rounded-full px-4 py-1.5 text-[12px] font-bold"
            style={{ background: STATUS_STYLE[data.status].bg, color: STATUS_STYLE[data.status].color }}
          >
            {STATUS_LABEL[data.status]}
          </span>
        </div>
      </div>

      <div className="mb-5 flex gap-1.5 border-b border-[#f0ded0]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="cursor-pointer whitespace-nowrap rounded-t-md px-4 py-2.5 text-[13px] font-semibold outline-none transition-colors duration-150 hover:bg-[#fdf5f0] focus-visible:ring-2 focus-visible:ring-[#e0662e]"
            style={{
              color: tab === t ? "#c14a1f" : "#594138",
              borderBottom: `2px solid ${tab === t ? "#e0662e" : "transparent"}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Profil" && (
        <div className="flex flex-col gap-3.5">
          <SectionCard icon={Building2} title="Informasi Umum">
            <div className="grid grid-cols-3 gap-4.5">
              <Field label="NAMA PERUSAHAAN">{data.companyName}</Field>
              <Field label="JENIS API">
                {data.apiType ? (
                  <span className="mt-0.5 inline-block rounded-md bg-[#e6e9fb] px-2.5 py-0.5 text-[11.5px] font-bold text-[#4a4fb0]">
                    {data.apiType}
                  </span>
                ) : (
                  "-"
                )}
              </Field>
              <Field label="TIPE PERUSAHAAN">{data.companyType}</Field>
              <Field label="STATUS INVESTASI">{data.investmentStatus}</Field>
              <Field label="PIC">{pic}</Field>
              <Field label="TERDAFTAR">{fmtDate(data.createdAt)}</Field>
            </div>
          </SectionCard>

          <SectionCard icon={Contact} title="Kontak &amp; Alamat">
            <div className="grid grid-cols-2 gap-4.5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[12.5px] text-[#4a4038]">
                  <Phone className="size-4 text-[#8a7565]" />
                  {data.companyPhone}
                </div>
                <div className="flex items-center gap-2 text-[12.5px] text-[#4a4038]">
                  <Mail className="size-4 text-[#8a7565]" />
                  {data.companyEmail}
                </div>
                <div className="flex items-center gap-2 text-[12.5px] text-[#4a4038]">
                  <Globe className="size-4 text-[#8a7565]" />
                  {data.companyWebsite || "-"}
                </div>
              </div>
              <div className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#4a4038]">
                <MapPin className="size-4 shrink-0 text-[#8a7565]" />
                {addressSummary(data)}
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "PIC" && (
        <div className="grid grid-cols-2 gap-3.5">
          {(contacts.length > 0 ? contacts : [{ name: "-", jabatan: "-", whatsapp: "-", email: "-" }]).map(
            (c, index) => (
              <div key={index} className="rounded-xl border border-[#f0ded0] bg-white p-4.5">
                <div className="mb-2 text-[10.5px] font-bold tracking-[0.04em] text-[#c14a1f]">
                  CONTACT {index + 1}
                </div>
                <div className="text-[14px] font-extrabold text-[#20180f]">{c.name}</div>
                <div className="mt-0.5 text-[12px] text-[#7a6a5a]">{c.jabatan}</div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-[#4a4038]">
                  <MessageCircle className="size-3.5 text-[#8a7565]" />
                  {c.whatsapp}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#4a4038]">
                  <Mail className="size-3.5 text-[#8a7565]" />
                  {c.email}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {tab === "Legal" && (
        <div className="flex flex-col gap-3.5">
          <DocCard
            label="Nomor Induk Berusaha (NIB)"
            fields={[
              { label: "Nomor NIB", value: data.nibNumber },
              { label: "Tanggal Terbit", value: fmtDate(data.nibIssueDate) },
            ]}
          />
          <DocCard
            label="Akta Pendirian"
            fields={[{ label: "Nomor Akta", value: data.notarialDeedNumber }]}
          />
          {data.skNumber && (
            <DocCard
              label="SK Kemenkumham"
              fields={[
                { label: "Nomor SK", value: data.skNumber },
                { label: "Tanggal Terbit", value: data.skDate ? fmtDate(data.skDate) : "-" },
              ]}
            />
          )}
          <div className="rounded-xl border border-[#f0ded0] bg-white p-4.5">
            <div className="mb-3 text-[13.5px] font-extrabold text-[#20180f]">KBLI</div>
            <div className="text-[12.5px] leading-relaxed text-[#20180f]">
              {data.kbliEntries.length > 0
                ? data.kbliEntries.map((k) => `${k.code} - ${k.description}`).join(", ")
                : "-"}
            </div>
          </div>
        </div>
      )}

      {tab === "Pajak" && (
        <div className="flex flex-col gap-3.5">
          <DocCard
            label="NPWP"
            fields={[
              { label: "Nomor NPWP", value: data.npwpNumber || "-" },
              { label: "Lembaga Penerbit", value: data.npwpIssuer || "-" },
              { label: "Usia Perusahaan", value: data.companyAge ? AGE_LABEL[data.companyAge] : "-" },
            ]}
          />
          {data.companyAge === "OVER_3" &&
            data.taxProofs.map((tp, index) => (
              <DocCard
                key={index}
                label={`Bukti Bayar Pajak ${tp.year} — ${tp.type ? TAX_PROOF_TYPE_LABELS[tp.type] : "-"}`}
                fields={[
                  { label: "Nomor", value: tp.nomor || "-" },
                  { label: "Tanggal", value: tp.tanggal || "-" },
                ]}
              />
            ))}
          {data.companyAge === "UNDER_3" && data.sktNumber && (
            <DocCard
              label="Surat Keterangan Terdaftar Pajak (SKT)"
              fields={[
                { label: "Nomor Surat", value: data.sktNumber },
                { label: "Lembaga Penerbit", value: data.sktIssuer || "-" },
                { label: "Tanggal Diterbitkan", value: data.sktDate ? fmtDate(data.sktDate) : "-" },
              ]}
            />
          )}
        </div>
      )}

      {tab === "Application" && (
        <div className="overflow-hidden rounded-xl border border-[#f0ded0] bg-white">
          <div
            className="grid gap-3 px-[18px] py-3 text-[11px] font-bold tracking-[0.03em] text-[#a68f80]"
            style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}
          >
            <div>APPLICATION ID</div>
            <div>JENIS</div>
            <div>DIAJUKAN</div>
            <div>STATUS</div>
          </div>
          {data.applications.map((a) => (
            <div
              key={a.id}
              className="grid items-center gap-3 border-t border-[#f5ebe1] px-[18px] py-3.5"
              style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1fr" }}
            >
              <div className="text-[12.5px] font-semibold text-[#4a4038]">{a.applicationNumber}</div>
              <div>
                <span className="rounded-md bg-[#f2f0ee] px-2.5 py-0.5 text-[11px] font-bold text-[#4a4038]">
                  {a.verificationType}
                </span>
              </div>
              <div className="text-[12.5px] text-[#4a4038]">{fmtDate(a.createdAt)}</div>
              <div>
                <span
                  className="rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                  style={{
                    background: APPLICATION_STATUS_STYLE[a.status].bg,
                    color: APPLICATION_STATUS_STYLE[a.status].color,
                  }}
                >
                  {STATUS_LABELS[a.status]}
                </span>
              </div>
            </div>
          ))}
          {data.applications.length === 0 && (
            <div className="p-8 text-center text-[12.5px] text-[#a68f80]">
              Belum ada application untuk perusahaan ini.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
