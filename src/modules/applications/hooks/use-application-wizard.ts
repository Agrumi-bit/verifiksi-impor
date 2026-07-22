"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  applicationWizardSchema,
  createEmptyLocation,
  createEmptyProduct,
  STEP_FIELD_NAMES,
  type ApplicationWizardValues,
} from "../schema";
import { IMPLEMENTED_WIZARD_STEPS } from "../wizard-steps-meta";

export function useApplicationWizard() {
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<ApplicationWizardValues>({
    resolver: zodResolver(applicationWizardSchema),
    mode: "onBlur",
    defaultValues: {
      importTypes: [],
      companyType: "",
      companyWebsite: "",
      kbliEntries: [],
      locations: [createEmptyLocation()],
      nonIndustriDocuments: [],
      konsumsiDocuments: [],
      products: [createEmptyProduct()],
      declarationAccepted: false,
    },
  });

  async function goNext() {
    const fields = STEP_FIELD_NAMES[currentStep] ?? [];
    const isValid = await form.trigger(fields);
    if (!isValid) return false;
    setCurrentStep((step) => Math.min(IMPLEMENTED_WIZARD_STEPS, step + 1));
    return true;
  }

  function goBack() {
    setCurrentStep((step) => Math.max(1, step - 1));
  }

  function goToStep(step: number) {
    setCurrentStep(Math.min(IMPLEMENTED_WIZARD_STEPS, Math.max(1, step)));
  }

  return {
    form,
    currentStep,
    goNext,
    goBack,
    goToStep,
    isLastImplementedStep: currentStep === IMPLEMENTED_WIZARD_STEPS,
  };
}
