import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { atualizarStreak } from "./update";

const db = supabaseAdmin();

interface StreakRow {
  dias_atual: number;
  dias_recorde: number;
  ultimo_dia_praticado: string | null;
  freezes_disponiveis: number;
}

async function lerEstado(): Promise<StreakRow> {
  const { data } = await db
    .from("streak_estado")
    .select("dias_atual, dias_recorde, ultimo_dia_praticado, freezes_disponiveis")
    .eq("singleton", true)
    .single();
  return data as StreakRow;
}

async function definirEstado(estado: Partial<StreakRow>) {
  await db.from("streak_estado").update(estado).eq("singleton", true);
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("atualizarStreak", () => {
  let original: StreakRow;

  beforeAll(async () => {
    original = await lerEstado();
  });

  afterEach(async () => {
    await definirEstado(original);
  });

  afterAll(async () => {
    await definirEstado(original);
  });

  describe("dado que nunca praticou antes", () => {
    it("quando atualiza, entao inicia a sequencia em 1 dia", async () => {
      await definirEstado({ dias_atual: 0, dias_recorde: 0, ultimo_dia_praticado: null, freezes_disponiveis: 0 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(1);
      expect(estado.dias_recorde).toBe(1);
    });
  });

  describe("dado que praticou ontem", () => {
    it("quando atualiza hoje, entao incrementa a sequencia", async () => {
      await definirEstado({ dias_atual: 5, dias_recorde: 5, ultimo_dia_praticado: diasAtras(1), freezes_disponiveis: 0 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(6);
      expect(estado.dias_recorde).toBe(6);
    });
  });

  describe("dado que ja atualizou hoje", () => {
    it("quando chamado de novo, entao nao muda nada", async () => {
      await definirEstado({ dias_atual: 3, dias_recorde: 3, ultimo_dia_praticado: diasAtras(0), freezes_disponiveis: 1 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(3);
      expect(estado.freezes_disponiveis).toBe(1);
    });
  });

  describe("dado que perdeu um dia sem freeze disponivel", () => {
    it("quando atualiza, entao zera a sequencia mas mantem o recorde", async () => {
      await definirEstado({ dias_atual: 10, dias_recorde: 10, ultimo_dia_praticado: diasAtras(2), freezes_disponiveis: 0 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(1);
      expect(estado.freezes_disponiveis).toBe(0);
      expect(estado.dias_recorde).toBe(10);
    });
  });

  describe("dado que perdeu um dia com freeze disponivel", () => {
    it("quando atualiza, entao mantem a sequencia e consome o freeze", async () => {
      await definirEstado({ dias_atual: 10, dias_recorde: 10, ultimo_dia_praticado: diasAtras(2), freezes_disponiveis: 1 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(11);
      expect(estado.freezes_disponiveis).toBe(0);
    });
  });

  describe("dado que a sequencia chega a um multiplo de 7", () => {
    it("quando atualiza, entao ganha um freeze", async () => {
      await definirEstado({ dias_atual: 6, dias_recorde: 6, ultimo_dia_praticado: diasAtras(1), freezes_disponiveis: 1 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(7);
      expect(estado.freezes_disponiveis).toBe(2);
    });

    it("dado que ja tem 2 freezes, quando atualiza, entao nao ultrapassa o teto", async () => {
      await definirEstado({ dias_atual: 6, dias_recorde: 6, ultimo_dia_praticado: diasAtras(1), freezes_disponiveis: 2 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(7);
      expect(estado.freezes_disponiveis).toBe(2);
    });
  });

  describe("dado um erro real do banco (linha singleton ausente)", () => {
    it("quando atualizarStreak e chamado, entao nao lanca excecao", async () => {
      await db.from("streak_estado").delete().eq("singleton", true);
      await expect(atualizarStreak(db)).resolves.toBeUndefined();
      await db.from("streak_estado").insert({ singleton: true, ...original });
    });
  });
});
