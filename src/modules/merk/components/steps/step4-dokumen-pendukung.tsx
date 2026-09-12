"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";

import {
  getRequiredBrandDocuments,
  BRAND_DOCUMENT_CATEGORY_LABELS,
} from "../../document-requirements";
import type { MerkWizardValues } from "../../schema";
import { DocumentCompletenessSummary } from "./step4/document-completeness-summary";
import { TrademarkDocumentSection } from "./step4/trademark-document-section";
import { DocumentGroupSection } from "./step4/document-group-section";
import { QualityTestManager } from "./step4/quality-test-manager";

type Props = { form: UseFormReturn<MerkWizardValues> };

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID");
}

export function Step4DokumenPendukung({ form }: Props) {
  const { control, setValue, formState } = form;

  // Named useWatch calls (rather than a whole-object useWatch) keep each
  // value's real type — an unnamed watch widens every nested field to
  // "possibly undefined", which doesn't match the strict shapes
  // BrandDocumentUploadCard/DocumentGroupSection expect.
  const evidenceType = useWatch({ control, name: "evidenceType" });
  const ownerLocation = useWatch({ control, name: "ownerLocation" });
  const relationshipWithApiu = useWatch({ control, name: "relationshipWithApiu" });
  const representationType = useWatch({ control, name: "representationType" });
  const appointmentSource = useWatch({ control, name: "appointmentSource" });
  const agreementType = useWatch({ control, name: "agreementType" });
  const registrationNumber = useWatch({ control, name: "registrationNumber" });
  const trademarkClass = useWatch({ control, name: "trademarkClass" });
  const documents = useWatch({ control, name: "documents" }) ?? {};
  const productLabelDocumentation = useWatch({ control, name: "productLabelDocumentation" }) ?? [];
  const appointmentLetterNumber = useWatch({ control, name: "appointmentLetterNumber" });
  const appointmentStartDate = useWatch({ control, name: "appointmentStartDate" });
  const appointmentEndDate = useWatch({ control, name: "appointmentEndDate" });
  const agreementNumber = useWatch({ control, name: "agreementNumber" });
  const agreementStartDate = useWatch({ control, name: "agreementStartDate" });
  const agreementEndDate = useWatch({ control, name: "agreementEndDate" });

  const requirements = getRequiredBrandDocuments({
    evidenceType,
    ownerLocation,
    relationshipWithApiu,
    representationType,
    appointmentSource,
    agreementType,
  });

  const byCategory = (category: (typeof requirements)[number]["category"]) =>
    requirements.filter((r) => r.category === category);

  // "Do not duplicate metadata already entered in Step 1 or Step 2" — these
  // read-only notes surface Step 2's appointment/agreement numbers and dates
  // next to the document that proves them, instead of asking again.
  const contextNotes: Record<string, React.ReactNode> = {};
  if (appointmentLetterNumber || appointmentStartDate || appointmentEndDate) {
    const note = (
      <>
        Nomor: <b>{appointmentLetterNumber || "—"}</b> · Berlaku: {formatDate(appointmentStartDate)} –{" "}
        {formatDate(appointmentEndDate)}
      </>
    );
    contextNotes.importer_appointment = note;
    contextNotes.importer_appointment_from_brand_owner = note;
  }
  if (agreementNumber || agreementStartDate || agreementEndDate) {
    contextNotes.license_or_sublicense = (
      <>
        Nomor: <b>{agreementNumber || "—"}</b> (dari Step 2) · Berlaku: {formatDate(agreementStartDate)}{" "}
        – {formatDate(agreementEndDate)}
      </>
    );
  }

  function updateDocument(code: string, value: MerkWizardValues["documents"][string] | undefined) {
    const next = { ...form.getValues("documents") };
    if (value) next[code] = value;
    else delete next[code];
    setValue("documents", next, { shouldValidate: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <DocumentCompletenessSummary
        requirements={requirements}
        documents={documents}
        productLabelDocumentation={productLabelDocumentation}
      />

      <TrademarkDocumentSection
        requirement={requirements.find((r) => r.code === "trademark_evidence")!}
        evidenceType={evidenceType}
        registrationNumber={registrationNumber}
        trademarkClass={trademarkClass}
        value={documents.trademark_evidence}
        onChange={(value) => updateDocument("trademark_evidence", value)}
        error={(formState.errors.documents as Record<string, { message?: string }> | undefined)?.trademark_evidence?.message}
      />

      <DocumentGroupSection
        title={BRAND_DOCUMENT_CATEGORY_LABELS.representation}
        requirements={byCategory("representation")}
        documents={documents}
        onChangeDocument={updateDocument}
        contextNotes={contextNotes}
        errors={Object.fromEntries(
          Object.entries(formState.errors.documents ?? {}).map(([code, err]) => [code, err?.message]),
        )}
      />

      <DocumentGroupSection
        title={BRAND_DOCUMENT_CATEGORY_LABELS.official_representative_legal}
        requirements={byCategory("official_representative_legal")}
        documents={documents}
        onChangeDocument={updateDocument}
      />

      <DocumentGroupSection
        title={BRAND_DOCUMENT_CATEGORY_LABELS.import_authorization}
        requirements={byCategory("import_authorization")}
        documents={documents}
        onChangeDocument={updateDocument}
        contextNotes={contextNotes}
      />

      <DocumentGroupSection
        title={BRAND_DOCUMENT_CATEGORY_LABELS.product_compliance}
        requirements={byCategory("product_compliance")}
        documents={documents}
        onChangeDocument={updateDocument}
        multiFileValues={productLabelDocumentation}
        onChangeMultiFile={(next) => setValue("productLabelDocumentation", next, { shouldValidate: true })}
        multiFileError={formState.errors.productLabelDocumentation?.message as string | undefined}
      />

      <QualityTestManager form={form} />
    </div>
  );
}
