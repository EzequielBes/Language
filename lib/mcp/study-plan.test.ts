import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTestMcpServer, parseToolResult } from "@/lib/mcp/test-utils";

const { TEST_USER_ID } = vi.hoisted(() => ({ TEST_USER_ID: "test-mcp-study-plan" }));

vi.mock("@/lib/mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mcp/shared")>();
  return { ...actual, getLocalUserId: () => TEST_USER_ID };
});

const { registerStudyPlanTools } = await import("@/lib/mcp/study-plan");

const db = supabaseAdmin();

type Milestone = { id?: string; ordem: number; can_do_statement: string };

describe("mcp/study-plan (integracao real contra Supabase)", () => {
  const { server, handlers } = createTestMcpServer();
  registerStudyPlanTools(server);

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
    await db.from("profiles").insert({
      user_id: TEST_USER_ID,
      nivel_estimado: { vocabulario: "A2", gramatica: "A2", expressao: "A1" },
    });
    await db.from("goals").insert({ user_id: TEST_USER_ID, tipo: "trabalho" });
  });

  afterAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
  });

  it("gera um plano com metas ordenadas a partir do objetivo e nivel mais fraco", async () => {
    const { plan_id, milestones } = parseToolResult<{
      plan_id: string;
      milestones: Milestone[];
    }>(await handlers.get("generate_study_plan")!({}));

    expect(plan_id).toBeTruthy();
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones[0]!.ordem).toBe(1);

    const { data: unlockedPlano } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "primeiro_plano")
      .maybeSingle();
    expect(unlockedPlano?.achievement_chave).toBe("primeiro_plano");
  });

  it("busca o plano ativo com progresso calculado por meta, e avanca uma meta", async () => {
    const { plan, milestones } = parseToolResult<{
      plan: { id: string } | null;
      milestones: (Milestone & { id: string; progresso: { conhecidos: number; total: number } | null })[];
    }>(await handlers.get("get_current_study_plan")!({}));

    expect(plan).not.toBeNull();
    expect(milestones.length).toBeGreaterThan(0);

    const primeira = milestones[0]!;
    await handlers.get("advance_study_plan_milestone")!({ study_plan_item_id: primeira.id });

    const { milestones: atualizado } = parseToolResult<{
      milestones: (Milestone & { id: string; status: string })[];
    }>(await handlers.get("get_current_study_plan")!({}));
    expect(atualizado.find((m) => m.id === primeira.id)?.status).toBe("concluido");
  });

  it("gerar um novo plano abandona o anterior — so um ativo por vez", async () => {
    const primeiro = parseToolResult<{ plan_id: string }>(
      await handlers.get("generate_study_plan")!({}),
    );
    const segundo = parseToolResult<{ plan_id: string }>(
      await handlers.get("generate_study_plan")!({}),
    );
    expect(segundo.plan_id).not.toBe(primeiro.plan_id);

    const { data: planAntigo } = await db
      .from("study_plans")
      .select("status")
      .eq("id", primeiro.plan_id)
      .single();
    expect(planAntigo?.status).toBe("abandonado");
  });

  it("dado um plano com todas as metas concluidas, quando a ultima e avancada, entao desbloqueia plano_completo", async () => {
    const gerado = parseToolResult<{ plan_id: string; milestones: { id: string }[] }>(
      await handlers.get("generate_study_plan")!({}),
    );
    const { data: itens } = await db
      .from("study_plan_items")
      .select("id")
      .eq("study_plan_id", gerado.plan_id);

    for (const item of itens!) {
      await handlers.get("advance_study_plan_milestone")!({ study_plan_item_id: item.id });
    }

    const { data: unlocked } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "plano_completo")
      .maybeSingle();
    expect(unlocked?.achievement_chave).toBe("plano_completo");
  });
});
