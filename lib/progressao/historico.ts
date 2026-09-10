import type { supabaseAdmin } from "@/lib/supabase/server";
import type { AdaptiveState } from "@/lib/assessment/adaptive";
import { hojeISO } from "@/lib/date";

type Db = ReturnType<typeof supabaseAdmin>;

// Chamado pelo funil unico de progresso (recordPracticeResponse) — grava um
// snapshot diario do nivel estimado por dominio, por perfil de idioma
// (diferente do streak, que e global). Upsert por (user_id, data): chamadas
// repetidas no mesmo dia apenas atualizam a linha do dia com o nivel mais
// recente. Nunca lanca excecao (mesma garantia de unlockOnce/atualizarStreak).
export async function registrarProgressaoDiaria(
  db: Db,
  userId: string,
  estado: AdaptiveState,
): Promise<void> {
  try {
    const { error } = await db.from("progressao_historico").upsert({
      user_id: userId,
      data: hojeISO(),
      nivel_vocabulario: estado.vocabulario.nivel,
      nivel_gramatica: estado.gramatica.nivel,
      nivel_expressao: estado.expressao.nivel,
    });
    if (error) throw error;
  } catch (error) {
    console.error("[progressao] falha ao registrar:", (error as Error).message);
  }
}
