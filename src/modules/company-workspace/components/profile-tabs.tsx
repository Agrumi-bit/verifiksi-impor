"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { GeneralInformationFields } from "@/components/wizard/general-information-fields";
import { ContactPersonFields } from "@/components/wizard/contact-person-fields";
import { LegalInformationFields } from "@/components/wizard/legal-information-fields";
import { LocationsField } from "@/components/wizard/locations-field";
import {
  contactPersonSchema,
  generalInformationSchema,
  legalInformationSchema,
  locationsSchema,
  type ContactPersonValues,
  type GeneralInformationValues,
  type LegalInformationValues,
  type LocationValues,
} from "@/modules/shared/schema";

type CompanyProfileData = {
  id: string;
  companyName: string;
  companyType: string;
  investmentStatus: "PMDN" | "PMA";
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string | null;
  contactFullName: string;
  contactDesignation: string;
  contactEmail: string;
  contactPhone: string;
  nibNumber: string;
  nibIssueDate: string;
  nibDocumentPath: string;
  kbliEntries: { code: string; description: string }[];
  kbliDocumentPath: string;
  notarialDeedNumber: string;
  notarialDeedIssueDate: string;
  notarialIssuingAuthority: string;
  notarialAmendmentInfo: string | null;
  notarialDocumentPath: string;
  locations: LocationValues[];
};

const QUERY_KEY = ["company-workspace", "profile"];

function useCompanyProfileQuery() {
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

function GeneralInformationTab({ data }: { data: CompanyProfileData }) {
  const queryClient = useQueryClient();
  const form = useForm<GeneralInformationValues>({
    resolver: zodResolver(generalInformationSchema),
  });

  useEffect(() => {
    form.reset({
      companyName: data.companyName,
      companyType: data.companyType,
      investmentStatus: data.investmentStatus,
      companyEmail: data.companyEmail,
      companyPhone: data.companyPhone,
      companyWebsite: data.companyWebsite ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  async function onSubmit(values: GeneralInformationValues) {
    try {
      await saveSection("general", values);
      toast.success("Company Profile berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <GeneralInformationFields form={form} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Menyimpan..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function ContactPersonTab({ data }: { data: CompanyProfileData }) {
  const queryClient = useQueryClient();
  const form = useForm<ContactPersonValues>({
    resolver: zodResolver(contactPersonSchema),
  });

  useEffect(() => {
    form.reset({
      contactFullName: data.contactFullName,
      contactDesignation: data.contactDesignation,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  async function onSubmit(values: ContactPersonValues) {
    try {
      await saveSection("contact", values);
      toast.success("Contact Person berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <ContactPersonFields form={form} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Menyimpan..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

function LegalEntityTab({ data }: { data: CompanyProfileData }) {
  const queryClient = useQueryClient();
  const form = useForm<LegalInformationValues>({
    resolver: zodResolver(legalInformationSchema),
  });

  useEffect(() => {
    form.reset({
      nibNumber: data.nibNumber,
      nibIssueDate: data.nibIssueDate.slice(0, 10),
      nibDocumentPath: data.nibDocumentPath,
      kbliEntries: data.kbliEntries,
      kbliDocumentPath: data.kbliDocumentPath,
      notarialDeedNumber: data.notarialDeedNumber,
      notarialDeedIssueDate: data.notarialDeedIssueDate.slice(0, 10),
      notarialIssuingAuthority: data.notarialIssuingAuthority,
      notarialAmendmentInfo: data.notarialAmendmentInfo ?? "",
      notarialDocumentPath: data.notarialDocumentPath,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  async function onSubmit(values: LegalInformationValues) {
    try {
      await saveSection("legal", values);
      toast.success("Legal Entity berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan perubahan");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <LegalInformationFields form={form} />
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Menyimpan..." : "Save Changes"}
        </Button>
      </div>
    </form>
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
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={form.formState.isSubmitting}>
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-8">
      <div>
        <h1 className="text-lg font-semibold">Company Profile</h1>
        <p className="text-sm text-muted-foreground">
          Kelola data resmi perusahaan Anda. Setiap tab disimpan secara terpisah.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTab value="general">General Information</TabsTab>
          <TabsTab value="legal">Legal Entity</TabsTab>
          <TabsTab value="facilities">Facilities</TabsTab>
          <TabsTab value="contact">Contact Person</TabsTab>
        </TabsList>

        <TabsPanel value="general">
          <GeneralInformationTab data={data} />
        </TabsPanel>
        <TabsPanel value="legal">
          <LegalEntityTab data={data} />
        </TabsPanel>
        <TabsPanel value="facilities">
          <FacilitiesTab data={data} />
        </TabsPanel>
        <TabsPanel value="contact">
          <ContactPersonTab data={data} />
        </TabsPanel>
      </Tabs>
    </div>
  );
}
