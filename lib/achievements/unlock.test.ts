import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { unlockOnce, checkThresholds } from "./unlock";
import type { Metrica } from "./types";

const db = supabaseAdmin();

describe("unlockOnce", () => {
  const TEST_USER = "test-achievements-unlock";

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado um selo nunca desbloqueado por este usuario", () => {
    it("quando chamado, entao retorna o achievement e persiste em user_achievements", async () => {
      const achievement = await unlockOnce(db, TEST_USER, "primeiro_flashcard");
      expect(achievement?.chave).toBe("primeiro_flashcard");

      const { data } = await db
        .from("user_achievements")
        .select("achievement_chave")
        .eq("user_id", TEST_USER)
        .eq("achievement_chave", "primeiro_flashcard")
        .maybeSingle();
      expect(data?.achievement_chave).toBe("primeiro_flashcard");
    });
  });

  describe("dado um selo ja desbloqueado por este usuario", () => {
    it("quando chamado de novo, entao retorna null e nao duplica", async () => {
      await unlockOnce(db, TEST_USER, "primeira_avaliacao");
      const segunda = await unlockOnce(db, TEST_USER, "primeira_avaliacao");
      expect(segunda).toBeNull();

      const { count } = await db
        .from("user_achievements")
        .select("achievement_chave", { count: "exact", head: true })
        .eq("user_id", TEST_USER)
        .eq("achievement_chave", "primeira_avaliacao");
      expect(count).toBe(1);
    });
  });
});

describe("checkThresholds", () => {
  const TEST_USER = "test-achievements-thresholds";

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });

    const { data: itens } = await db.from("skill_items").select("id").limit(51);
    await db.from("user_item_status").upsert(
      itens!.map((item) => ({ user_id: TEST_USER, skill_item_id: item.id, status: "conhecido" })),
    );
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().eq("user_id", TEST_USER);
    await db.from("user_item_status").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado um usuario com 51 itens dominados", () => {
    it("quando checkThresholds('vocabulario_dominado') e chamado, entao desbloqueia vocab_10 e vocab_50, mas nao vocab_100", async () => {
      const desbloqueados = await checkThresholds(db, TEST_USER, "vocabulario_dominado");
      const chaves = desbloqueados.map((a) => a.chave);
      expect(chaves).toContain("vocab_10");
      expect(chaves).toContain("vocab_50");
      expect(chaves).not.toContain("vocab_100");
    });

    it("quando chamado de novo sem mudar a contagem, entao nao desbloqueia nada novo", async () => {
      const desbloqueados = await checkThresholds(db, TEST_USER, "vocabulario_dominado");
      expect(desbloqueados).toEqual([]);
    });
  });
});

describe("isolamento entre perfis", () => {
  const USER_A = "test-achievements-perfil-a";
  const USER_B = "test-achievements-perfil-b";

  beforeAll(async () => {
    await db.from("profiles").delete().in("user_id", [USER_A, USER_B]);
    await db.from("profiles").insert([{ user_id: USER_A }, { user_id: USER_B }]);
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().in("user_id", [USER_A, USER_B]);
    await db.from("profiles").delete().in("user_id", [USER_A, USER_B]);
  });

  describe("dado um selo desbloqueado pelo perfil A", () => {
    it("quando verifica o perfil B, entao o selo nao aparece la", async () => {
      await unlockOnce(db, USER_A, "primeiro_flashcard");

      const { data } = await db
        .from("user_achievements")
        .select("achievement_chave")
        .eq("user_id", USER_B)
        .eq("achievement_chave", "primeiro_flashcard")
        .maybeSingle();
      expect(data).toBeNull();
    });
  });
});

describe("nunca lanca excecao mesmo em erro real de banco", () => {
  it("dado um user_id que viola a FK de user_achievements, quando unlockOnce e chamado, entao retorna null sem lancar", async () => {
    await expect(unlockOnce(db, "usuario-que-nao-existe-nunca", "vocab_10")).resolves.toBeNull();
  });

  // A contagem em si (CONTADORES[metrica]) nao falha para um user_id
  // inexistente — so retorna 0 (nenhum erro de banco). Como nenhum
  // achievement de vocabulario_dominado tem limite <= 0 (o menor e 10),
  // checkThresholds retornaria [] pelo caminho normal nesse caso, sem
  // nunca tocar o catch. Para exercitar de verdade o catch de
  // checkThresholds (nao so o de unlockOnce, que ja e coberto acima e no
  // describe "checkThresholds"), forcamos um erro real e sincrono passando
  // uma metrica que nao existe em CONTADORES — o lookup falha com uma
  // excecao de verdade antes de qualquer query.
  it("dado uma metrica sem contador registrado, quando checkThresholds e chamado, entao retorna array vazio sem lancar", async () => {
    await expect(
      checkThresholds(db, "usuario-que-nao-existe-nunca", "metrica_sem_contador" as Metrica),
    ).resolves.toEqual([]);
  });
});
