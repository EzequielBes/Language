import Link from "next/link";

const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const OBJETIVOS = [
  {
    titulo: "Trabalho",
    texto: "Reuniões, e-mails e small talk com colegas que não falam a sua língua.",
  },
  {
    titulo: "Viagem",
    texto: "Pedir informação, resolver imprevistos e conversar com quem você encontra pelo caminho.",
  },
  {
    titulo: "Entrevista",
    texto: "Contar sua trajetória e responder sob pressão, no idioma da vaga.",
  },
  {
    titulo: "Dia a dia",
    texto: "Papo solto, sobre qualquer assunto que aparecer na roda.",
  },
];

const PASSOS = [
  {
    numero: "1",
    titulo: "Adicione o servidor local",
    texto: "Aponte o Claude Desktop pra esse projeto na sua máquina. Nenhuma assinatura nova — a conversa roda na sua própria conta Pro ou Max.",
  },
  {
    numero: "2",
    titulo: "Converse",
    texto: "Diga seu objetivo e comece a falar. O Claude pergunta, você responde, e cada resposta fica registrada.",
  },
  {
    numero: "3",
    titulo: "Acompanhe",
    texto: "Veja seu nível por vocabulário, gramática e expressão evoluir no seu painel, sessão após sessão.",
  },
];

export default function HomePage() {
  return (
    <>

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="font-display text-lg tracking-tight">Correio</span>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/connect" className="text-ink-soft hover:text-ink">
              Conectar ao Claude
            </Link>
            <Link href="/dashboard" className="text-ink-soft hover:text-ink">
              Meu painel
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-16 md:pt-24">
          <p className="page-kicker">Seu idioma, no seu ritmo</p>
          <h1 className="max-w-xl font-display text-4xl leading-[1.1] md:text-5xl">
            Aprenda o idioma que você precisa, conversando com o Claude que
            você já assina.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-soft">
            Sem assinatura de IA extra. Diga seu nível e escolha um motivo —
            trabalho, viagem, entrevista, dia a dia. Cada conversa fica mais
            afinada ao que você ainda precisa aprender.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3">
            <Link
              href="/connect"
              className="button-primary"
            >
              Conectar ao Claude
            </Link>
            <a href="#como-funciona" className="text-sm text-ink-soft hover:text-ink">
              Ver como funciona
            </a>
          </div>
        </section>

        <section className="border-y border-line bg-paper-shade">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <p className="max-w-md text-ink-soft">
              O nível vai de A1 a C2. Cada domínio — vocabulário, gramática,
              expressão — recebe seu próprio carimbo conforme a avaliação
              adaptativa entende o que você sabe.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {NIVEIS.map((nivel, i) => (
                <div
                  key={nivel}
                  className="postmark postmark-in"
                  data-filled={i < 2}
                  data-tone="stamp"
                  style={{ "--delay": `${i * 90}ms` } as React.CSSProperties}
                >
                  {nivel}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <p className="page-kicker">Um motivo para cada conversa</p>
          <h2 className="mt-2 font-display text-2xl">Para que você está aprendendo?</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-[var(--shadow)] sm:grid-cols-2">
            {OBJETIVOS.map((objetivo) => (
              <div key={objetivo.titulo} className="bg-paper p-6">
                <span className="envelope-tag">{objetivo.titulo}</span>
                <p className="mt-4 text-sm text-ink-soft">{objetivo.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-5xl px-6 py-16">
          <p className="page-kicker">Sem complicação</p>
          <h2 className="mt-2 font-display text-2xl">Como funciona</h2>
          <ol className="mt-8 grid gap-10 md:grid-cols-3">
            {PASSOS.map((passo) => (
              <li key={passo.numero}>
                <span className="font-display text-3xl text-stamp">{passo.numero}</span>
                <h3 className="mt-3 font-medium">{passo.titulo}</h3>
                <p className="mt-2 text-sm text-ink-soft">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-sm text-ink-soft">
        Roda local, na sua máquina, com o Claude Desktop.
      </footer>
    </>
  );
}
