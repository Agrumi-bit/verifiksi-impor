import { VkiFormPage } from "@/modules/applications/components/vki-form/vki-form-page";

type Props = { params: Promise<{ applicationNumber: string }>; searchParams: Promise<{ back?: string | string[] }> };

export default async function VerifikatorVkiFormPage({ params, searchParams }: Props) {
  const { applicationNumber } = await params;
  const { back } = await searchParams;
  return <VkiFormPage refId={applicationNumber} back={back} fallback="/verifikator-workspace/my-assignment" />;
}
