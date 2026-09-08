import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTestMcpServer, parseToolResult } from "@/lib/mcp/test-utils";

const { TEST_USER_ID } = vi.hoisted(() => ({ TEST_USER_ID: "test-mcp-coaching" }));

vi.mock("@/lib/mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/shared")>();
  return { ...actual, getLocalUserId: () => TEST_USER_ID };
});

const { registerCoachingTools } = await import("@/lib/mcp/coaching");

const db = supabaseAdmin();

describe("mcp/coaching (integracao real contra Supabase)", () => {
  const { server, handlers } = createTestMcpServer();
  registerCoachingTools(server);

  let skillItemId: string;
  let dominio: "vocabulario" | "gramatica" | "expressao";

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").insert({ user_id: TEST_USER_ID });

    const { data: item } = await db
      .from("skill_items")
      .select("id, tipo")
      .limit(1)
      .single();
    skillItemId = item!.id;
    dominio = item!.tipo;
  });

  afterAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
  });

  it("registra uma correcao vinculada a um item e atualiza o progresso do aluno", async () => {
    const resultado = parseToolResult<{ correction_event_id: string; sinal_registrado: boolean }>(
      await handlers.get("give_correction")!({
        origem: "conversa_livre",
        tipo_feedback: "recast",
        correcao: "Use 'went' em vez de 'goed'.",
        erro_do_aluno: "I goed to the store.",
        skill_item_id: skillItemId,
        domain: dominio,
      }),
    );
    expect(resultado.correction_event_id).toBeTruthy();
    expect(resultado.sinal_registrado).toBe(true);

    const { data: status } = await db
      .from("user_item_status")
      .select("status")
      .eq("user_id", TEST_USER_ID)
      .eq("skill_item_id", skillItemId)
      .single();
    expect(status?.status).toBe("aprendendo");
  });

  it("nao sinaliza progresso quando a correcao nao aponta pra um item especifico", async () => {
    const resultado = parseToolResult<{ sinal_registrado: boolean }>(
      await handlers.get("give_correction")!({
        origem: "conversa_livre",
        tipo_feedback: "elicitacao",
        correcao: "Tenta de novo, qual o passado de 'go'?",
      }),
    );
    expect(resultado.sinal_registrado).toBe(false);
  });

  it("registra uma duvida esclarecida sem afetar progresso", async () => {
    const resultado = parseToolResult<{ correction_event_id: string }>(
      await handlers.get("explain_doubt")!({
        pergunta: "Quando uso 'a' e quando uso 'an'?",
        explicacao: "'an' antes de som de vogal, 'a' antes de som de consoante.",
        origem: "conversa_livre",
      }),
    );
    expect(resultado.correction_event_id).toBeTruthy();
  });

  it("lista as correcoes/duvidas mais recentes, respeitando o limite", async () => {
    const { correcoes } = parseToolResult<{ correcoes: unknown[] }>(
      await handlers.get("list_recent_corrections")!({ limit: 2 }),
    );
    expect(correcoes.length).toBe(2);
  });
});
