import { VkiFormPage } from "@/modules/applications/components/vki-form/vki-form-page";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string | string[] }> };

export default async function CustomerRelationVkiFormPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { back } = await searchParams;
  return <VkiFormPage refId={id} back={back} fallback={`/customer-relation-workspace/applications/${id}`} />;
}
