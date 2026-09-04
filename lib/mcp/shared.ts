// Uso local/pessoal: um usuario so, identificado por uma constante fixa —
// nao ha login nem token para verificar (o servidor MCP roda local via
// stdio, iniciado pelo Claude Desktop; o dashboard so e acessado via
// localhost). Ambos usam essa mesma identidade.
export const LOCAL_USER_ID = "local";

export function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

// Loga o erro real (tabela/coluna/constraint) so no servidor; o que volta
// para o Claude/usuario e generico, para nao vazar detalhes internos do banco.
export function dbFail(error: { message: string }): never {
  console.error("[mcp] falha no banco:", error.message);
  throw new Error("Nao foi possivel completar a operacao. Tente novamente.");
}
