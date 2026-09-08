import type { Domain } from "@/lib/assessment/adaptive";
import type { Cefr } from "@/lib/cefr";
import type { ActivityGenerator } from "@/lib/activities/types";
import { orderUserItemStatusByPriority } from "@/lib/skill-items/rank";
import { embaralhar } from "@/lib/activities/shuffle";

interface SkillItemRow {
  id: string;
  texto: string;
  tipo: Domain;
  nivel_cefr: Cefr;
  idioma: string;
  definicao: string | null;
}

/**
 * "O que significa X?" — mesmo formato do multiple-choice, mas testando
 * significado (skill_items.definicao) em vez de reconhecimento do rotulo.
 * So gera quando o item mais fraco e os itens usados como distrator tem
 * definicao preenchida — nao todo idioma/item tem isso ainda.
 */
export const meaningChoiceGenerator: ActivityGenerator = {
  async gerar(db, userId) {
    const { data: fraco } = await orderUserItemStatusByPriority(
      db
        .from("user_item_status")
        .select("skill_item_id, skill_items(id, texto, tipo, nivel_cefr, idioma, definicao, prioridade)")
        .eq("user_id", userId)
        .neq("status", "conhecido"),
    )
      .limit(1)
      .maybeSingle();

    const alvo = (fraco as unknown as { skill_items: SkillItemRow | null } | null)
      ?.skill_items;
    if (!alvo?.definicao) return null;

    const { data: outros } = await db
      .from("skill_items")
      .select("definicao")
      .eq("idioma", alvo.idioma)
      .neq("id", alvo.id)
      .not("definicao", "is", null)
      .limit(15);

    const distratores = embaralhar((outros ?? []).map((o) => o.definicao as string))
      .filter((definicao) => definicao !== alvo.definicao)
      .slice(0, 3);
    if (distratores.length < 3) return null; // dataset com poucas definicoes pra este idioma

    const opcoes = embaralhar([alvo.definicao, ...distratores]);
    const respostaCorretaIndex = opcoes.indexOf(alvo.definicao);

    return {
      dominio: alvo.tipo,
      nivelCefr: alvo.nivel_cefr,
      payload: {
        pergunta: `O que significa "${alvo.texto}"?`,
        opcoes,
        respostaCorretaIndex,
      },
      fonteSkillItemIds: [alvo.id],
    };
  },

  avaliar(payload, resposta) {
    const respostaCorretaIndex = payload.respostaCorretaIndex as number;
    const escolhida = typeof resposta === "number" ? resposta : Number(resposta);
    return { correta: escolhida === respostaCorretaIndex };
  },

  payloadPublico(payload) {
    return { pergunta: payload.pergunta, opcoes: payload.opcoes };
  },
};
