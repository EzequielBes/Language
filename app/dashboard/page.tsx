import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/mcp/shared";

// Sempre dados ao vivo do Supabase — nunca prerenderizar estatico no build.
export const dynamic = "force-dynamic";

const DOMINIOS = [
  { chave: "vocabulario", rotulo: "Vocabulário" },
  { chave: "gramatica", rotulo: "Gramática" },
  { chave: "expressao", rotulo: "Expressão" },
] as const;

const OBJETIVOS: Record<string, string> = {
  trabalho: "Trabalho",
  viagem: "Viagem",
  entrevista: "Entrevista",
  dia_a_dia: "Dia a dia",
  custom: "Personalizado",
};

export default async function DashboardPage() {
  const db = supabaseAdmin();

  const [{ data: profile }, { data: goal }, { data: itemStatuses }, { data: lastSession }] =
    await Promise.all([
      db.from("profiles").select("*").eq("user_id", LOCAL_USER_ID).maybeSingle(),
      db
        .from("goals")
        .select("*")
        .eq("user_id", LOCAL_USER_ID)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from("user_item_status").select("status").eq("user_id", LOCAL_USER_ID),
      db
        .from("assessment_sessions")
        .select("*")
        .eq("user_id", LOCAL_USER_ID)
        .order("iniciado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const contagem = { conhecido: 0, aprendendo: 0, desconhecido: 0 };
  for (const row of itemStatuses ?? []) {
    contagem[row.status as keyof typeof contagem] += 1;
  }

  const nivelEstimado = (profile?.nivel_estimado ?? {}) as Record<string, string>;

  return (
    <>
      <div className="airmail-stripe" />

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-lg tracking-tight">
            Correio
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/dashboard/cenarios" className="text-ink-soft hover:text-ink">
              Cenários
            </Link>
            <Link href="/dashboard/flashcards" className="text-ink-soft hover:text-ink">
              Flashcards
            </Link>
            <Link href="/dashboard/atividades" className="text-ink-soft hover:text-ink">
              Atividades
            </Link>
            <Link href="/dashboard/plano" className="text-ink-soft hover:text-ink">
              Plano
            </Link>
            <Link href="/dashboard/erros" className="text-ink-soft hover:text-ink">
              Erros
            </Link>
            <Link href="/connect" className="text-ink-soft hover:text-ink">
              Conectar ao Claude
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl">Seu painel</h1>

        {!profile ? (
          <p className="mt-6 max-w-md text-ink-soft">
            Nenhum perfil ainda. Abra o{" "}
            <Link href="/connect" className="underline">
              Claude conectado
            </Link>{" "}
            e comece uma conversa — o primeiro contato cria seu perfil.
          </p>
        ) : (
          <div className="mt-10 space-y-12">
            <section>
              <p className="text-xs text-ink-soft">Objetivo</p>
              <div className="mt-2">
                {goal ? (
                  <span className="envelope-tag">{OBJETIVOS[goal.tipo] ?? goal.tipo}</span>
                ) : (
                  <p className="text-ink-soft">Ainda não definido.</p>
                )}
              </div>
              {profile.nivel_autodeclarado && (
                <p className="mt-3 text-sm text-ink-soft">
                  Nível declarado: {profile.nivel_autodeclarado}
                </p>
              )}
            </section>

            <section>
              <p className="text-xs text-ink-soft">Nível avaliado por domínio</p>
              <div className="mt-4 flex gap-6">
                {DOMINIOS.map((dominio) => {
                  const valor = nivelEstimado[dominio.chave];
                  return (
                    <div key={dominio.chave} className="flex flex-col items-center gap-2">
                      <div className="postmark" data-filled={Boolean(valor)}>
                        {valor ?? "–"}
                      </div>
                      <span className="text-xs text-ink-soft">{dominio.rotulo}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <p className="text-xs text-ink-soft">Itens estudados</p>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-correction">Conhecidos</dt>
                  <dd className="font-mono">{contagem.conhecido}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-ink-soft">Aprendendo</dt>
                  <dd className="font-mono">{contagem.aprendendo}</dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-ink-soft">Ainda não vistos</dt>
                  <dd className="font-mono">{contagem.desconhecido}</dd>
                </div>
              </dl>
            </section>

            <section>
              <p className="text-xs text-ink-soft">Última avaliação</p>
              <p className="mt-2">
                {lastSession
                  ? lastSession.status === "concluida"
                    ? "Concluída"
                    : lastSession.status === "em_andamento"
                      ? "Em andamento"
                      : "Abandonada"
                  : "Nenhuma ainda"}
              </p>
            </section>
          </div>
        )}
      </main>

      <div className="airmail-stripe" />
    </>
  );
}
