import type { Metadata } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk, Inter, JetBrains_Mono, Source_Serif_4, IBM_Plex_Sans, Archivo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getBrandingSettings } from "@/lib/get-branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Surveyor/Technical-Analyst/Verifikator workspace typography (surveyor-theme.css `font-sv-*`
// tokens) — ported from a Stitch export that originally loaded these via raw <link> tags per
// workspace layout.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
});
const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  weight: ["600"],
  subsets: ["latin"],
});

// Surveyor office/field report print previews.
const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
});
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

// Verifikator document verification report print preview.
const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} ${hankenGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} ${sourceSerif4.variable} ${ibmPlexSans.variable} ${archivo.variable} h-full antialiased`}
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
