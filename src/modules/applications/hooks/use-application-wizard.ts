"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  applicationWizardSchema,
  createEmptyLocation,
  createEmptyProduct,
  VIU_STEP_FIELD_NAMES,
  VKI_STEP_FIELD_NAMES,
  VKI_SUPPORT_DOC_DEFS,
  type ApplicationWizardValues,
} from "../schema";
import { VIU_WIZARD_STEPS, VKI_WIZARD_STEPS } from "../wizard-steps-meta";

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
      nonIndustriDocuments: [],
      konsumsiDocuments: [],
      products: [createEmptyProduct()],
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

  const verificationType = form.watch("verificationType");
  const isVki = verificationType === "VKI";
  const activeSteps = isVki ? VKI_WIZARD_STEPS : VIU_WIZARD_STEPS;
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
        const step1Valid = await form.trigger(activeFieldNames[1] ?? []);
        if (!step1Valid) {
          setCurrentStep(1);
          return false;
        }
      }
      if (target > 2) {
        const step2Valid = await form.trigger(activeFieldNames[2] ?? []);
        if (!step2Valid) {
          setCurrentStep(2);
          return false;
        }
        setGatePassed(true);
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
