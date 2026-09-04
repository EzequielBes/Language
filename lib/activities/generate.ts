import type { supabaseAdmin } from "@/lib/supabase/server";
import { GENERATORS } from "@/lib/activities/registry";

const MAX_PENDENTES = 5;

export async function gerarAtividadesPendentes(
  db: ReturnType<typeof supabaseAdmin>,
  userId: string,
): Promise<{ criadas: number }> {
  const { count } = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pendente");
  if ((count ?? 0) >= MAX_PENDENTES) {
    return { criadas: 0 };
  }

  const { data: tipos } = await db
    .from("activity_types")
    .select("chave")
    .eq("ativo", true);

  let criadas = 0;
  for (const tipo of tipos ?? []) {
    const gerador = GENERATORS[tipo.chave];
    if (!gerador) continue;

    const gerada = await gerador.gerar(db, userId);
    if (!gerada) continue;

    const { error } = await db.from("activities").insert({
      user_id: userId,
      tipo: tipo.chave,
      dominio: gerada.dominio,
      nivel_cefr: gerada.nivelCefr,
      payload: gerada.payload,
      fonte_skill_item_ids: gerada.fonteSkillItemIds,
    });
    if (!error) criadas += 1;
  }

  return { criadas };
}
