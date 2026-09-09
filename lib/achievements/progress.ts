import type { supabaseAdmin } from "@/lib/supabase/server";
import type { Metrica } from "./types";

type Db = ReturnType<typeof supabaseAdmin>;

export async function contarVocabularioDominado(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from("user_item_status")
    .select("skill_item_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "conhecido");
  if (error) throw error;
  return count ?? 0;
}

export async function contarAtividadesRespondidas(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "concluida");
  if (error) throw error;
  return count ?? 0;
}

export async function contarConversasConcluidas(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from("conversation_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("finalizado_em", "is", null);
  if (error) throw error;
  return count ?? 0;
}

export const CONTADORES: Record<Metrica, (db: Db, userId: string) => Promise<number>> = {
  vocabulario_dominado: contarVocabularioDominado,
  atividades_respondidas: contarAtividadesRespondidas,
  conversas_concluidas: contarConversasConcluidas,
};
