"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createEmptyLocation } from "@/modules/shared/schema";
import {
  companyWizardSchema,
  COMPANY_STEP_FIELD_NAMES,
  type CompanyWizardValues,
} from "../schema";

const TOTAL_STEPS = 4;

export function useCompanyWizard() {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<CompanyWizardValues>({
    resolver: zodResolver(companyWizardSchema),
    mode: "onBlur",
    defaultValues: {
      companyType: "",
      companyWebsite: "",
      kbliEntries: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locations: [createEmptyLocation() as any],
    },
  });

  async function goNext() {
    const fields = COMPANY_STEP_FIELD_NAMES[currentStep] ?? [];
    const isValid = await form.trigger(fields);
    if (!isValid) return false;
    setCurrentStep((step) => Math.min(TOTAL_STEPS, step + 1));
    return true;
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function goToStep(step: number) {
    setCurrentStep(Math.min(TOTAL_STEPS, Math.max(1, step)));
  }

  return {
    form,
    currentStep,
    totalSteps: TOTAL_STEPS,
    goNext,
    goBack,
    goToStep,
    isLastStep: currentStep === TOTAL_STEPS,
  };
}
