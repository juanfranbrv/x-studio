import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generados / vendor / temporales: NO son codigo del proyecto.
    // Sin estos, el navegador de debug aislado (.tmp/chrome-debug) y el
    // tooling local inyectaban ~82k warnings que ahogaban la senal real.
    "convex/_generated/**",
    ".tmp/**",
    ".agents/**",
    ".claude/**",
    ".gemini/**",
    ".opencode/**",
    "docs/legacy-compositions/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  // Guardarrail anti-regresion de tamano (Proyecto Calidad, docs/CALIDAD.md).
  // Umbral AGENTS.md §12 = ~300 lineas. En 'warn' para dar visibilidad de los
  // monolitos sin romper el gate mientras se trocean; subir a 'error' al acabar.
  {
    files: ["src/**/*.{ts,tsx}", "convex/**/*.ts"],
    rules: {
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
  },
]);

export default eslintConfig;
