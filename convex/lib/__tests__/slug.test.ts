import { describe, expect, it } from "vitest";
import { ensureUniqueSlug, slugify } from "../slug";

describe("slugify", () => {
  it("convierte un nombre legible en kebab-case", () => {
    expect(slugify("Editorial Minimal")).toBe("editorial-minimal");
  });

  it("elimina tildes y caracteres especiales del castellano", () => {
    expect(slugify("Diseño cálido")).toBe("diseno-calido");
    expect(slugify("Pop Art (vibrante)")).toBe("pop-art-vibrante");
  });

  it("colapsa separadores repetidos y recorta los de los extremos", () => {
    expect(slugify("  --Retro   /  Futurista--  ")).toBe("retro-futurista");
  });

  it("cae al valor por defecto cuando no queda nada utilizable", () => {
    expect(slugify("***")).toBe("estilo");
    expect(slugify("")).toBe("estilo");
    expect(slugify(undefined)).toBe("estilo");
    expect(slugify(42)).toBe("estilo");
  });

  it("limita la longitud sin dejar guiones colgando", () => {
    const result = slugify("a".repeat(80));
    expect(result).toHaveLength(60);
    expect(result.endsWith("-")).toBe(false);
  });
});

describe("ensureUniqueSlug", () => {
  it("devuelve el slug base cuando esta libre", () => {
    expect(ensureUniqueSlug("Pop Art", [])).toBe("pop-art");
    expect(ensureUniqueSlug("Pop Art", ["otro-estilo"])).toBe("pop-art");
  });

  it("anade sufijo numerico ante colisiones", () => {
    expect(ensureUniqueSlug("Pop Art", ["pop-art"])).toBe("pop-art-2");
    expect(ensureUniqueSlug("Pop Art", ["pop-art", "pop-art-2"])).toBe("pop-art-3");
  });

  it("respeta el limite de longitud al anadir el sufijo", () => {
    const largo = "b".repeat(80);
    const base = slugify(largo);
    const result = ensureUniqueSlug(largo, [base]);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("-2")).toBe(true);
  });

  it("ignora valores vacios en la lista de ocupados", () => {
    expect(ensureUniqueSlug("Pop Art", ["", "pop-art"])).toBe("pop-art-2");
  });
});
