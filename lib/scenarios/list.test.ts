import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listScenarios } from "@/lib/scenarios/list";

const db = supabaseAdmin();
const USER_A = "test-scenarios-list-a";
const USER_B = "test-scenarios-list-b";

describe("listScenarios (integracao real contra Supabase)", () => {
  let idPredefinido: string;
  let idPersonalizadoA: string;
  let idPersonalizadoB: string;

  beforeAll(async () => {
    await db.from("profiles").delete().in("user_id", [USER_A, USER_B]);
    await db.from("profiles").insert([{ user_id: USER_A }, { user_id: USER_B }]);

    const { data: predefinido } = await db
      .from("scenarios")
      .select("id")
      .is("user_id", null)
      .limit(1)
      .single();
    idPredefinido = predefinido!.id;

    const { data: a } = await db
      .from("scenarios")
      .insert({ user_id: USER_A, titulo: "Cenario do perfil A", prompt_seed: "Prompt A" })
      .select("id")
      .single();
    idPersonalizadoA = a!.id;

    const { data: b } = await db
      .from("scenarios")
      .insert({ user_id: USER_B, titulo: "Cenario do perfil B", prompt_seed: "Prompt B" })
      .select("id")
      .single();
    idPersonalizadoB = b!.id;
  });

  afterAll(async () => {
    await db.from("profiles").delete().in("user_id", [USER_A, USER_B]);
  });

  describe("dado cenarios personalizados criados por dois perfis diferentes", () => {
    it("quando lista os cenarios do perfil A, entao nao inclui cenarios personalizados do perfil B", async () => {
      const { personalizados } = await listScenarios(db, USER_A);
      expect(personalizados.some((c) => c.id === idPersonalizadoA)).toBe(true);
      expect(personalizados.some((c) => c.id === idPersonalizadoB)).toBe(false);
    });

    it("quando lista os cenarios de qualquer perfil, entao os predefinidos aparecem pra todos", async () => {
      const { predefinidos } = await listScenarios(db, USER_A);
      expect(predefinidos.some((c) => c.id === idPredefinido)).toBe(true);
    });
  });
});
