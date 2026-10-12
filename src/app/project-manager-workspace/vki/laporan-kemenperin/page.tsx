import type { Metadata } from "next";
import { Suspense } from "react";

import { VkiModule } from "@/modules/project-manager-workspace/pasal47/vki/components/vki-module";

export const metadata: Metadata = {
  title: "Laporan Kemenperin VKI — Project Manager Workspace",
};

/** Laporan Kemenperin VKI (Pelaporan Pasal 47): workspace for the Project Manager. */
export default function ProjectManagerVkiKemenperinPage() {
  return (
    <div className="p-8">
      {/* VkiModule reads the period from the URL (useSearchParams), which a statically prerendered page must wrap in Suspense. */}
      <Suspense>
        <VkiModule />
      </Suspense>
    </div>
  );
}
