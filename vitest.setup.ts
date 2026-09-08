import { fileURLToPath } from "node:url";

// Testes de integracao (lib/mcp/*.test.ts, app/api/**/*.test.ts) batem no
// Supabase real com a mesma .env.local do dev/mcp-server — nao ha banco
// local/mock. Ver getLocalUserId mockado por arquivo pra nao tocar o usuario
// "local" de producao.
try {
  process.loadEnvFile(fileURLToPath(new URL("./.env.local", import.meta.url)));
} catch {}
