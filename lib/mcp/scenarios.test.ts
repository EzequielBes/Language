import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTestMcpServer, parseToolResult } from "@/lib/mcp/test-utils";

const { TEST_USER_ID } = vi.hoisted(() => ({ TEST_USER_ID: "test-mcp-scenarios" }));

vi.mock("@/lib/mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/shared")>();
  return { ...actual, getLocalUserId: () => TEST_USER_ID };
});

const { registerScenarioTools } = await import("@/lib/mcp/scenarios");

const db = supabaseAdmin();

describe("mcp/scenarios (integracao real contra Supabase)", () => {
  const { server, handlers } = createTestMcpServer();
  registerScenarioTools(server);

  let skillItemId: string;

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").insert({ user_id: TEST_USER_ID });

    const { data: item } = await db.from("skill_items").select("id").limit(1).single();
    skillItemId = item!.id;
  });

  afterAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
  });

  it("lista cenarios predefinidos mesmo sem cenarios proprios", async () => {
    const { cenarios } = parseToolResult<{ cenarios: { predefinido: boolean }[] }>(
      await handlers.get("list_scenarios")!({}),
    );
    expect(cenarios.length).toBeGreaterThan(0);
    expect(cenarios.some((c) => c.predefinido)).toBe(true);
  });

  it("cria um cenario proprio, encontra-o na listagem filtrada e inicia uma conversa nele", async () => {
    const criado = parseToolResult<{ id: string; titulo: string }>(
      await handlers.get("create_custom_scenario")!({
        titulo: "Entrevista de suporte tecnico",
        prompt_seed: "Voce e um recrutador tecnico entrevistando para suporte ao cliente.",
        tipo_objetivo: "entrevista",
      }),
    );
    expect(criado.titulo).toBe("Entrevista de suporte tecnico");

    const { cenarios } = parseToolResult<{ cenarios: { id: string }[] }>(
      await handlers.get("list_scenarios")!({ tipo_objetivo: "entrevista" }),
    );
    expect(cenarios.some((c) => c.id === criado.id)).toBe(true);

    const { session_id, briefing } = parseToolResult<{ session_id: string; briefing: string }>(
      await handlers.get("start_conversation_session")!({ scenario_id: criado.id }),
    );
    expect(session_id).toBeTruthy();
    expect(briefing).toContain("recrutador tecnico");

    const { data: unlocked } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "primeira_conversa")
      .maybeSingle();
    expect(unlocked?.achievement_chave).toBe("primeira_conversa");
  });

  it("monta um briefing generico quando nao ha scenario_id nem objetivo definido", async () => {
    const { briefing } = parseToolResult<{ briefing: string }>(
      await handlers.get("start_conversation_session")!({}),
    );
    expect(briefing).toContain("Converse casualmente");
  });

  it("registra item praticado numa conversa e depois finaliza a sessao com resumo estruturado", async () => {
    const { session_id } = parseToolResult<{ session_id: string }>(
      await handlers.get("start_conversation_session")!({}),
    );

    const resultado = parseToolResult<{ itemStatus: string }>(
      await handlers.get("log_practice_item")!({
        session_id,
        skill_item_id: skillItemId,
        resultado: "conhecido",
      }),
    );
    expect(resultado.itemStatus).toBe("conhecido");
    expect(resultado).not.toHaveProperty("newlyUnlocked");

    const finalizado = parseToolResult<{ ok: boolean }>(
      await handlers.get("finish_conversation_session")!({
        session_id,
        resumo: "Pontos fortes: vocabulario solido. Atencao: verbos irregulares. Proximo passo: praticar passado simples.",
      }),
    );
    expect(finalizado.ok).toBe(true);
  });

  it("recusa iniciar conversa com um cenario inexistente", async () => {
    await expect(
      handlers.get("start_conversation_session")!({
        scenario_id: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow();
  });
});

describe("finish_conversation_session desbloqueia selo de consistencia", () => {
  const { server, handlers } = createTestMcpServer();
  registerScenarioTools(server);

  // O describe acima ja apagou o profile de TEST_USER_ID no seu afterAll;
  // recria aqui para que conversation_sessions.user_id (FK -> profiles) valide.
  beforeAll(async () => {
    await db.from("profiles").insert({ user_id: TEST_USER_ID });
  });

  afterAll(async () => {
    await db.from("conversation_sessions").delete().eq("user_id", TEST_USER_ID);
    await db.from("user_achievements").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
  });

  it("dado 4 conversas ja concluidas, quando a quinta e finalizada, entao desbloqueia conversas_5", async () => {
    await db.from("conversation_sessions").insert(
      Array.from({ length: 4 }, () => ({ user_id: TEST_USER_ID, finalizado_em: new Date().toISOString() })),
    );

    const { data: quinta } = await db
      .from("conversation_sessions")
      .insert({ user_id: TEST_USER_ID })
      .select("id")
      .single();

    await handlers.get("finish_conversation_session")!({ session_id: quinta!.id });

    const { data: unlocked } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "conversas_5")
      .maybeSingle();
    expect(unlocked?.achievement_chave).toBe("conversas_5");
  });
});
