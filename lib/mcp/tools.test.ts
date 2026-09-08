import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTestMcpServer, parseToolResult } from "@/lib/mcp/test-utils";

const { TEST_USER_ID } = vi.hoisted(() => ({
  TEST_USER_ID: "test-mcp-tools",
}));

vi.mock("@/lib/mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/shared")>();
  return { ...actual, getLocalUserId: () => TEST_USER_ID };
});

const { registerTools } = await import("@/lib/mcp/tools");

const db = supabaseAdmin();

async function limparUsuario(userId: string) {
  await db.from("profiles").delete().eq("user_id", userId);
}

describe("mcp/tools (integracao real contra Supabase)", () => {
  const { server, handlers } = createTestMcpServer();
  registerTools(server);

  beforeAll(async () => {
    await limparUsuario(TEST_USER_ID);
  });

  afterAll(async () => {
    await limparUsuario(TEST_USER_ID);
  });

  it("percorre o fluxo completo de onboarding + avaliacao", async () => {
    const criado = parseToolResult<{ user_id: string; onboarding_status: string }>(
      await handlers.get("get_or_create_profile")!({}),
    );
    expect(criado.user_id).toBe(TEST_USER_ID);
    expect(criado.onboarding_status).toBe("novo");

    const repetido = parseToolResult<{ onboarding_status: string }>(
      await handlers.get("get_or_create_profile")!({}),
    );
    expect(repetido.onboarding_status).toBe("novo");

    const { profile, goal } = parseToolResult<{
      profile: { onboarding_status: string };
      goal: { tipo: string };
    }>(
      await handlers.get("set_learning_goal")!({
        idioma_alvo: "en",
        idioma_nativo: "pt",
        tipo_objetivo: "trabalho",
        nivel_autodeclarado: "A2",
      }),
    );
    expect(profile.onboarding_status).toBe("objetivo_definido");
    expect(goal.tipo).toBe("trabalho");

    const { session_id } = parseToolResult<{ session_id: string }>(
      await handlers.get("start_assessment_session")!({}),
    );
    expect(session_id).toBeTruthy();

    const proximo = parseToolResult<{
      done: boolean;
      skill_item_id: string;
      dominio: string;
      nivel_testado: string;
    }>(await handlers.get("get_next_assessment_item")!({}));
    expect(proximo.done).toBe(false);
    expect(["vocabulario", "gramatica", "expressao"]).toContain(proximo.dominio);

    const resposta = parseToolResult<{ dominio: string; nivel_atualizado: string }>(
      await handlers.get("record_item_response")!({
        skill_item_id: proximo.skill_item_id,
        status: "conhecido",
      }),
    );
    expect(resposta.dominio).toBe(proximo.dominio);
    expect(resposta.nivel_atualizado).toMatch(/^[ABC][12]$/);

    const finalizado = parseToolResult<{ nivel_estimado: Record<string, string> }>(
      await handlers.get("finish_assessment_session")!({}),
    );
    expect(Object.keys(finalizado.nivel_estimado).sort()).toEqual(
      ["expressao", "gramatica", "vocabulario"].sort(),
    );

    const resumo = parseToolResult<{
      profile: { onboarding_status: string };
      ultima_sessao: { status: string };
      contagem_itens: { conhecido: number };
    }>(await handlers.get("get_profile_summary")!({}));
    expect(resumo.profile.onboarding_status).toBe("avaliado");
    expect(resumo.ultima_sessao.status).toBe("concluida");
    expect(resumo.contagem_itens.conhecido).toBeGreaterThanOrEqual(1);
  });

  it("recusa iniciar avaliacao sem nivel autodeclarado", async () => {
    // reseta o profile do teste anterior (ja tem nivel_autodeclarado) pra um
    // profile novo, sem passar por set_learning_goal.
    await limparUsuario(TEST_USER_ID);
    await db.from("profiles").insert({ user_id: TEST_USER_ID });

    await expect(handlers.get("start_assessment_session")!({})).rejects.toThrow(
      /Defina o objetivo/,
    );
  });

  it("get_profile_summary avisa sobre revisoes com repeticao espacada vencida", async () => {
    await limparUsuario(TEST_USER_ID);
    await db.from("profiles").insert({ user_id: TEST_USER_ID });

    const { data: item } = await db.from("skill_items").select("id").limit(1).single();
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await db.from("user_item_status").insert({
      user_id: TEST_USER_ID,
      skill_item_id: item!.id,
      status: "aprendendo",
      proxima_revisao_em: ontem,
    });

    const resumo = parseToolResult<{
      revisoes_vencidas: { total: number; amostra: { texto: string; dominio: string }[] };
    }>(await handlers.get("get_profile_summary")!({}));
    expect(resumo.revisoes_vencidas.total).toBe(1);
    expect(resumo.revisoes_vencidas.amostra).toHaveLength(1);
  });
});
