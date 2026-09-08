import type { Domain } from "@/lib/assessment/adaptive";
import type { Cefr } from "@/lib/cefr";
import type { ActivityGenerator } from "@/lib/activities/types";
import { orderUserItemStatusByPriority } from "@/lib/skill-items/rank";

interface SkillItemRow {
  id: string;
  texto: string;
  tipo: Domain;
  nivel_cefr: Cefr;
}

// Reaproveita skill_items.texto direto (sem exigir dado novo por item): so
// funciona pra itens cujo texto tem pelo meno uma palavra "limpa" (so
// letras, 3+ caracteres) — ex.: "how are you?" vira "how are ___?". Itens
// que sao so um rotulo curto sem palavra assim (ex.: "numbers 1-20") ficam
// de fora, o generator pula pro proximo candidato.
export function escolherLacuna(
  texto: string,
): { antes: string; depois: string; resposta: string } | null {
  const tokens = texto.split(/(\s+)/);
  const candidatos = tokens
    .map((tok, i) => ({ tok, i }))
    .filter(({ tok }) => /^[A-Za-z]{3,}$/.test(tok));
  if (candidatos.length === 0) return null;

  const { tok, i } = candidatos[Math.floor(Math.random() * candidatos.length)];
  return {
    antes: tokens.slice(0, i).join(""),
    depois: tokens.slice(i + 1).join(""),
    resposta: tok.toLowerCase(),
  };
}

export const clozeGenerator: ActivityGenerator = {
  async gerar(db, userId) {
    const { data: candidatos } = await orderUserItemStatusByPriority(
      db
        .from("user_item_status")
        .select("skill_item_id, skill_items(id, texto, tipo, nivel_cefr, prioridade)")
        .eq("user_id", userId)
        .neq("status", "conhecido"),
    ).limit(10);

    for (const row of (candidatos ?? []) as unknown as {
      skill_items: SkillItemRow | null;
    }[]) {
      const item = row.skill_items;
      if (!item) continue;

      const lacuna = escolherLacuna(item.texto);
      if (!lacuna) continue;

      return {
        dominio: item.tipo,
        nivelCefr: item.nivel_cefr,
        payload: {
          antes: lacuna.antes,
          depois: lacuna.depois,
          resposta: lacuna.resposta,
        },
        fonteSkillItemIds: [item.id],
      };
    }

    return null; // nenhum item pendente tem uma palavra completavel
  },

  avaliar(payload, resposta) {
    const esperado = String(payload.resposta).trim().toLowerCase();
    const dado = String(resposta ?? "").trim().toLowerCase();
    return { correta: dado === esperado && dado.length > 0 };
  },

  payloadPublico(payload) {
    return { antes: payload.antes, depois: payload.depois };
  },
};
