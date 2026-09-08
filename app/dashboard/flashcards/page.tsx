import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { orderUserItemStatusByPriority } from "@/lib/skill-items/rank";
import { DashboardHeader } from "../_components/dashboard-header";
import { FlashcardDeck, type Flashcard } from "./flashcard-deck";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const db = supabaseAdmin();

  // user_item_status ja e filtrado por user_id, que agora e por-idioma
  // (lib/profile/active-profile.ts) — nao precisa filtrar skill_items.idioma
  // separado, cada perfil de idioma so acumula status dos itens do seu idioma.
  const { data: rows } = await orderUserItemStatusByPriority(
    db
      .from("user_item_status")
      .select(
        "skill_item_id, status, streak, ultima_revisao, skill_items(texto, tipo, nivel_cefr, prioridade, definicao)",
      )
      .eq("user_id", getLocalUserId())
      .neq("status", "conhecido"),
  ).limit(20);

  type Row = {
    skill_item_id: string;
    status: "aprendendo" | "desconhecido";
    streak: number;
    skill_items: { texto: string; tipo: string; nivel_cefr: string; definicao: string | null } | null;
  };

  const cards: Flashcard[] = ((rows ?? []) as unknown as Row[])
    .filter((row) => row.skill_items !== null)
    .map((row) => ({
      skillItemId: row.skill_item_id,
      texto: row.skill_items!.texto,
      dominio: row.skill_items!.tipo,
      nivel: row.skill_items!.nivel_cefr,
      definicao: row.skill_items!.definicao,
      status: row.status,
      streak: row.streak,
    }));

  return (
    <>

      <DashboardHeader current="/dashboard/flashcards" />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">Revisão com calma</p>
        <h1 className="font-display text-3xl">Flashcards</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Itens que você ainda está aprendendo ou não conhece, vindos das suas
          avaliações e conversas. Toque no cartão pra avaliar se você lembrou.
        </p>

        <FlashcardDeck cards={cards} />
      </main>

    </>
  );
}
