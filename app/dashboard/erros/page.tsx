import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { DashboardHeader } from "../_components/dashboard-header";
import { DashboardSection } from "../_components/dashboard-section";

export const dynamic = "force-dynamic";

const TIPO_FEEDBACK_LABEL: Record<string, string> = {
  correcao_explicita: "Correção explícita",
  recast: "Recast",
  pedido_esclarecimento: "Pedido de esclarecimento",
  feedback_metalinguistico: "Feedback metalinguístico",
  elicitacao: "Elicitação",
  repeticao: "Repetição",
};

export default async function ErrosPage() {
  const db = supabaseAdmin();

  const { data: eventos } = await db
    .from("correction_events")
    .select("id, skill_item_id, tipo_feedback, erro_do_aluno, correcao, criado_em, skill_items(texto)")
    .eq("user_id", getLocalUserId())
    .order("criado_em", { ascending: false })
    .limit(30);

  type EventoRow = {
    id: string;
    tipo_feedback: string;
    erro_do_aluno: string | null;
    correcao: string;
    criado_em: string;
    skill_items: { texto: string } | null;
  };

  const lista = (eventos ?? []) as unknown as EventoRow[];

  const recorrencias = new Map<string, number>();
  for (const e of lista) {
    const chave = e.skill_items?.texto ?? "(dúvida geral)";
    recorrencias.set(chave, (recorrencias.get(chave) ?? 0) + 1);
  }
  const maisRecorrentes = [...recorrencias.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <>

      <DashboardHeader current="/dashboard/erros" />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">Aprendizado em movimento</p>
        <h1 className="font-display text-3xl">Diário de erros</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Correções e dúvidas registradas pelo professor durante suas
          conversas.
        </p>

        {maisRecorrentes.length > 0 && (
          <DashboardSection label="Mais recorrentes">
            <ul className="flex flex-wrap gap-3">
              {maisRecorrentes.map(([texto, count]) => (
                <li key={texto} className="envelope-tag">
                  {texto} ({count}×)
                </li>
              ))}
            </ul>
          </DashboardSection>
        )}

        <DashboardSection
          label="Histórico"
          action={
            lista.length > 0 && (
              <p className="text-xs text-ink-soft">
                {lista.length} registro{lista.length === 1 ? "" : "s"}
              </p>
            )
          }
        >
          {lista.length === 0 ? (
            <p className="text-ink-soft">
              Nenhuma correção registrada ainda — aparece aqui conforme você
              conversa com o Claude.
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
              {lista.map((e) => (
                <li key={e.id} className="px-3 py-4">
                  <div className="flex items-center gap-3">
                    <span className="envelope-tag">
                      {TIPO_FEEDBACK_LABEL[e.tipo_feedback] ?? e.tipo_feedback}
                    </span>
                    {e.skill_items?.texto && (
                      <span className="text-sm text-ink-soft">{e.skill_items.texto}</span>
                    )}
                  </div>
                  {e.erro_do_aluno && (
                    <p className="mt-2 text-sm text-stamp">{e.erro_do_aluno}</p>
                  )}
                  <p className="mt-1 text-sm">{e.correcao}</p>
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>
      </main>

    </>
  );
}
