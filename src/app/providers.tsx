"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { Toaster } from "@/components/ui/sonner";

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ImpersonationBanner />
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
