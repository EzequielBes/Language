import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { recordPracticeResponse } from "./record-response";
import type { Domain } from "@/lib/assessment/adaptive";

const db = supabaseAdmin();
const TEST_USER = "test-record-response-achievements";

describe("recordPracticeResponse — integracao com selos", () => {
  let skillItemIds: string[];

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });

    const { data: itens } = await db.from("skill_items").select("id").limit(10);
    skillItemIds = itens!.map((i) => i.id);

    // 9 ja dominados de antemao, faltando so 1 pro selo vocab_10
    await db.from("user_item_status").upsert(
      skillItemIds.slice(0, 9).map((id) => ({ user_id: TEST_USER, skill_item_id: id, status: "conhecido" })),
    );
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().eq("user_id", TEST_USER);
    await db.from("user_item_status").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado um usuario a 1 item de distancia do selo vocab_10", () => {
    it("quando o decimo item e marcado conhecido, entao o resultado inclui vocab_10 em newlyUnlocked", async () => {
      const { data: item } = await db
        .from("skill_items")
        .select("id, tipo")
        .eq("id", skillItemIds[9])
        .single();

      const resultado = await recordPracticeResponse(db, {
        userId: TEST_USER,
        skillItemId: item!.id,
        domain: item!.tipo as Domain,
        resultado: "conhecido",
      });

      expect(resultado.newlyUnlocked.map((a) => a.chave)).toContain("vocab_10");
    });
  });
});
