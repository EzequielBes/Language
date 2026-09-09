import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { gerarAtividadesPendentes } from "@/lib/activities/generate";
import { GENERATORS } from "@/lib/activities/registry";
import { getHeaderData } from "@/lib/profile/header-data";
import { DashboardHeader } from "../_components/dashboard-header";
import { ActivityCard, type Atividade } from "./activity-card";

export const dynamic = "force-dynamic";

async function gerarAtividades() {
  "use server";
  await gerarAtividadesPendentes(supabaseAdmin(), getLocalUserId());
  revalidatePath("/dashboard/atividades");
}

export default async function AtividadesPage() {
  const db = supabaseAdmin();

  const [{ data: pendentes }, headerData] = await Promise.all([
    db
      .from("activities")
      .select("id, tipo, dominio, nivel_cefr, payload")
      .eq("user_id", getLocalUserId())
      .eq("status", "pendente")
      .order("criado_em", { ascending: true }),
    getHeaderData(db),
  ]);

  const atividades: Atividade[] = (pendentes ?? [])
    .map((a) => {
      const gerador = GENERATORS[a.tipo];
      if (!gerador) return null;
      const payload = gerador.payloadPublico(
        a.payload as Record<string, unknown>,
      ) as Atividade["payload"];
      return { id: a.id, tipo: a.tipo, dominio: a.dominio, nivel: a.nivel_cefr, payload };
    })
    .filter((a): a is Atividade => a !== null);

  return (
    <>

      <DashboardHeader current="/dashboard/atividades" {...headerData} />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">Prática de poucos minutos</p>
        <h1 className="font-display text-3xl">Atividades</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Exercícios curtos montados a partir do que você ainda está
          aprendendo. Responder atualiza seu progresso do mesmo jeito que uma
          conversa ou um flashcard.
        </p>

        <form action={gerarAtividades} className="mt-6">
          <button
            type="submit"
            className="button-primary"
          >
            Gerar atividades
          </button>
        </form>

        {atividades.length === 0 ? (
          <p className="quiet-card mt-8 p-5 text-ink-soft">
            Nenhuma pendente. Gere novas acima — funciona melhor depois que
            você já conversou com o Claude ou fez uma avaliação de nível.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {atividades.map((atividade) => (
              <ActivityCard key={atividade.id} atividade={atividade} />
            ))}
          </div>
        )}
      </main>

    </>
  );
}
