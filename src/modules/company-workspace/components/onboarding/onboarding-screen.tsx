"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { CompanyWizard } from "@/modules/company/components/company-wizard";

/**
 * First screen a self-registered ("Sign Up") company account sees — proxy.ts redirects any
 * PERUSAHAAN session without a `companyId` here (and away again once it's set, so this is
 * unreachable for an already-linked account). Reuses the admin's own company registration
 * wizard (same form, same `POST /api/companies`, already open to any logged-in user) instead of
 * a stripped-down duplicate, then links the newly created Company to this account.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draftId");

  // Resume the account's own in-progress "Tambah Perusahaan" draft automatically — filling
  // part of the form, closing the tab, and logging back in later should pick up where it left
  // off instead of a blank form. Only relevant on a fresh visit (no draftId in the URL yet).
  useEffect(() => {
    if (draftId) return;
    (async () => {
      const response = await fetch("/api/companies/drafts");
      if (!response.ok) return;
      const { data } = (await response.json()) as { data: { id: string }[] };
      if (data.length > 0) {
        router.replace(`/company-workspace/onboarding?draftId=${data[0].id}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  async function handleCreated(company: { id: string; companyName: string }) {
    const response = await fetch("/api/company-workspace/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: company.id }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      toast.error(body?.error ?? "Perusahaan tersimpan, tapi gagal menghubungkan ke akun Anda. Hubungi admin.");
      return;
    }
    router.push("/company-workspace");
    router.refresh();
  }

  return (
    <CompanyWizard
      title="Lengkapi Data Perusahaan Anda"
      backHref="/company-workspace/onboarding"
      newPath="/company-workspace/onboarding"
      onCreated={handleCreated}
    />
  );
}
