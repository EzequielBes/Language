import type { supabaseAdmin } from "@/lib/supabase/server";
import { numberToCefr, cefrToNumber, type Cefr } from "@/lib/cefr";
import {
  applyResponse,
  seedState,
  type AdaptiveState,
  type Domain,
  type ItemStatus,
} from "@/lib/assessment/adaptive";
import { calcularProximaRevisao } from "@/lib/assessment/spaced-repetition";

export interface RecordPracticeResponseResult {
  itemStatus: "conhecido" | "aprendendo" | "desconhecido";
  nivelPraticaAtualizado: Cefr;
}

function fail(error: { message: string }): never {
  console.error("[progress/record-response] falha no banco:", error.message);
  throw new Error("Nao foi possivel registrar o progresso. Tente novamente.");
}

/**
 * Unico ponto de escrita de progresso "continuo" (fora da avaliacao formal):
 * cenarios de conversa, flashcards, atividades e as correcoes do professor
 * especialista (lib/mcp/coaching.ts) chamam esta funcao sempre que o aluno
 * acerta/erra um item, mantendo user_item_status, profiles.nivel_pratica e
 * o agendamento de repeticao espacada (proxima_revisao_em) consistentes
 * entre todos os canais. Nao escreva nesses campos por outro caminho.
 */
export async function recordPracticeResponse(
  db: ReturnType<typeof supabaseAdmin>,
  params: {
    userId: string;
    skillItemId: string;
    domain: Domain;
    resultado: ItemStatus;
  },
): Promise<RecordPracticeResponseResult> {
  const { userId, skillItemId, domain, resultado } = params;

  const [{ data: profile, error: profileError }, { data: itemAtual }] = await Promise.all([
    db
      .from("profiles")
      .select("nivel_autodeclarado, nivel_pratica")
      .eq("user_id", userId)
      .single(),
    db
      .from("user_item_status")
      .select("streak")
      .eq("user_id", userId)
      .eq("skill_item_id", skillItemId)
      .maybeSingle(),
  ]);
  if (profileError) fail(profileError);

  const nivelPratica = profile.nivel_pratica as Partial<AdaptiveState> | null;
  const estadoAtual: AdaptiveState =
    nivelPratica && Object.keys(nivelPratica).length > 0
      ? (nivelPratica as AdaptiveState)
      : seedState(cefrToNumber((profile.nivel_autodeclarado as Cefr) ?? "A1"));

  const novoEstado = applyResponse(estadoAtual, domain, resultado);

  const { error: updateError } = await db
    .from("profiles")
    .update({ nivel_pratica: novoEstado })
    .eq("user_id", userId);
  if (updateError) fail(updateError);

  const itemStatus =
    resultado === "conhecido"
      ? "conhecido"
      : resultado === "parcial"
        ? "aprendendo"
        : "desconhecido";

  const { streak, proximaRevisaoEm } = calcularProximaRevisao(
    itemAtual?.streak ?? 0,
    resultado,
  );

  const { error: statusError } = await db.from("user_item_status").upsert({
    user_id: userId,
    skill_item_id: skillItemId,
    status: itemStatus,
    ultima_revisao: new Date().toISOString(),
    streak,
    proxima_revisao_em: proximaRevisaoEm.toISOString(),
  });
  if (statusError) fail(statusError);

  return {
    itemStatus,
    nivelPraticaAtualizado: numberToCefr(novoEstado[domain].nivel),
  };
}
