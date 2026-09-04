import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/mcp/shared";
import { gerarAtividadesPendentes } from "@/lib/activities/generate";
import { GENERATORS } from "@/lib/activities/registry";
import { ActivityCard, type Atividade } from "./activity-card";

export const dynamic = "force-dynamic";

async function gerarAtividades() {
  "use server";
  await gerarAtividadesPendentes(supabaseAdmin(), LOCAL_USER_ID);
  revalidatePath("/dashboard/atividades");
}

export default async function AtividadesPage() {
  const db = supabaseAdmin();

  const { data: pendentes } = await db
    .from("activities")
    .select("id, tipo, dominio, nivel_cefr, payload")
    .eq("user_id", LOCAL_USER_ID)
    .eq("status", "pendente")
    .order("criado_em", { ascending: true });

  const atividades: Atividade[] = (pendentes ?? [])
    .map((a) => {
      const gerador = GENERATORS[a.tipo];
      if (!gerador) return null;
      const payload = gerador.payloadPublico(a.payload as Record<string, unknown>) as {
        pergunta: string;
        opcoes: string[];
      };
      return { id: a.id, dominio: a.dominio, nivel: a.nivel_cefr, payload };
    })
    .filter((a): a is Atividade => a !== null);

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
        <h1 className="font-display text-3xl">Atividades</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Exercícios curtos montados a partir do que você ainda está
          aprendendo. Responder atualiza seu progresso do mesmo jeito que uma
          conversa ou um flashcard.
        </p>

        <form action={gerarAtividades} className="mt-6">
          <button
            type="submit"
            className="border border-ink bg-ink px-5 py-2.5 text-sm text-paper hover:bg-stamp hover:border-stamp"
          >
            Gerar atividades
          </button>
        </form>

        {atividades.length === 0 ? (
          <p className="mt-8 text-ink-soft">
            Nenhuma pendente. Gere novas acima — funciona melhor depois que
            você já conversou com o Claude ou fez uma avaliação de nível.
          </p>
        ) : (
          <div className="mt-8 space-y-6">
            {atividades.map((atividade) => (
              <ActivityCard key={atividade.id} atividade={atividade} />
            ))}
          </div>
        )}
      </main>

      <div className="airmail-stripe" />
    </>
  );
}
