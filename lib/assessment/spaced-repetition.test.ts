import { describe, expect, it } from "vitest";
import {
  calcularProximaRevisao,
  FATOR_FACILIDADE_INICIAL,
  FATOR_FACILIDADE_MINIMO,
  type EstadoRepeticao,
} from "./spaced-repetition";

const DIA_MS = 24 * 60 * 60 * 1000;
const AGORA = new Date("2026-01-01T00:00:00Z");

const ITEM_NOVO: EstadoRepeticao = {
  streak: 0,
  fatorFacilidade: FATOR_FACILIDADE_INICIAL,
  intervaloDias: 0,
};

describe("calcularProximaRevisao (SM-2-lite)", () => {
  describe("dado um item nunca revisado", () => {
    it("quando o aluno acerta, entao agenda pra amanha e sobe o fator de facilidade", () => {
      const r = calcularProximaRevisao(ITEM_NOVO, "conhecido", AGORA);
      expect(r.streak).toBe(1);
      expect(r.intervaloDias).toBe(1);
      expect(r.proximaRevisaoEm.getTime() - AGORA.getTime()).toBe(1 * DIA_MS);
      expect(r.fatorFacilidade).toBeCloseTo(FATOR_FACILIDADE_INICIAL + 0.1);
    });

    it("quando o aluno erra, entao streak fica 0, agenda pra amanha e reduz o fator", () => {
      const r = calcularProximaRevisao(ITEM_NOVO, "desconhecido", AGORA);
      expect(r.streak).toBe(0);
      expect(r.intervaloDias).toBe(1);
      expect(r.fatorFacilidade).toBeCloseTo(FATOR_FACILIDADE_INICIAL - 0.2);
    });
  });

  describe("dado um item com 1 acerto seguido (streak 1)", () => {
    const estado: EstadoRepeticao = { streak: 1, fatorFacilidade: 2.6, intervaloDias: 1 };

    it("quando o aluno acerta de novo, entao agenda pra daqui 6 dias", () => {
      const r = calcularProximaRevisao(estado, "conhecido", AGORA);
      expect(r.streak).toBe(2);
      expect(r.intervaloDias).toBe(6);
      expect(r.proximaRevisaoEm.getTime() - AGORA.getTime()).toBe(6 * DIA_MS);
    });
  });

  describe("dado um item com 2+ acertos seguidos (streak >= 2)", () => {
    const estado: EstadoRepeticao = { streak: 2, fatorFacilidade: 2.7, intervaloDias: 6 };

    it("quando o aluno acerta de novo, entao o intervalo e o anterior multiplicado pelo fator atual", () => {
      const r = calcularProximaRevisao(estado, "conhecido", AGORA);
      expect(r.streak).toBe(3);
      expect(r.intervaloDias).toBe(Math.round(6 * 2.7)); // 16
    });

    it("quando o aluno responde parcial, entao o streak ainda avanca mas o fator futuro cai", () => {
      const r = calcularProximaRevisao(estado, "parcial", AGORA);
      expect(r.streak).toBe(3);
      // o intervalo desta vez usa o fator ANTIGO (mais alto)...
      expect(r.intervaloDias).toBe(Math.round(6 * 2.7));
      // ...mas o fator armazenado pra proxima vez ja vem reduzido.
      expect(r.fatorFacilidade).toBeCloseTo(2.7 - 0.14);
    });
  });

  describe("dado um item com qualquer historico", () => {
    it("quando o aluno erra, entao streak volta a 0 e reagenda pra amanha, nao importa o intervalo anterior", () => {
      const estado: EstadoRepeticao = { streak: 5, fatorFacilidade: 2.9, intervaloDias: 90 };
      const r = calcularProximaRevisao(estado, "desconhecido", AGORA);
      expect(r.streak).toBe(0);
      expect(r.intervaloDias).toBe(1);
    });
  });

  describe("o fator de facilidade nunca cai abaixo do piso", () => {
    it("varios erros seguidos nao derrubam o fator alem do minimo", () => {
      let estado: EstadoRepeticao = ITEM_NOVO;
      for (let i = 0; i < 20; i++) {
        estado = calcularProximaRevisao(estado, "desconhecido", AGORA);
      }
      expect(estado.fatorFacilidade).toBeCloseTo(FATOR_FACILIDADE_MINIMO);
    });

    it("respostas parciais repetidas tambem respeitam o piso", () => {
      let estado: EstadoRepeticao = ITEM_NOVO;
      for (let i = 0; i < 20; i++) {
        estado = calcularProximaRevisao(estado, "parcial", AGORA);
      }
      expect(estado.fatorFacilidade).toBeGreaterThanOrEqual(FATOR_FACILIDADE_MINIMO);
    });
  });
});
