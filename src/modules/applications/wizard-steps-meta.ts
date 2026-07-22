import {
  Building2,
  Eye,
  FileStack,
  FileText,
  Hash,
  MapPin,
  Package,
  Send,
  type LucideIcon,
} from "lucide-react";

export type WizardStepMeta = {
  step: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  implemented: boolean;
};

export const WIZARD_STEPS: WizardStepMeta[] = [
  {
    step: 1,
    title: "Application Information",
    subtitle: "Type, category & reference",
    icon: Hash,
    implemented: true,
  },
  {
    step: 2,
    title: "Company Information",
    subtitle: "Firm details & contacts",
    icon: Building2,
    implemented: true,
  },
  {
    step: 3,
    title: "Legal Information",
    subtitle: "Licenses & registrations",
    icon: FileText,
    implemented: true,
  },
  {
    step: 4,
    title: "Location Information",
    subtitle: "Factory & GPS address",
    icon: MapPin,
    implemented: true,
  },
  {
    step: 5,
    title: "Support Document",
    subtitle: "Upload dokumen pendukung",
    icon: FileStack,
    implemented: true,
  },
  {
    step: 6,
    title: "Product Information",
    subtitle: "Detail produk & material",
    icon: Package,
    implemented: true,
  },
  {
    step: 7,
    title: "Preview",
    subtitle: "Tinjau sebelum submit",
    icon: Eye,
    implemented: true,
  },
  {
    step: 8,
    title: "Submit",
    subtitle: "Kirim permohonan",
    icon: Send,
    implemented: true,
  },
];

export const TOTAL_WIZARD_STEPS = WIZARD_STEPS.length;
export const IMPLEMENTED_WIZARD_STEPS = WIZARD_STEPS.filter(
  (step) => step.implemented,
).length;
