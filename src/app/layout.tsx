import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
