"use client";

import { useEffect, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { LocationsField } from "@/components/wizard/locations-field";
import { CompanyProfileView } from "./profile-view";
import { Step1DataPerusahaan } from "@/modules/company/components/steps/step1-data-perusahaan";
import { Step2Pic } from "@/modules/company/components/steps/step2-pic";
import { Step3Legal } from "@/modules/company/components/steps/step3-legal";
import { Step4Pajak } from "@/modules/company/components/steps/step4-pajak";
import {
  companyWizardSchema,
  COMPANY_STEP_FIELD_NAMES,
  createEmptyContact,
  createEmptyTaxProofs,
  type CompanyContactValues,
  type CompanyWizardValues,
  type TaxProofEntryValues,
  type KbliCategory,
} from "@/modules/company/schema";
import { locationsSchema, type LocationValues, type KbliEntryValues } from "@/modules/shared/schema";

export type CompanyProfileData = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  updatedAt: string;
  logoPath: string | null;
  apiType: string | null;
  companyName: string;
  companyType: string;
  investmentStatus: "PMDN" | "PMA";
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
  nibDocumentPath: string;
  kbliEntries: KbliEntryValues[];
  kbliDocumentPath: string;
  notarialDeedNumber: string;
  notarialDeedIssueDate: string;
  notarialIssuingAuthority: string;
  notarialDocumentPath: string;
  notarialAmendmentNumber: string | null;
  notarialAmendmentDate: string | null;
  notarialAmendmentAuthority: string | null;
  notarialAmendmentDocPath: string | null;
  skNumber: string | null;
  skDate: string | null;
  skDocumentPath: string | null;
  npwpNumber: string | null;
  npwpIssuer: string | null;
  npwpDocumentPath: string | null;
  companyAge: "OVER_3" | "UNDER_3" | null;
  taxProofs: TaxProofEntryValues[];
  sktNumber: string | null;
  sktIssuer: string | null;
  sktDate: string | null;
  sktDocumentPath: string | null;
  locations: LocationValues[];
  documentMeta: Record<
    string,
    {
      version: number;
      uploadedByName: string | null;
      uploadedAt: string;
      verificationStatus: "NOT_YET_VERIFIED" | "VERIFIED" | "REJECTED" | "EXPIRED";
      verifiedByName: string | null;
      verifiedAt: string | null;
      verifiedByRole: "CR" | "VERIFIKATOR" | null;
      rejectionNote: string | null;
    }
  >;
};

const QUERY_KEY = ["company-workspace", "profile"];

export function useCompanyProfileQuery() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/company-workspace/profile");
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Gagal memuat profil perusahaan");
      }
      const json = (await response.json()) as { data: CompanyProfileData };
      return json.data;
    },
  });
}

async function saveSection(section: string, values: object) {
  const response = await fetch("/api/company-workspace/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, ...values }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Gagal menyimpan perubahan");
  }
  return response.json() as Promise<{ data: CompanyProfileData }>;
}

function toDefaultValues(data: CompanyProfileData): CompanyWizardValues {
  return {
    logoPath: data.logoPath ?? "",
    companyName: data.companyName,
    apiType: (data.apiType ?? "API-U") as CompanyWizardValues["apiType"],
    companyType: data.companyType as CompanyWizardValues["companyType"],
    investmentStatus: data.investmentStatus,
    addressJalan: data.addressJalan ?? "",
    addressDesa: data.addressDesa ?? "",
    addressKecamatan: data.addressKecamatan ?? "",
    addressKota: data.addressKota ?? "",
    addressProvinsi: data.addressProvinsi ?? "",
    addressKodePos: data.addressKodePos ?? "",
    companyPhone: data.companyPhone,
    companyEmail: data.companyEmail,
    companyWebsite: data.companyWebsite ?? "",
    contacts: data.contacts.length > 0 ? data.contacts : [createEmptyContact()],
    nibNumber: data.nibNumber,
    nibIssueDate: data.nibIssueDate.slice(0, 10),
    nibDocumentPath: data.nibDocumentPath,
    // Legacy profiles predate the KBLI Utama/Pendukung split — fall back to the old
    // positional convention (first entry = Utama) so existing data still renders correctly.
    kbliEntries: (data.kbliEntries ?? []).map((k, i) => ({ ...k, category: (i === 0 ? "UTAMA" : "PENDUKUNG") as KbliCategory })),
    kbliDocumentPath: data.kbliDocumentPath,
    notarialDeedNumber: data.notarialDeedNumber,
    notarialDeedIssueDate: data.notarialDeedIssueDate.slice(0, 10),
    notarialIssuingAuthority: data.notarialIssuingAuthority,
    notarialDocumentPath: data.notarialDocumentPath,
    hasAmendment: Boolean(data.notarialAmendmentNumber),
    notarialAmendmentNumber: data.notarialAmendmentNumber ?? "",
    notarialAmendmentDate: data.notarialAmendmentDate?.slice(0, 10) ?? "",
    notarialAmendmentAuthority: data.notarialAmendmentAuthority ?? "",
    notarialAmendmentDocPath: data.notarialAmendmentDocPath ?? "",
    skNumber: data.skNumber ?? "",
    skDate: data.skDate?.slice(0, 10) ?? "",
    skDocumentPath: data.skDocumentPath ?? "",
    npwpNumber: data.npwpNumber ?? "",
    npwpIssuer: data.npwpIssuer ?? "",
    npwpDocumentPath: data.npwpDocumentPath ?? "",
    companyAge: (data.companyAge ?? "OVER_3") as CompanyWizardValues["companyAge"],
    taxProofs: data.taxProofs.length > 0 ? data.taxProofs : createEmptyTaxProofs(),
    sktNumber: data.sktNumber ?? "",
    sktIssuer: data.sktIssuer ?? "",
    sktDate: data.sktDate?.slice(0, 10) ?? "",
    sktDocumentPath: data.sktDocumentPath ?? "",
    locations: data.locations,
  };
}

function useCompanyWizardForm(data: CompanyProfileData) {
  const form = useForm<CompanyWizardValues>({
    resolver: zodResolver(companyWizardSchema) as Resolver<CompanyWizardValues>,
  });

  useEffect(() => {
    form.reset(toDefaultValues(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  return form;
}

function SectionForm({
  form,
  step,
  section,
  successMessage,
  children,
}: {
  form: UseFormReturn<CompanyWizardValues>;
  step: number;
  section: string;
  successMessage: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  async function handleSave() {
    const fields = COMPANY_STEP_FIELD_NAMES[step] ?? [];
    const isValid = await form.trigger(fields);
    if (!isValid) return;
    const values = form.getValues();
    try {
      await saveSection(section, values);
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {children}
      <div className="flex justify-end border-t border-[#f0ded0] pt-4">
        <Button
          type="button"
          onClick={handleSave}
          disabled={form.formState.isSubmitting}
          className="bg-[#e0662e] text-white hover:bg-[#c1361f]"
        >
          {form.formState.isSubmitting ? "Menyimpan..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function FacilitiesTab({ data }: { data: CompanyProfileData }) {
  const queryClient = useQueryClient();
  const form = useForm<{ locations: LocationValues[] }>({
    resolver: zodResolver(locationsSchema),
  });

  useEffect(() => {
    form.reset({ locations: data.locations });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  async function onSubmit(values: { locations: LocationValues[] }) {
    try {
      await saveSection("facilities", values);
      toast.success("Facilities berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <LocationsField form={form} />
      <div className="flex justify-end border-t border-[#f0ded0] pt-4">
        <Button type="submit" disabled={form.formState.isSubmitting} className="bg-[#e0662e] text-white hover:bg-[#c1361f]">
          {form.formState.isSubmitting ? "Menyimpan..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export function CompanyProfileTabs() {
  const { data, isLoading, isError, error } = useCompanyProfileQuery();

  if (isLoading) {
    return <p className="mx-auto max-w-3xl py-10 text-sm text-muted-foreground">Memuat...</p>;
  }
  if (isError || !data) {
    return (
      <p className="mx-auto max-w-3xl py-10 text-sm text-destructive">
        {error instanceof Error ? error.message : "Profil perusahaan tidak ditemukan."}
      </p>
    );
  }

  return <CompanyProfileTabsContent data={data} />;
}

function CompanyProfileTabsContent({ data }: { data: CompanyProfileData }) {
  const form = useCompanyWizardForm(data);
  const [mode, setMode] = useState<"view" | "edit">("view");

  if (mode === "view") {
    return (
      <div className="mx-auto w-full max-w-5xl py-8">
        <CompanyProfileView data={data} onEdit={() => setMode("edit")} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#20180f]">Company Profile</h1>
          <p className="mt-0.5 text-[13px] text-[#8a7565]">
            Kelola data resmi perusahaan Anda. Setiap tab disimpan secara terpisah.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setMode("view")}
          className="border-[#e1bfb3] bg-white text-[#261813] hover:bg-[#fdeadd]"
        >
          Kembali ke Profile
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="rounded-[10px] bg-[#fdeadd] p-1.25 gap-1.5">
          <TabsTab
            value="general"
            className="rounded-[7px] px-4.5 py-2.5 text-[13px] font-bold text-[#8a6a54] data-active:bg-[#e0662e] data-active:text-white data-active:shadow-none"
          >
            General Information
          </TabsTab>
          <TabsTab
            value="contact"
            className="rounded-[7px] px-4.5 py-2.5 text-[13px] font-bold text-[#8a6a54] data-active:bg-[#e0662e] data-active:text-white data-active:shadow-none"
          >
            Contact Person
          </TabsTab>
          <TabsTab
            value="legal"
            className="rounded-[7px] px-4.5 py-2.5 text-[13px] font-bold text-[#8a6a54] data-active:bg-[#e0662e] data-active:text-white data-active:shadow-none"
          >
            Legal Entity
          </TabsTab>
          <TabsTab
            value="tax"
            className="rounded-[7px] px-4.5 py-2.5 text-[13px] font-bold text-[#8a6a54] data-active:bg-[#e0662e] data-active:text-white data-active:shadow-none"
          >
            Pajak
          </TabsTab>
          <TabsTab
            value="facilities"
            className="rounded-[7px] px-4.5 py-2.5 text-[13px] font-bold text-[#8a6a54] data-active:bg-[#e0662e] data-active:text-white data-active:shadow-none"
          >
            Facilities
          </TabsTab>
        </TabsList>

        <TabsPanel value="general">
          <SectionForm form={form} step={1} section="data" successMessage="Company Profile berhasil disimpan.">
            <Step1DataPerusahaan form={form} />
          </SectionForm>
        </TabsPanel>
        <TabsPanel value="contact">
          <SectionForm form={form} step={2} section="contacts" successMessage="Contact Person berhasil disimpan.">
            <Step2Pic form={form} />
          </SectionForm>
        </TabsPanel>
        <TabsPanel value="legal">
          <SectionForm form={form} step={3} section="legal" successMessage="Legal Entity berhasil disimpan.">
            <Step3Legal form={form} />
          </SectionForm>
        </TabsPanel>
        <TabsPanel value="tax">
          <SectionForm form={form} step={4} section="tax" successMessage="Pajak berhasil disimpan.">
            <Step4Pajak form={form} />
          </SectionForm>
        </TabsPanel>
        <TabsPanel value="facilities">
          <FacilitiesTab data={data} />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
