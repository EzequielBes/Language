// Criterio unico de ordenacao por prioridade/repeticao espacada, reusado nos
// 3 lugares que escolhem skill_item (avaliacao, atividades, flashcards).
// Duas variantes porque as queries partem de shapes diferentes (skill_items
// direto vs user_item_status com join) — mesmo criterio documentado, sem
// heuristica divergente em cada call site.

interface Orderable {
  order: (
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string },
  ) => Orderable;
}

// Usado por queries que partem direto de skill_items (ex: pickItem na
// avaliacao formal, que nao tem user_item_status pra saber o que esta
// "vencido" pra revisao).
export function orderSkillItemsByPriority<T extends Orderable>(query: T): T {
  return query.order("prioridade", { ascending: false }) as T;
}

// Usado por queries que partem de user_item_status com skill_items
// embutido (flashcards, gerador de atividades): itens vencidos ou nunca
// agendados primeiro (nulls first), depois prioridade do item, depois o que
// ha mais tempo nao e revisado.
export function orderUserItemStatusByPriority<T extends Orderable>(query: T): T {
  return query
    .order("proxima_revisao_em", { ascending: true, nullsFirst: true })
    .order("prioridade", { ascending: false, referencedTable: "skill_items" })
    .order("ultima_revisao", { ascending: true }) as T;
}
