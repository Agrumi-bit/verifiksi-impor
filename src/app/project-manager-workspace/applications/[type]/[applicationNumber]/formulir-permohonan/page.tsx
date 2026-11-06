import { VkiFormPage } from "@/modules/applications/components/vki-form/vki-form-page";

type Props = { params: Promise<{ type: string; applicationNumber: string }>; searchParams: Promise<{ back?: string | string[] }> };

export default async function ProjectManagerVkiFormPage({ params, searchParams }: Props) {
  const { type, applicationNumber } = await params;
  const { back } = await searchParams;
  return <VkiFormPage refId={applicationNumber} back={back} fallback={`/project-manager-workspace/applications/${type}/${applicationNumber}`} />;
}
