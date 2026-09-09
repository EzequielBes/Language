import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { isSameOrigin } from "@/lib/http/same-origin";
import { GENERATORS } from "@/lib/activities/registry";
import { recordPracticeResponse } from "@/lib/progress/record-response";
import { checkThresholds } from "@/lib/achievements/unlock";
import type { Domain } from "@/lib/assessment/adaptive";
import type { Achievement } from "@/lib/achievements/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "origem invalida" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("resposta" in body)) {
    return NextResponse.json({ error: "payload invalido" }, { status: 400 });
  }

  const { id } = await params;
  const db = supabaseAdmin();

  const { data: activity, error } = await db
    .from("activities")
    .select("id, tipo, dominio, payload, fonte_skill_item_ids, status")
    .eq("id", id)
    .eq("user_id", getLocalUserId())
    .single();
  if (error) {
    return NextResponse.json({ error: "atividade nao encontrada" }, { status: 404 });
  }
  if (activity.status !== "pendente") {
    return NextResponse.json({ error: "atividade ja respondida" }, { status: 409 });
  }

  const gerador = GENERATORS[activity.tipo];
  if (!gerador) {
    return NextResponse.json({ error: "tipo de atividade desconhecido" }, { status: 500 });
  }

  const resposta = (body as { resposta: unknown }).resposta;
  const resultado = gerador.avaliar(activity.payload as Record<string, unknown>, resposta);

  const { error: responseError } = await db.from("activity_responses").insert({
    activity_id: activity.id,
    user_id: getLocalUserId(),
    resposta,
    correta: resultado.correta,
  });
  if (responseError) {
    return NextResponse.json({ error: "falha ao registrar resposta" }, { status: 500 });
  }

  await db
    .from("activities")
    .update({ status: "concluida", concluida_em: new Date().toISOString() })
    .eq("id", activity.id);

  const newlyUnlocked: Achievement[] = [];
  // ponytail: assume que todos os itens de origem pertencem ao dominio da
  // atividade — vale enquanto so houver geradores de 1 item por atividade
  // (adaptar quando um gerador cobrir mais de um dominio por vez).
  for (const skillItemId of activity.fonte_skill_item_ids ?? []) {
    const registro = await recordPracticeResponse(db, {
      userId: getLocalUserId(),
      skillItemId,
      domain: activity.dominio as Domain,
      resultado: resultado.correta ? "conhecido" : "desconhecido",
    });
    newlyUnlocked.push(...registro.newlyUnlocked);
  }
  newlyUnlocked.push(...(await checkThresholds(db, getLocalUserId(), "atividades_respondidas")));

  return NextResponse.json({ ...resultado, newlyUnlocked });
}
