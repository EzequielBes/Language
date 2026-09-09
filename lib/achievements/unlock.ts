import type { supabaseAdmin } from "@/lib/supabase/server";
import { CONTADORES } from "./progress";
import type { Achievement, Metrica } from "./types";

type Db = ReturnType<typeof supabaseAdmin>;

// Selo e um bonus motivacional, nunca pode derrubar a acao principal do
// usuario (revisar flashcard, iniciar conversa, etc.) — por isso nenhuma
// das duas funcoes abaixo lanca excecao; erros sao logados e engolidos.
export async function unlockOnce(db: Db, userId: string, chave: string): Promise<Achievement | null> {
  try {
    const { data: inserido, error } = await db
      .from("user_achievements")
      .upsert(
        { user_id: userId, achievement_chave: chave },
        { onConflict: "user_id,achievement_chave", ignoreDuplicates: true },
      )
      .select("achievement_chave");
    if (error) throw error;
    if (!inserido || inserido.length === 0) return null;

    const { data: achievement, error: achError } = await db
      .from("achievements")
      .select("*")
      .eq("chave", chave)
      .single();
    if (achError) throw achError;
    return achievement as Achievement;
  } catch (error) {
    console.error("[achievements] falha ao desbloquear:", chave, (error as Error).message);
    return null;
  }
}

export async function checkThresholds(db: Db, userId: string, metrica: Metrica): Promise<Achievement[]> {
  try {
    const contagem = await CONTADORES[metrica](db, userId);
    const { data: candidatos, error } = await db
      .from("achievements")
      .select("*")
      .eq("metrica", metrica)
      .lte("limite", contagem);
    if (error) throw error;

    const desbloqueados: Achievement[] = [];
    for (const candidato of candidatos ?? []) {
      const achievement = await unlockOnce(db, userId, candidato.chave);
      if (achievement) desbloqueados.push(achievement);
    }
    return desbloqueados;
  } catch (error) {
    console.error("[achievements] falha ao checar limites:", metrica, (error as Error).message);
    return [];
  }
}
