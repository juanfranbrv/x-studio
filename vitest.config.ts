import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig "paths": { "@/*": ["./src/*"] } so test-loaded source
      // files can use the same "@/..." imports as the rest of the codebase.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["tests/**", "node_modules/**", "dist/**", ".next/**"],
  },
});
