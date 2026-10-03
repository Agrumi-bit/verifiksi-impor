"use client";

import { Component, type ReactNode } from "react";

type Props = {
  /** Shown in the fallback message so the user knows which part of the page failed to render. */
  label: string;
  children: ReactNode;
};

type State = { hasError: boolean };

/**
 * Isolates one page section from a render crash elsewhere on the same page — React error
 * boundaries only exist as class components (no hook equivalent as of React 19). Without this, a
 * single broken section (e.g. a legacy-shaped payload field) takes down the entire detail page
 * instead of just that section; see normalizeKonsumsiPayload's own comment for the data-shape bug
 * this was first added for.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[SectionErrorBoundary] "${this.props.label}" failed to render:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="flex flex-col gap-1 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="text-sm font-semibold text-destructive">{this.props.label}</h2>
          <p className="text-sm text-muted-foreground">
            Bagian ini gagal ditampilkan karena format data yang tidak terduga. Bagian lain pada
            halaman ini tetap dapat digunakan.
          </p>
        </section>
      );
    }
    return this.props.children;
  }
}
