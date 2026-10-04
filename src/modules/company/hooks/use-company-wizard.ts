"use client";

import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createEmptyLocation } from "@/modules/shared/schema";
import { useApiUKbliUtamaOptions } from "./use-api-u-kbli-utama";
import {
  API_U_KBLI_UTAMA_ERROR,
  companyWizardSchema,
  createEmptyContact,
  createEmptyTaxProofs,
  COMPANY_STEP_FIELD_NAMES,
  findDisallowedApiUKbliUtama,
  type CompanyWizardValues,
} from "../schema";

const TOTAL_STEPS = 6;

export function useCompanyWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const apiUAllowed = useApiUKbliUtamaOptions();

  const form = useForm<CompanyWizardValues>({
    resolver: zodResolver(companyWizardSchema) as Resolver<CompanyWizardValues>,
    mode: "onBlur",
    defaultValues: {
      companyWebsite: "",
      contacts: [createEmptyContact()],
      kbliEntries: [],
      hasAmendment: false,
      taxProofs: createEmptyTaxProofs(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      locations: [createEmptyLocation() as any],
    },
  });

  async function goNext() {
    const fields = COMPANY_STEP_FIELD_NAMES[currentStep] ?? [];
    const isValid = await form.trigger(fields);
    if (!isValid) return false;
    // The API-U KBLI Utama list lives in the database, so it can't be part of the Zod schema —
    // the Legal step checks it here (and the server checks it again on save).
    if (
      currentStep === 3 &&
      form.getValues("apiType") === "API-U" &&
      findDisallowedApiUKbliUtama(form.getValues("kbliEntries") ?? [], apiUAllowed) !== -1
    ) {
      form.setError("kbliEntries", { type: "custom", message: API_U_KBLI_UTAMA_ERROR });
      return false;
    }
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
