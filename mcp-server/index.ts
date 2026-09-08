import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTools } from "@/lib/mcp/tools";
import { registerScenarioTools } from "@/lib/mcp/scenarios";
import { registerCoachingTools } from "@/lib/mcp/coaching";
import { registerStudyPlanTools } from "@/lib/mcp/study-plan";
import { registerLanguageProfileTools } from "@/lib/mcp/language-profiles";

// Claude Desktop inicia este processo sem herdar o .env.local do projeto —
// carrega explicitamente, resolvido pelo local do proprio arquivo (nao pelo
// cwd, que o Claude Desktop pode definir de outro jeito).
try {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  process.loadEnvFile(join(projectRoot, ".env.local"));
} catch {
  // sem .env.local ainda — supabaseAdmin() da um erro claro quando for usado
}

serveStdio(() => {
  const server = new McpServer(
    { name: "correio", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerTools(server);
  registerScenarioTools(server);
  registerCoachingTools(server);
  registerStudyPlanTools(server);
  registerLanguageProfileTools(server);
  return server;
});
