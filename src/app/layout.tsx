import type { Metadata } from "next";
import { Suspense } from "react";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { DynamicThemeProvider } from "@/components/providers/DynamicThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { BrandKitProvider } from "@/contexts/BrandKitContext";
import { UIProvider } from "@/contexts/UIContext";
import { Toaster } from "@/components/ui/toaster";
import { ReferralTracker } from "@/components/providers/ReferralTracker";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: `${brand.name} | Crea contenido visual con IA`,
  description: "Plataforma de generacion de assets de marketing visual con IA que respeta el ADN de tu marca.",
  keywords: ["IA", "diseno", "marketing", "branding", "generacion de imagenes", "carruseles", "contenido visual"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
    other: [
      { rel: "manifest", url: "/site.webmanifest" },
    ],
  },
  openGraph: {
    title: `${brand.name} | Crea contenido visual con IA`,
    description: "Plataforma de generacion de assets de marketing visual con IA que respeta el ADN de tu marca.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 1200 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@400;500;600;700&display=swap" />
      </head>
      <body
        className={cn(
          "min-h-screen font-sans antialiased overflow-x-hidden",
          "bg-background"
        )}
      >
        <ConvexClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <I18nProvider>
              <DynamicThemeProvider>
                <BrandKitProvider>
                  <UIProvider>
                    <div className="relative flex min-h-dvh flex-col">
                      <Suspense fallback={null}>
                        <ReferralTracker />
                      </Suspense>
                      <main className="flex-1">
                        {children}
                      </main>
                    </div>
                    <Toaster />
                  </UIProvider>
                </BrandKitProvider>
              </DynamicThemeProvider>
            </I18nProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
