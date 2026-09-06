import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";

import "./globals.css";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { getLocale } from "@/lib/i18n/get-locale";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

// Proper Khat-e-Nastaleeq (Nastaliq script), self-hosted via next/font so
// every user sees the identical font regardless of what's installed on
// their device/OS - this is the whole point of an app-wide font, not a
// generic "Urdu-capable" system font that varies by platform. Only ever
// loaded/applied when Urdu is active (see globals.css's [lang="ur"] rule),
// so English-only sessions don't pay for a font they never render.
const notoNastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-urdu"
});

export const metadata: Metadata = {
  title: "School OS",
  description: "School management platform",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/icon-192.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  viewportFit: "cover"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  // Deliberately always "ltr": switching to Urdu translates text and swaps
  // in the Nastaliq typeface (keyed off `lang`, not `dir` - see globals.css)
  // without mirroring the page layout. A full RTL flip (sidebar moving
  // sides, content padding/borders swapping, icons reversing) was tried and
  // rejected - it made the two languages feel like different apps instead
  // of the same app in a different language.
  return (
    <html lang={locale} dir="ltr">
      <body className={`${inter.variable} ${notoNastaliq.variable} ${inter.className}`}>
        <LocaleProvider initialLocale={locale}>
          {children}
          <ServiceWorkerRegister />
        </LocaleProvider>
      </body>
    </html>
  );
}
