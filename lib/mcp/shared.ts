// Uso local/pessoal: sem login nem token pra verificar (o servidor MCP roda
// local via stdio, iniciado pelo Claude Desktop; o dashboard so e acessado
// via localhost). A identidade agora depende do idioma ativo no momento da
// chamada (multi-perfil estilo Duolingo) — ver lib/profile/active-profile.ts.
export { getLocalUserId } from "@/lib/profile/active-profile";

export function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

// Loga o erro real (tabela/coluna/constraint) so no servidor; o que volta
// para o Claude/usuario e generico, para nao vazar detalhes internos do banco.
export function dbFail(error: { message: string }): never {
  console.error("[mcp] falha no banco:", error.message);
  throw new Error("Nao foi possivel completar a operacao. Tente novamente.");
}
