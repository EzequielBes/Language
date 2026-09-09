import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { type VocabularioItem } from "@/lib/vocabulario/export";
import { getHeaderData } from "@/lib/profile/header-data";
import { DashboardHeader } from "../_components/dashboard-header";
import { DashboardSection } from "../_components/dashboard-section";

export const dynamic = "force-dynamic";

const DOMINIO_LABEL: Record<string, string> = {
  vocabulario: "Vocabulário",
  gramatica: "Gramática",
  expressao: "Expressão",
};

type Row = {
  skill_items: { texto: string; tipo: string; nivel_cefr: string; definicao: string | null } | null;
};

export default async function VocabularioPage() {
  const db = supabaseAdmin();

  const [{ data: rows }, headerData] = await Promise.all([
    db
      .from("user_item_status")
      .select("skill_items(texto, tipo, nivel_cefr, definicao)")
      .eq("user_id", getLocalUserId())
      .eq("status", "conhecido"),
    getHeaderData(db),
  ]);

  const itens: VocabularioItem[] = ((rows ?? []) as unknown as Row[])
    .filter((row) => row.skill_items !== null)
    .map((row) => ({
      texto: row.skill_items!.texto,
      dominio: row.skill_items!.tipo,
      nivel: row.skill_items!.nivel_cefr,
      definicao: row.skill_items!.definicao,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto));

  const porDominio = new Map<string, VocabularioItem[]>();
  for (const item of itens) {
    const lista = porDominio.get(item.dominio) ?? [];
    lista.push(item);
    porDominio.set(item.dominio, lista);
  }

  return (
    <>
      <DashboardHeader current="/dashboard/vocabulario" {...headerData} />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">O que já é seu</p>
        <h1 className="font-display text-3xl">Meu vocabulário</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Tudo que você já marcou como conhecido em avaliações, flashcards,
          atividades e conversas.
        </p>

        <DashboardSection
          label="Itens dominados"
          action={
            itens.length > 0 && (
              <a href="/api/vocabulario/export" download="meu-vocabulario.csv" className="text-xs underline">
                Baixar CSV
              </a>
            )
          }
        >
          {itens.length === 0 ? (
            <p className="text-ink-soft">
              Nenhum item dominado ainda — vai aparecendo aqui conforme você
              acerta nas avaliações, flashcards e atividades.
            </p>
          ) : (
            <div className="space-y-6">
              {[...porDominio.entries()].map(([dominio, lista]) => (
                <div key={dominio}>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                    {DOMINIO_LABEL[dominio] ?? dominio} ({lista.length})
                  </p>
                  <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
                    {lista.map((item) => (
                      <li key={item.texto} className="flex items-center justify-between gap-3 px-3 py-3">
                        <div>
                          <p className="font-medium">{item.texto}</p>
                          {item.definicao && (
                            <p className="text-sm text-ink-soft">{item.definicao}</p>
                          )}
                        </div>
                        <div
                          className="postmark shrink-0"
                          data-filled={true}
                          style={{ "--size": "2rem" } as React.CSSProperties}
                        >
                          {item.nivel}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </main>
    </>
  );
}
