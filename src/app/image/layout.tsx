import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post laboratory Imagen | Generador IA",
  description: "Modulo de imagen para crear creatives de marketing con IA respetando el ADN de marca.",
  keywords: ["imagen IA", "marketing visual", "branding", "generador de imagenes", "postlaboratory"],
};

import { BrandKitGuard } from "@/components/brand-kit/BrandKitGuard";

export default function ImageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandKitGuard>{children}</BrandKitGuard>;
}

