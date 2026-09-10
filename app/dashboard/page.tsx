import Link from "next/link";
import { Flame } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { getHeaderData } from "@/lib/profile/header-data";
import { DashboardHeader } from "./_components/dashboard-header";
import { DashboardSection } from "./_components/dashboard-section";

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
  const userId = getLocalUserId();

  const [
    { data: profile, error: profileError },
    { data: goal, error: goalError },
    { data: itemStatuses, error: itemStatusesError },
    { data: lastSession, error: lastSessionError },
    { count: revisoesVencidas, error: revisoesError },
    { count: atividadesPendentes, error: atividadesError },
    { data: streak, error: streakError },
    headerData,
  ] = await Promise.all([
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    db
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from("user_item_status").select("status").eq("user_id", userId),
    db
      .from("assessment_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("iniciado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("user_item_status")
      .select("skill_item_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("proxima_revisao_em", new Date().toISOString()),
    db
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pendente"),
    db
      .from("streak_estado")
      .select("dias_atual, dias_recorde")
      .eq("singleton", true)
      .maybeSingle(),
    getHeaderData(db),
  ]);

  for (const [label, error] of [
    ["profile", profileError],
    ["goal", goalError],
    ["itemStatuses", itemStatusesError],
    ["lastSession", lastSessionError],
    ["revisoesVencidas", revisoesError],
    ["atividadesPendentes", atividadesError],
    ["streak", streakError],
  ] as const) {
    if (error) console.error(`[dashboard] ${label} query failed:`, error.message);
  }

  const contagem = { conhecido: 0, aprendendo: 0, desconhecido: 0 };
  for (const row of itemStatuses ?? []) {
    contagem[row.status as keyof typeof contagem] += 1;
  }

  const nivelEstimado = (profile?.nivel_estimado ?? {}) as Record<string, string>;

  const diasAtual = streak?.dias_atual ?? 0;
  const diasRecorde = streak?.dias_recorde ?? 0;

  return (
    <>

      <DashboardHeader current="/dashboard" {...headerData} />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">Seu cantinho de estudo</p>
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
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardSection label="Hoje" className="lg:col-span-2">
              {(revisoesVencidas ?? 0) === 0 && (atividadesPendentes ?? 0) === 0 ? (
                <p className="text-ink-soft">Tudo em dia — nada esperando revisão agora.</p>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
                  {(revisoesVencidas ?? 0) > 0 && (
                    <li className="flex items-center justify-between px-3 py-3">
                      <Link href="/dashboard/flashcards" className="hover:underline">
                        {revisoesVencidas} revis{revisoesVencidas === 1 ? "ão" : "ões"} vencida
                        {revisoesVencidas === 1 ? "" : "s"}
                      </Link>
                      <div className="postmark" data-filled={true} data-tone="stamp" style={{ "--size": "2rem" } as React.CSSProperties}>
                        {revisoesVencidas}
                      </div>
                    </li>
                  )}
                  {(atividadesPendentes ?? 0) > 0 && (
                    <li className="flex items-center justify-between px-3 py-3">
                      <Link href="/dashboard/atividades" className="hover:underline">
                        {atividadesPendentes} atividade{atividadesPendentes === 1 ? "" : "s"} esperando
                        resposta
                      </Link>
                      <div className="postmark" style={{ "--size": "2rem" } as React.CSSProperties}>
                        {atividadesPendentes}
                      </div>
                    </li>
                  )}
                </ul>
              )}
            </DashboardSection>

            <DashboardSection label="Sequência" className="">
              <div className="flex items-center gap-3">
                <Flame
                  size={28}
                  strokeWidth={1.75}
                  className={diasAtual > 0 ? "text-stamp" : "text-ink-soft"}
                  aria-hidden="true"
                />
                <div>
                  <p className="font-display text-2xl">
                    {diasAtual} dia{diasAtual === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-ink-soft">seguido{diasAtual === 1 ? "" : "s"}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                Recorde: {diasRecorde} dia{diasRecorde === 1 ? "" : "s"}
              </p>
            </DashboardSection>

            <DashboardSection label="Objetivo" className="">
              {goal ? (
                <span className="envelope-tag">{OBJETIVOS[goal.tipo] ?? goal.tipo}</span>
              ) : (
                <p className="text-ink-soft">Ainda não definido.</p>
              )}
              {profile.nivel_autodeclarado && (
                <p className="mt-3 text-sm text-ink-soft">
                  Nível declarado: {profile.nivel_autodeclarado}
                </p>
              )}
            </DashboardSection>

            <DashboardSection label="Nível avaliado por domínio" className="">
              <div className="flex gap-6">
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
            </DashboardSection>

            <DashboardSection label="Itens estudados" className="">
              <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
                <div className="flex items-center justify-between px-3 py-3">
                  <dt className="text-correction">Conhecidos</dt>
                  <dd className="font-mono">{contagem.conhecido}</dd>
                </div>
                <div className="flex items-center justify-between px-3 py-3">
                  <dt className="text-ink-soft">Aprendendo</dt>
                  <dd className="font-mono">{contagem.aprendendo}</dd>
                </div>
                <div className="flex items-center justify-between px-3 py-3">
                  <dt className="text-ink-soft">Ainda não vistos</dt>
                  <dd className="font-mono">{contagem.desconhecido}</dd>
                </div>
              </dl>
            </DashboardSection>

            <DashboardSection label="Última avaliação" className="">
              <p>
                {lastSession
                  ? lastSession.status === "concluida"
                    ? "Concluída"
                    : lastSession.status === "em_andamento"
                      ? "Em andamento"
                      : "Abandonada"
                  : "Nenhuma ainda"}
              </p>
            </DashboardSection>
          </div>
        )}
      </main>

    </>
  );
}
