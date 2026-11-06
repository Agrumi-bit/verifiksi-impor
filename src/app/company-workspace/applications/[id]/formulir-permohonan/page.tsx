import { VkiFormPage } from "@/modules/applications/components/vki-form/vki-form-page";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string | string[] }> };

export default async function CompanyVkiFormPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { back } = await searchParams;
  return <VkiFormPage refId={id} back={back} fallback={`/company-workspace/applications/${id}`} />;
}
