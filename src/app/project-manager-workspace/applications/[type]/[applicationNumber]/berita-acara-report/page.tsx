import { BeritaAcaraReport } from "@/modules/project-manager-workspace/components/berita-acara/berita-acara-report";

export default async function BeritaAcaraReportPage({ params }: { params: Promise<{ type: string; applicationNumber: string }> }) {
  const { type, applicationNumber } = await params;
  return <BeritaAcaraReport type={type} applicationNumber={applicationNumber} />;
}
