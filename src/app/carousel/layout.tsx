import type { Metadata } from "next";
import { BrandKitGuard } from "@/components/brand-kit/BrandKitGuard";

export const metadata: Metadata = {
  title: "Post laboratory Carrusel | Motor de Diseno Inteligente",
};

export default function CarouselLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandKitGuard>{children}</BrandKitGuard>;
}

