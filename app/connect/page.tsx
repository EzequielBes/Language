import Link from "next/link";

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
          // Binario local direto (nao "npx tsx"): alguns builds do Claude
          // Desktop ignoram um "cwd" no config e sempre spawnam a partir de
          // outro diretorio (ex.: System32) — nesse caso "npx" baixa um tsx
          // avulso isolado, e o resolvedor de tsconfig-paths dele usa
          // process.cwd() (nao a pasta do arquivo de entrada) pra achar o
          // tsconfig.json, entao o alias "@/" nunca resolve.
          // TSX_TSCONFIG_PATH contorna isso de vez, funcionando com
          // qualquer cwd que o cliente use.
          command: `${projectPath}\\node_modules\\.bin\\tsx.CMD`,
          args: [`${projectPath}\\mcp-server\\index.ts`],
          env: {
            TSX_TSCONFIG_PATH: `${projectPath}\\tsconfig.json`,
          },
        },
      },
    },
    null,
    2,
  );

  return (
    <>

      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <Link href="/" className="font-display text-lg tracking-tight">
            Correio
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl flex-1 px-6 py-16">
        <p className="page-kicker">Primeira entrega</p>
        <h1 className="font-display text-3xl">Conectar ao Claude</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Isto não é uma API paga da Claude — é a sua própria conta Claude.ai
          (Pro ou Max), rodando no Claude Desktop com um servidor MCP local
          na sua máquina. A conversa acontece lá; nós só guardamos seu
          perfil, seu objetivo e o que você já aprendeu.
        </p>

        <ol className="paper-card mt-10 space-y-6 p-6 sm:p-8">
          {PASSOS.map((passo, i) => (
            <li key={passo} className="flex gap-4">
              <span className="font-display text-xl text-stamp">{i + 1}</span>
              <p className="pt-0.5">{passo}</p>
            </li>
          ))}
        </ol>

        <div className="quiet-card mt-10 p-4">
          <p className="text-xs text-ink-soft">
            Arquivo de configuração (Windows)
          </p>
          <code className="mt-1 block break-all font-mono text-sm">
            %APPDATA%\Claude\claude_desktop_config.json
          </code>
        </div>

        <div className="quiet-card mt-4 p-4">
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

      <footer className="mx-auto w-full max-w-3xl px-6 py-8 text-sm text-ink-soft">
        <Link href="/dashboard" className="hover:text-ink">
          Ver meu painel
        </Link>
      </footer>
    </>
  );
}
