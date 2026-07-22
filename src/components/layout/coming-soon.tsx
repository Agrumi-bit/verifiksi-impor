import { Construction } from "lucide-react";

type Props = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Construction className="size-6 text-muted-foreground" />
      </span>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="text-xs text-muted-foreground">
        Modul ini akan tersedia di iterasi berikutnya.
      </p>
    </div>
  );
}
