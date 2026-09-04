import Link from "next/link";

// process.cwd() precisa refletir onde o projeto roda de verdade, nao o
// diretorio do build.
export const dynamic = "force-dynamic";

const PASSOS = [
  "Instale o Claude Desktop, se ainda não tiver.",
  "Abra o arquivo de configuração abaixo (crie se não existir).",
  "Cole o bloco JSON abaixo dentro dele.",
  "Reinicie o Claude Desktop.",
  "Comece uma conversa nova e diga o que você quer aprender.",
];

export default function ConnectPage() {
  const projectPath = process.cwd();
  const configJson = JSON.stringify(
    {
      mcpServers: {
        correio: {
          command: "npx",
          args: ["tsx", `${projectPath}\\mcp-server\\index.ts`],
        },
      },
    },
    null,
    2,
  );

  return (
    <>
      <div className="airmail-stripe" />

      <header className="border-b border-line">
        <div className="mx-auto max-w-2xl px-6 py-5">
          <Link href="/" className="font-display text-lg tracking-tight">
            Correio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl">Conectar ao Claude</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Isto não é uma API paga da Claude — é a sua própria conta Claude.ai
          (Pro ou Max), rodando no Claude Desktop com um servidor MCP local
          na sua máquina. A conversa acontece lá; nós só guardamos seu
          perfil, seu objetivo e o que você já aprendeu.
        </p>

        <ol className="mt-10 space-y-6 border-t border-line pt-8">
          {PASSOS.map((passo, i) => (
            <li key={passo} className="flex gap-4">
              <span className="font-display text-xl text-stamp">{i + 1}</span>
              <p className="pt-0.5">{passo}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 border border-line bg-paper-shade p-4">
          <p className="text-xs text-ink-soft">
            Arquivo de configuração (Windows)
          </p>
          <code className="mt-1 block break-all font-mono text-sm">
            %APPDATA%\Claude\claude_desktop_config.json
          </code>
        </div>

        <div className="mt-4 border border-line bg-paper-shade p-4">
          <p className="text-xs text-ink-soft">Conteúdo a adicionar</p>
          <pre className="mt-1 overflow-x-auto font-mono text-sm">{configJson}</pre>
        </div>

        <p className="mt-4 text-sm text-ink-soft">
          Já tem outros servidores MCP configurados? Só acrescente a chave{" "}
          <code className="font-mono">&quot;correio&quot;</code> dentro do{" "}
          <code className="font-mono">mcpServers</code> que já existe, em vez
          de substituir o arquivo inteiro.
        </p>
      </main>

      <div className="airmail-stripe" />
      <footer className="mx-auto w-full max-w-2xl px-6 py-8 text-sm text-ink-soft">
        <Link href="/dashboard" className="hover:text-ink">
          Ver meu painel
        </Link>
      </footer>
    </>
  );
}
