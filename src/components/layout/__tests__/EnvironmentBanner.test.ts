import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const bannerSource = fs.readFileSync(
  path.resolve(__dirname, "../EnvironmentBanner.tsx"),
  "utf8",
);
const layoutSource = fs.readFileSync(
  path.resolve(__dirname, "../../../app/layout.tsx"),
  "utf8",
);

describe("EnvironmentBanner", () => {
  it("muestra datos de prueba fuera de producción y no renderiza banda en producción", () => {
    expect(bannerSource).toContain('if (environment === "production") return null');
    expect(bannerSource).toContain("LOCAL · datos de prueba");
    expect(bannerSource).toContain("PREVIEW · datos de prueba");
  });

  it("se monta globalmente y reserva altura para layouts fijos", () => {
    expect(layoutSource).toContain("<EnvironmentBanner environment={runtimeEnvironment} />");
    expect(layoutSource).toContain('"--environment-banner-height"');
  });

  it("se reduce a una franja de 8 px sin texto visible", () => {
    expect(bannerSource).toContain("h-2");
    expect(bannerSource).not.toContain("h-[30px]");
    expect(bannerSource).toContain("aria-label={label}");
    expect(bannerSource).not.toContain("\n      {label}\n");
    expect(layoutSource).toContain('? "0px" : "8px"');
  });
});
