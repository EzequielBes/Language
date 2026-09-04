import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/mcp/shared";
import { progressoDoMilestone } from "@/lib/study-plan/progress";

export const dynamic = "force-dynamic";

const DOMINIO_LABEL: Record<string, string> = {
  vocabulario: "Vocabulário",
  gramatica: "Gramática",
  expressao: "Expressão",
};

interface MilestoneRow {
  id: string;
  ordem: number;
  can_do_statement: string;
  dominio_foco: string | null;
  nivel_cefr_alvo: string;
  status: "pendente" | "em_andamento" | "concluido";
  skill_item_tags: string[];
}

export default async function PlanoPage() {
  const db = supabaseAdmin();

  const { data: plan } = await db
    .from("study_plans")
    .select("id, criado_em, study_plan_items(*)")
    .eq("user_id", LOCAL_USER_ID)
    .eq("status", "ativo")
    .maybeSingle();

  const items = (
    (plan as unknown as { study_plan_items: MilestoneRow[] } | null)?.study_plan_items ?? []
  ).sort((a, b) => a.ordem - b.ordem);

  const milestones = await Promise.all(
    items.map(async (item) => ({
      ...item,
      progresso: await progressoDoMilestone(db, item.skill_item_tags),
    })),
  );

  return (
    <>
      <div className="airmail-stripe" />

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-lg tracking-tight">
            Correio
          </Link>
          <Link href="/dashboard" className="text-sm text-ink-soft hover:text-ink">
            Meu painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl">Plano de estudo</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Sequência de metas geradas a partir do seu objetivo e nível atual.
          Peça ao Claude para gerar ou atualizar o plano numa conversa.
        </p>

        {!plan ? (
          <p className="mt-8 text-ink-soft">
            Nenhum plano ativo ainda. Peça ao Claude para gerar um plano de
            estudo depois de definir seu objetivo e fazer uma avaliação.
          </p>
        ) : (
          <ol className="mt-8 space-y-5">
            {milestones.map((m) => {
              const concluido = m.status === "concluido";
              const pct = m.progresso && m.progresso.total > 0
                ? Math.round((m.progresso.conhecidos / m.progresso.total) * 100)
                : concluido
                  ? 100
                  : 0;

              return (
                <li
                  key={m.id}
                  className={`flex gap-4 border p-5 ${
                    concluido ? "border-line bg-paper" : "border-line bg-paper-shade"
                  }`}
                >
                  <span
                    className={`font-display text-2xl ${concluido ? "text-ink-soft" : "text-stamp"}`}
                  >
                    {m.ordem}
                  </span>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`font-display text-lg ${concluido ? "text-ink-soft line-through decoration-1" : ""}`}>
                        {m.can_do_statement}
                      </span>
                      <div
                        className="postmark shrink-0"
                        data-filled={concluido}
                        data-tone="stamp"
                        style={{ "--size": "2rem" } as React.CSSProperties}
                      >
                        {m.nivel_cefr_alvo}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      {m.dominio_foco && (
                        <span className="envelope-tag">{DOMINIO_LABEL[m.dominio_foco] ?? m.dominio_foco}</span>
                      )}
                      {m.progresso && m.progresso.total > 0 ? (
                        <div className="flex flex-1 items-center gap-2">
                          <div className="h-1.5 flex-1 bg-line">
                            <div
                              className={concluido ? "h-full bg-ink-soft" : "h-full bg-stamp"}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-ink-soft">
                            {m.progresso.conhecidos}/{m.progresso.total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-soft">Sem itens vinculados ainda</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </main>

      <div className="airmail-stripe" />
    </>
  );
}
