import type { Domain } from "@/lib/assessment/adaptive";
import type { Cefr } from "@/lib/cefr";
import type { supabaseAdmin } from "@/lib/supabase/server";

export interface GeneratedActivity {
  dominio: Domain;
  nivelCefr: Cefr;
  payload: Record<string, unknown>;
  fonteSkillItemIds: string[];
}

export interface AvaliarResultado {
  correta: boolean;
}

/**
 * Contrato que todo tipo de atividade precisa implementar. `payloadPublico`
 * existe pra forcar cada gerador a decidir explicitamente o que pode ir pro
 * cliente antes da resposta — o payload guardado no banco pode conter a
 * chave de correcao (ex: indice da opcao certa), que nunca deve chegar no
 * navegador antes do aluno responder.
 */
export interface ActivityGenerator {
  gerar(
    db: ReturnType<typeof supabaseAdmin>,
    userId: string,
  ): Promise<GeneratedActivity | null>;
  avaliar(payload: Record<string, unknown>, resposta: unknown): AvaliarResultado;
  payloadPublico(payload: Record<string, unknown>): Record<string, unknown>;
}
