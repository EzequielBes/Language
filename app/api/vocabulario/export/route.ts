import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { itensParaCsv, type VocabularioItem } from "@/lib/vocabulario/export";

type Row = {
  skill_items: { texto: string; tipo: string; nivel_cefr: string; definicao: string | null } | null;
};

// Gera o CSV so quando o link "Baixar CSV" e clicado, em vez de embutir o
// vocabulario inteiro (potencialmente centenas de itens) como data: URI no
// HTML de toda visita a pagina de vocabulario.
export async function GET() {
  const db = supabaseAdmin();

  const { data: rows } = await db
    .from("user_item_status")
    .select("skill_items(texto, tipo, nivel_cefr, definicao)")
    .eq("user_id", getLocalUserId())
    .eq("status", "conhecido");

  const itens: VocabularioItem[] = ((rows ?? []) as unknown as Row[])
    .filter((row) => row.skill_items !== null)
    .map((row) => ({
      texto: row.skill_items!.texto,
      dominio: row.skill_items!.tipo,
      nivel: row.skill_items!.nivel_cefr,
      definicao: row.skill_items!.definicao,
    }))
    .sort((a, b) => a.texto.localeCompare(b.texto));

  return new Response(itensParaCsv(itens), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="meu-vocabulario.csv"',
    },
  });
}
