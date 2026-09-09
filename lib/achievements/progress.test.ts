import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  contarVocabularioDominado,
  contarAtividadesRespondidas,
  contarConversasConcluidas,
} from "./progress";

const db = supabaseAdmin();
const TEST_USER = "test-achievements-progress";

describe("funcoes de contagem de progresso", () => {
  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });
  });

  afterAll(async () => {
    await db.from("activities").delete().eq("user_id", TEST_USER);
    await db.from("conversation_sessions").delete().eq("user_id", TEST_USER);
    await db.from("user_item_status").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado 3 itens marcados como conhecido", () => {
    it("quando contarVocabularioDominado e chamado, entao retorna 3", async () => {
      const { data: itens } = await db.from("skill_items").select("id").limit(3);
      await db.from("user_item_status").upsert(
        itens!.map((i) => ({ user_id: TEST_USER, skill_item_id: i.id, status: "conhecido" })),
      );
      expect(await contarVocabularioDominado(db, TEST_USER)).toBe(3);
    });
  });

  describe("dado 2 atividades concluidas e 1 pendente", () => {
    it("quando contarAtividadesRespondidas e chamado, entao retorna 2", async () => {
      await db.from("activities").insert([
        { user_id: TEST_USER, tipo: "multiple_choice", dominio: "vocabulario", nivel_cefr: "A1", payload: {}, status: "concluida" },
        { user_id: TEST_USER, tipo: "multiple_choice", dominio: "vocabulario", nivel_cefr: "A1", payload: {}, status: "concluida" },
        { user_id: TEST_USER, tipo: "multiple_choice", dominio: "vocabulario", nivel_cefr: "A1", payload: {}, status: "pendente" },
      ]);
      expect(await contarAtividadesRespondidas(db, TEST_USER)).toBe(2);
    });
  });

  describe("dado 1 conversa finalizada e 1 em andamento", () => {
    it("quando contarConversasConcluidas e chamado, entao retorna 1", async () => {
      await db.from("conversation_sessions").insert([
        { user_id: TEST_USER, finalizado_em: new Date().toISOString() },
        { user_id: TEST_USER },
      ]);
      expect(await contarConversasConcluidas(db, TEST_USER)).toBe(1);
    });
  });
});
