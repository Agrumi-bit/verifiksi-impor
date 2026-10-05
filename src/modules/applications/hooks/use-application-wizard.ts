"use client";

import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  applicationWizardSchema,
  createEmptyLocation,
  createEmptyNonIndustriDocuments,
  VIU_STEP_FIELD_NAMES,
  VKI_STEP_FIELD_NAMES,
  VKI_SUPPORT_DOC_DEFS,
  type ApplicationWizardValues,
} from "../schema";
import { createEmptyKonsumsiFinancialDocuments } from "../viu-schemes/konsumsi/schema";
import { findDisallowedViuImportType, viuKbliRequirementMessage } from "../viu-kbli-requirements";
import { getViuWizardSteps, VKI_WIZARD_STEPS } from "../wizard-steps-meta";

export function useApplicationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  // Steps 1 (Company) and 2 (Application Information) must be completed before
  // the rest of the wizard is reachable. Once cleared once, every other step
  // is free to jump between in any order, filled or not.
  const [gatePassed, setGatePassed] = useState(false);

  const form = useForm<ApplicationWizardValues>({
    resolver: zodResolver(applicationWizardSchema) as Resolver<ApplicationWizardValues>,
    mode: "onBlur",
    defaultValues: {
      importTypes: [],
      companyId: "",
      companyApiType: "",
      companyType: "",
      companyWebsite: "",
      kbliEntries: [],
      locations: [createEmptyLocation()],
      applicationBrands: [],
      partnerIndustriEntries: [],
      nonIndustriDocuments: createEmptyNonIndustriDocuments(),
      konsumsiDocuments: [],
      konsumsiFinancialDocuments: createEmptyKonsumsiFinancialDocuments(),
      // [] here, not a seeded empty row — materialType/hsCode are only required for Bahan Baku
      // Industri/Non Industri and VKI, never for Barang Konsumsi (see productItemSchema's own
      // comment). A static seeded row would otherwise sit unvalidated-but-present on a
      // Konsumsi-only application forever. Step6ProductInformation / VkiStep8Product each append
      // their own first empty row once their own scheme condition says they actually need one.
      products: [],
      vkiSupportDocs: VKI_SUPPORT_DOC_DEFS.map((def) => ({ key: def.key })),
      electricityMonths: [],
      tenagaKerjaEntries: [],
      machines: [],
      rawMaterials: [],
      capacity: [],
      productionQty: [],
      rawMaterialUsage: [],
      sales: [],
      declarationAccepted: false,
    },
  });

  const verificationType = useWatch({ control: form.control, name: "verificationType" });
  const importTypes = useWatch({ control: form.control, name: "importTypes" });
  const isVki = verificationType === "VKI";
  const activeSteps = isVki ? VKI_WIZARD_STEPS : getViuWizardSteps(importTypes ?? []);
  const activeFieldNames = isVki ? VKI_STEP_FIELD_NAMES : VIU_STEP_FIELD_NAMES;
  const totalSteps = activeSteps.length;

  function clampStep(step: number) {
    return Math.min(totalSteps, Math.max(1, step));
  }

  /** Jumps to any step. Steps 1-2 are only gated once, on the way out. */
  async function goToStep(step: number) {
    const target = clampStep(step);
    if (!gatePassed) {
      if (target >= 2 && currentStep === 1) {
        const step1Valid = await form.trigger(activeFieldNames.company ?? []);
        if (!step1Valid) {
          setCurrentStep(1);
          return false;
        }
      }
      if (target > 2) {
        const step2Valid = await form.trigger(activeFieldNames["application-info"] ?? []);
        if (!step2Valid) {
          setCurrentStep(2);
          return false;
        }
        // VIU type ↔ company KBLI (Permenperin 27/2025) — the schema only runs this rule at
        // Submit, so gate it here too rather than letting an ineligible type through.
        if (!isVki) {
          const disallowed = findDisallowedViuImportType(
            form.getValues("importTypes") ?? [],
            form.getValues("companyApiType"),
            form.getValues("kbliEntries"),
          );
          if (disallowed) {
            form.setError("importTypes", { type: "custom", message: viuKbliRequirementMessage(disallowed) });
            setCurrentStep(2);
            return false;
          }
        }
        setGatePassed(true);
      }
    }

    // VIU Konsumsi's "Dokumen Label Produk" (2 documents) and "Product Information" (Merek x Sub
    // Kelompok certificate coverage) feed real Submit-blocking rules that are easy to silently
    // skip past — unlike every other step here, these two are gated moving forward (never
    // backward; going back is never blocked). Triggering validation here also populates
    // `form.formState.errors` for these fields, which is what the step circle's own
    // done/invalid checkmark reads — so this single gate fixes both "Lanjut past an incomplete
    // step" and "false ✓ on an incomplete step" at once.
    if (target > currentStep && !isVki && (importTypes ?? []).includes("BARANG_KONSUMSI")) {
      const currentKey = activeSteps.find((s) => s.step === currentStep)?.key;
      if (currentKey === "quality-test" || currentKey === "product-info") {
        const stepValid = await form.trigger(activeFieldNames[currentKey] ?? []);
        if (!stepValid) return false;
      }
    }

    // Step 5 "Location Information" requires Kantor + Gudang (VIU) or Kantor + Pabrik (VKI) —
    // see applyRequiredLocationsRule in schema.ts, the same rule Submit enforces server-side.
    // Gated forward-only like the Konsumsi steps above, for both VIU and VKI.
    if (target > currentStep) {
      const currentKey = activeSteps.find((s) => s.step === currentStep)?.key;
      if (currentKey === "location") {
        const stepValid = await form.trigger(activeFieldNames.location ?? []);
        if (!stepValid) return false;
      }
    }

    setCurrentStep(target);
    return true;
  }

  async function goNext() {
    return goToStep(currentStep + 1);
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  /** Used only when resuming a saved draft — restores position without re-validating. */
  function restoreStep(step: number) {
    const target = clampStep(step);
    if (target > 2) setGatePassed(true);
    setCurrentStep(target);
  }

  return {
    form,
    currentStep,
    goNext,
    goBack,
    goToStep,
    restoreStep,
    activeSteps,
    activeFieldNames,
    isVki,
    isLastImplementedStep: currentStep === totalSteps,
  };
}
