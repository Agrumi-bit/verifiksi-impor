import type { Metadata } from "next";
// Self-hosted — no build-time network fetch to Google Fonts (next/font/google downloads font
// metadata from fonts.gstatic.com even in dev, which breaks the build entirely on any network
// that can't reach it). `geist` ships Vercel's own font as local files behind the exact same
// next/font/local API (same .variable names, drop-in). The rest are @fontsource CSS imports
// (static @font-face files bundled in node_modules, zero network) — their --font-* custom
// properties are declared once in globals.css instead of via a generated .variable string.
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// Surveyor/Technical-Analyst/Verifikator workspace typography (surveyor-theme.css `font-sv-*`
// tokens) — ported from a Stitch export that originally loaded these via raw <link> tags per
// workspace layout.
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/hanken-grotesk/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/600.css";
// Surveyor office/field report print previews.
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@fontsource/source-serif-4/700.css";
import "@fontsource/source-serif-4/800.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
// Verifikator document verification report print preview.
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "./globals.css";
import { Providers } from "./providers";
import { getBrandingSettings } from "@/lib/get-branding";

const geistSans = GeistSans;
const geistMono = GeistMono;

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();
  return { title: branding.appName, description: branding.appSubtitle };
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBrandingSettings();
  // Re-validated here (not just trusted from the PATCH schema) since this value is interpolated
  // directly into a raw <style> tag — defense in depth against any out-of-band DB write.
  const primary = HEX_COLOR.test(branding.primaryColor) ? branding.primaryColor : "#e0662e";
  const primaryForeground = HEX_COLOR.test(branding.primaryColorForeground) ? branding.primaryColorForeground : "#ffffff";

  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Material Symbols Outlined — an icon glyph font, not a typeface, so it can't move to
            next/font/google. Loaded once here (root layout) instead of duplicated per workspace
            layout. The eslint-plugin-next font rules assume the Pages Router's pages/_document.js
            and don't recognize the App Router root layout as their equivalent, so they still fire
            here even though this is already the single, correct, top-level place for it. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/google-font-display, @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <style
          // Overrides the shadcn `--primary` token app-wide with the admin-configured brand
          // color — everything already built on `bg-primary`/`text-primary-foreground` (admin
          // sidebar, login page) picks this up automatically. Workspace modules with their own
          // hardcoded hex palettes are a separate, much larger retrofit not covered by this.
          dangerouslySetInnerHTML={{
            __html: `:root{--primary:${primary};--primary-foreground:${primaryForeground};--sidebar-primary:${primary};--sidebar-primary-foreground:${primaryForeground};}`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
