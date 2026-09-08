import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";

const { TEST_USER_ID } = vi.hoisted(() => ({ TEST_USER_ID: "test-api-activities" }));

vi.mock("@/lib/mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/shared")>();
  return { ...actual, getLocalUserId: () => TEST_USER_ID };
});

const { POST } = await import("@/app/api/activities/[id]/respond/route");

const db = supabaseAdmin();

function req(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/activities/x/respond", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/activities/[id]/respond (integracao real contra Supabase)", () => {
  let skillItemId: string;
  let dominio: "vocabulario" | "gramatica" | "expressao";
  let nivelCefr: string;
  let activityId: string;

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").insert({ user_id: TEST_USER_ID });

    const { data: item } = await db
      .from("skill_items")
      .select("id, tipo, nivel_cefr")
      .limit(1)
      .single();
    skillItemId = item!.id;
    dominio = item!.tipo;
    nivelCefr = item!.nivel_cefr;
  });

  afterAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
  });

  beforeEach(async () => {
    const { data: activity } = await db
      .from("activities")
      .insert({
        user_id: TEST_USER_ID,
        tipo: "multiple_choice",
        dominio,
        nivel_cefr: nivelCefr,
        payload: { pergunta: "Qual dessas voce esta praticando?", opcoes: ["a", "b", "c"], respostaCorretaIndex: 1 },
        fonte_skill_item_ids: [skillItemId],
      })
      .select("id")
      .single();
    activityId = activity!.id;
  });

  it("avalia resposta correta, registra progresso e marca a atividade como concluida", async () => {
    const res = await POST(req({ resposta: 1 }), params(activityId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.correta).toBe(true);

    const { data: status } = await db
      .from("user_item_status")
      .select("status")
      .eq("user_id", TEST_USER_ID)
      .eq("skill_item_id", skillItemId)
      .single();
    expect(status?.status).toBe("conhecido");
  });

  it("avalia resposta errada como incorreta", async () => {
    const res = await POST(req({ resposta: 0 }), params(activityId));
    const body = await res.json();
    expect(body.correta).toBe(false);
  });

  it("recusa responder a mesma atividade duas vezes", async () => {
    await POST(req({ resposta: 1 }), params(activityId));
    const segunda = await POST(req({ resposta: 1 }), params(activityId));
    expect(segunda.status).toBe(409);
  });

  it("rejeita payload sem o campo resposta", async () => {
    const res = await POST(req({}), params(activityId));
    expect(res.status).toBe(400);
  });

  it("retorna 404 pra uma atividade inexistente", async () => {
    const res = await POST(req({ resposta: 1 }), params("00000000-0000-0000-0000-000000000000"));
    expect(res.status).toBe(404);
  });
});
