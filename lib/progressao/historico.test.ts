import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AdaptiveState } from "@/lib/assessment/adaptive";
import { registrarProgressaoDiaria } from "./historico";

const db = supabaseAdmin();
const TEST_USER = "test-progressao-historico";

function estadoComNiveis(vocabulario: number, gramatica: number, expressao: number): AdaptiveState {
  const dominio = (nivel: number) => ({
    nivel,
    acertos_seguidos: 0,
    erros_seguidos: 0,
    respondidos: 0,
    ultima_mudanca_em: 0,
  });
  return {
    vocabulario: dominio(vocabulario),
    gramatica: dominio(gramatica),
    expressao: dominio(expressao),
  };
}

async function lerHoje() {
  const hoje = new Date().toLocaleDateString("en-CA");
  const { data } = await db
    .from("progressao_historico")
    .select("nivel_vocabulario, nivel_gramatica, nivel_expressao")
    .eq("user_id", TEST_USER)
    .eq("data", hoje)
    .maybeSingle();
  return data;
}

describe("registrarProgressaoDiaria", () => {
  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });
  });

  afterAll(async () => {
    await db.from("progressao_historico").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado que ainda nao ha registro hoje para o perfil", () => {
    it("quando chamado, entao insere uma linha com os niveis do estado", async () => {
      await registrarProgressaoDiaria(db, TEST_USER, estadoComNiveis(2, 4, 6));
      const linha = await lerHoje();
      expect(linha).toEqual({
        nivel_vocabulario: 2,
        nivel_gramatica: 4,
        nivel_expressao: 6,
      });
    });
  });

  describe("dado que ja existe um registro hoje para o perfil", () => {
    it("quando chamado de novo com niveis diferentes, entao atualiza os valores sem duplicar", async () => {
      await registrarProgressaoDiaria(db, TEST_USER, estadoComNiveis(1, 1, 1));
      await registrarProgressaoDiaria(db, TEST_USER, estadoComNiveis(5, 3, 6));

      const linha = await lerHoje();
      expect(linha).toEqual({
        nivel_vocabulario: 5,
        nivel_gramatica: 3,
        nivel_expressao: 6,
      });

      const { count } = await db
        .from("progressao_historico")
        .select("data", { count: "exact", head: true })
        .eq("user_id", TEST_USER);
      expect(count).toBe(1);
    });
  });

  describe("dado um user_id que viola a FK de progressao_historico", () => {
    it("quando registrarProgressaoDiaria e chamado, entao nao lanca excecao", async () => {
      await expect(
        registrarProgressaoDiaria(db, "usuario-que-nao-existe-nunca", estadoComNiveis(1, 1, 1)),
      ).resolves.toBeUndefined();
    });
  });

  describe("dado um nivel fora da faixa 1-6 (viola o CHECK constraint)", () => {
    it("quando registrarProgressaoDiaria e chamado, entao nao lanca excecao e nao corrompe a linha", async () => {
      await expect(
        registrarProgressaoDiaria(db, TEST_USER, estadoComNiveis(0, 1, 1)),
      ).resolves.toBeUndefined();

      // A escrita invalida deve ter sido rejeitada pelo CHECK constraint —
      // a linha deve permanecer com os valores do ultimo write valido acima.
      const linha = await lerHoje();
      expect(linha).toEqual({
        nivel_vocabulario: 5,
        nivel_gramatica: 3,
        nivel_expressao: 6,
      });
    });
  });
});
