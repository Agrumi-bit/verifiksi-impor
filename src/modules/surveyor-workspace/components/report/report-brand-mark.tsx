"use client";

import { BRANDING_REPORT_LOGO_URL, useBranding } from "@/modules/branding/use-branding";

/**
 * Letterhead mark for the surveyor field reports (Kantor / Gudang / Pabrik) — uses the
 * admin-uploaded report logo (System Configuration > Branding > "Logo Laporan") when set, same
 * source as the verifikator's `BrandMark`. Falls back to the original "IV" monogram + wordmark
 * when no report logo has been uploaded yet.
 *
 * `cover`: shown directly (no background plate) at a fixed 300x66 box, left-aligned, so the admin's
 * uploaded logo file controls its own look against the cover sheet's dark navy background.
 */
export function ReportBrandMark({ variant }: { variant: "head" | "cover" }) {
  const { data: branding } = useBranding();

  if (branding?.reportLogoPath) {
    if (variant === "cover") {
      return (
        <div className="rd-cover-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRANDING_REPORT_LOGO_URL}
            alt="Logo"
            style={{ width: 300, height: 66, objectFit: "contain", objectPosition: "left center" }}
          />
        </div>
      );
    }
    return (
      <div className="rd-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRANDING_REPORT_LOGO_URL} alt="Logo" style={{ height: 24, width: "auto", maxWidth: 140, objectFit: "contain" }} />
      </div>
    );
  }

  if (variant === "cover") {
    return (
      <div className="rd-cover-mark">
        <div className="rd-cover-mark-badge">IV</div>
        <div className="rd-cover-mark-text">INDUSTRIALVERIFY</div>
      </div>
    );
  }
  return (
    <div className="rd-brand">
      <div className="rd-brand-mark">IV</div>
      <div className="rd-brand-name">INDUSTRIALVERIFY</div>
    </div>
  );
}
