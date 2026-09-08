import type { McpServer } from "@modelcontextprotocol/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- args variam por tool (zod-inferred), harness generico nao tipa entrada.
type ToolHandler = (args: any) => Promise<{ content: { type: "text"; text: string }[] }>;

/**
 * Substitui o McpServer real por um objeto que so captura os handlers
 * passados a registerTool — deixa testar as tools chamando o handler
 * direto, sem subir transporte stdio nenhum.
 */
export function createTestMcpServer() {
  const handlers = new Map<string, ToolHandler>();
  const server = {
    registerTool: (name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    },
  } as unknown as McpServer;
  return { server, handlers };
}

export function parseToolResult<T>(result: { content: { type: string; text: string }[] }): T {
  return JSON.parse(result.content[0]!.text) as T;
}
