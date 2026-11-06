import { loadVkiForm } from "@/modules/applications/vki-form/load.server";
import { vkiFormToDocx } from "@/modules/applications/vki-form/docx.server";

/** Formulir Permohonan VKI as a Word document (.docx). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { form, error } = await loadVkiForm(decodeURIComponent(id));
  if (error) return error;
  const file = vkiFormToDocx(form);
  const name = `Formulir-Permohonan-VKI-${form.applicationNumber}.docx`;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
