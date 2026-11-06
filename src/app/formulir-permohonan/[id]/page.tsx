import { VkiFormPage } from "@/modules/applications/components/vki-form/vki-form-page";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ back?: string | string[] }> };

/** Admin — Formulir Permohonan VKI (standalone A4 page, outside the dashboard chrome). */
export default async function AdminVkiFormPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { back } = await searchParams;
  return <VkiFormPage refId={id} back={back} fallback={`/applications/${id}`} />;
}
