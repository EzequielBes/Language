import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/mcp/shared";
import { orderUserItemStatusByPriority } from "@/lib/skill-items/rank";
import { FlashcardDeck, type Flashcard } from "./flashcard-deck";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const db = supabaseAdmin();

  // ponytail: sem filtro por skill_items.idioma — hoje so existe dataset em
  // 'en'. Filtrar por profiles.idioma_alvo quando houver mais de um idioma
  // seedado.
  const { data: rows } = await orderUserItemStatusByPriority(
    db
      .from("user_item_status")
      .select(
        "skill_item_id, status, streak, ultima_revisao, skill_items(texto, tipo, nivel_cefr, prioridade)",
      )
      .eq("user_id", LOCAL_USER_ID)
      .neq("status", "conhecido"),
  ).limit(20);

  type Row = {
    skill_item_id: string;
    status: "aprendendo" | "desconhecido";
    streak: number;
    skill_items: { texto: string; tipo: string; nivel_cefr: string } | null;
  };

  const cards: Flashcard[] = ((rows ?? []) as unknown as Row[])
    .filter((row) => row.skill_items !== null)
    .map((row) => ({
      skillItemId: row.skill_item_id,
      texto: row.skill_items!.texto,
      dominio: row.skill_items!.tipo,
      nivel: row.skill_items!.nivel_cefr,
      status: row.status,
      streak: row.streak,
    }));

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
        <h1 className="font-display text-3xl">Flashcards</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Itens que você ainda está aprendendo ou não conhece, vindos das suas
          avaliações e conversas. Toque no cartão pra avaliar se você lembrou.
        </p>

        <FlashcardDeck cards={cards} />
      </main>

      <div className="airmail-stripe" />
    </>
  );
}
