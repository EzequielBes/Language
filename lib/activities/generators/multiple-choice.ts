import type { Domain } from "@/lib/assessment/adaptive";
import type { Cefr } from "@/lib/cefr";
import type { ActivityGenerator } from "@/lib/activities/types";
import { orderUserItemStatusByPriority } from "@/lib/skill-items/rank";

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

interface SkillItemRow {
  id: string;
  texto: string;
  tipo: Domain;
  nivel_cefr: Cefr;
  idioma: string;
}

/**
 * "Qual desses voce ainda esta praticando?" — pega o item mais fraco do
 * aluno (status != conhecido, revisado ha mais tempo) e monta 3 distratores
 * de outros itens quaisquer. Nao e um quiz de traducao/significado porque
 * skill_items so tem um campo `texto` (rotulo do item, sem traducao) — dar
 * mais profundidade pedagogica exige enriquecer o dataset primeiro.
 */
export const multipleChoiceGenerator: ActivityGenerator = {
  async gerar(db, userId) {
    const { data: fraco } = await orderUserItemStatusByPriority(
      db
        .from("user_item_status")
        .select("skill_item_id, skill_items(id, texto, tipo, nivel_cefr, idioma, prioridade)")
        .eq("user_id", userId)
        .neq("status", "conhecido"),
    )
      .limit(1)
      .maybeSingle();

    const alvo = (fraco as unknown as { skill_items: SkillItemRow | null } | null)
      ?.skill_items;
    if (!alvo) return null;

    const { data: outros } = await db
      .from("skill_items")
      .select("texto")
      .eq("idioma", alvo.idioma)
      .neq("id", alvo.id)
      .limit(15);

    const distratores = embaralhar((outros ?? []).map((o) => o.texto))
      .filter((texto) => texto !== alvo.texto)
      .slice(0, 3);
    if (distratores.length < 3) return null; // dataset pequeno demais pra esta atividade

    const opcoes = embaralhar([alvo.texto, ...distratores]);
    const respostaCorretaIndex = opcoes.indexOf(alvo.texto);

    return {
      dominio: alvo.tipo,
      nivelCefr: alvo.nivel_cefr,
      payload: {
        pergunta: "Qual dessas opções é o item que você está praticando agora?",
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
