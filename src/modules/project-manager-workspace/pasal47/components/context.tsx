"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ReportingPeriod } from "../derive";
import type { Materiality, P47Dataset, P47Report, ReportStatus } from "../types";

export type DrawerSpec = { title: string; sub?: string; body: ReactNode };

export type Pasal47Ctx = {
  /** Dataset after the global filters. */
  ds: P47Dataset;
  /** Dataset before filters (for option lists and "dari N" figures). */
  full: P47Dataset;
  period: ReportingPeriod;
  report: P47Report;
  saveReport: (patch: { status?: ReportStatus; pmNote?: string; materiality?: Record<string, Materiality> }) => Promise<void>;
  saving: boolean;
  openDrawer: (spec: DrawerSpec) => void;
  go: (page: string) => void;
  activeFilters: [string, string][];
};

const Ctx = createContext<Pasal47Ctx | null>(null);

export function Pasal47Provider({ value, children }: { value: Pasal47Ctx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePasal47(): Pasal47Ctx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePasal47 must be used inside Pasal47Provider");
  return ctx;
}

export const fileHref = (path: string) => `/api/files?path=${encodeURIComponent(path)}`;
