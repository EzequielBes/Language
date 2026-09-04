import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/mcp/shared";
import { isSameOrigin } from "@/lib/http/same-origin";
import { recordPracticeResponse } from "@/lib/progress/record-response";
import type { Domain } from "@/lib/assessment/adaptive";

const bodySchema = z.object({
  skill_item_id: z.string().uuid(),
  resultado: z.enum(["conhecido", "desconhecido", "parcial"]),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "origem invalida" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "payload invalido" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: item, error } = await db
    .from("skill_items")
    .select("tipo")
    .eq("id", parsed.data.skill_item_id)
    .single();
  if (error) {
    return NextResponse.json({ error: "item nao encontrado" }, { status: 404 });
  }

  const resultado = await recordPracticeResponse(db, {
    userId: LOCAL_USER_ID,
    skillItemId: parsed.data.skill_item_id,
    domain: item.tipo as Domain,
    resultado: parsed.data.resultado,
  });

  return NextResponse.json(resultado);
}
