import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = fs.readFileSync(path.resolve(__dirname, "../page.tsx"), "utf8");
const actionSource = fs.readFileSync(
  path.resolve(__dirname, "../../actions/get-user-brand-kit.ts"),
  "utf8",
);
const contextSource = fs.readFileSync(
  path.resolve(__dirname, "../../../contexts/BrandKitContext.tsx"),
  "utf8",
);

describe("estado vacío de Brand Kit", () => {
  it("presenta un vacío confirmado como estado normal con creación disponible", () => {
    expect(pageSource).toContain("Todavía no tienes kits de marca");
    expect(pageSource).toContain("Nuevo kit de marca");
    expect(pageSource).not.toContain("La comprobación no devolvió un estado válido");
  });

  it("retira la traza temporal del servidor y del navegador", () => {
    expect(actionSource).not.toContain("__diag");
    expect(contextSource).not.toContain("result.__diag");
    expect(contextSource).not.toContain("JSON.stringify({ success: result.success");
  });
});
