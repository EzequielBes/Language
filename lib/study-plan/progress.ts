import type { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";

/**
 * Progresso de um milestone calculado on-demand a partir de
 * user_item_status — nao guardado, pra nao duplicar o que ja existe.
 * Usado pela tool get_current_study_plan e pelo dashboard.
 */
export async function progressoDoMilestone(
  db: ReturnType<typeof supabaseAdmin>,
  tags: string[],
): Promise<{ conhecidos: number; total: number } | null> {
  if (tags.length === 0) return null;

  const { data: itens } = await db.from("skill_items").select("id").overlaps("tags", tags);
  const ids = (itens ?? []).map((i) => i.id as string);
  if (ids.length === 0) return { conhecidos: 0, total: 0 };

  const { data: statuses } = await db
    .from("user_item_status")
    .select("status")
    .eq("user_id", getLocalUserId())
    .in("skill_item_id", ids);

  const conhecidos = (statuses ?? []).filter((s) => s.status === "conhecido").length;
  return { conhecidos, total: ids.length };
}
