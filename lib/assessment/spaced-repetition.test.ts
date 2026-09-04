import { describe, expect, it } from "vitest";
import { calcularProximaRevisao, INTERVALOS_DIAS } from "./spaced-repetition";

const DIA_MS = 24 * 60 * 60 * 1000;

describe("calcularProximaRevisao", () => {
  it("avanca um degrau quando conhecido", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const { streak, proximaRevisaoEm } = calcularProximaRevisao(0, "conhecido", agora);
    expect(streak).toBe(1);
    expect(proximaRevisaoEm.getTime() - agora.getTime()).toBe(INTERVALOS_DIAS[1] * DIA_MS);
  });

  it("nao ultrapassa o ultimo degrau", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const ultimo = INTERVALOS_DIAS.length - 1;
    const { streak } = calcularProximaRevisao(ultimo, "conhecido", agora);
    expect(streak).toBe(ultimo);
  });

  it("volta pro primeiro degrau quando desconhecido", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const { streak, proximaRevisaoEm } = calcularProximaRevisao(3, "desconhecido", agora);
    expect(streak).toBe(0);
    expect(proximaRevisaoEm.getTime() - agora.getTime()).toBe(INTERVALOS_DIAS[0] * DIA_MS);
  });

  it("recua um degrau quando parcial", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const { streak } = calcularProximaRevisao(2, "parcial", agora);
    expect(streak).toBe(1);
  });

  it("parcial no primeiro degrau nao fica negativo", () => {
    const agora = new Date("2026-01-01T00:00:00Z");
    const { streak } = calcularProximaRevisao(0, "parcial", agora);
    expect(streak).toBe(0);
  });
});
