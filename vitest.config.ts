import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // testes de integracao fazem varias chamadas sequenciais reais ao
    // Supabase — o default de 5s estoura antes de terminar um fluxo.
    testTimeout: 20000,
  },
});
