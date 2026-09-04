import { describe, expect, it } from "vitest";
import {
  applyResponse,
  proximoDominio,
  seedState,
  sessaoCompleta,
  TETO_ITENS_SESSAO,
} from "./adaptive";

describe("seedState", () => {
  it("semeia todos os dominios no nivel declarado", () => {
    const state = seedState(3);
    expect(state.vocabulario.nivel).toBe(3);
    expect(state.gramatica.nivel).toBe(3);
    expect(state.expressao.nivel).toBe(3);
  });

  it("limita o nivel declarado a faixa CEFR (A1-C2)", () => {
    expect(seedState(9).vocabulario.nivel).toBe(6);
    expect(seedState(0).vocabulario.nivel).toBe(1);
  });
});

describe("applyResponse", () => {
  it("sobe de nivel apos 2 acertos seguidos", () => {
    let state = seedState(3);
    state = applyResponse(state, "vocabulario", "conhecido");
    expect(state.vocabulario.nivel).toBe(3);
    state = applyResponse(state, "vocabulario", "conhecido");
    expect(state.vocabulario.nivel).toBe(4);
    expect(state.vocabulario.acertos_seguidos).toBe(0);
  });

  it("desce de nivel apos 2 erros seguidos", () => {
    let state = seedState(3);
    state = applyResponse(state, "gramatica", "desconhecido");
    state = applyResponse(state, "gramatica", "desconhecido");
    expect(state.gramatica.nivel).toBe(2);
  });

  it("nao ultrapassa o teto C2 nem o piso A1", () => {
    let state = seedState(6);
    for (let i = 0; i < 6; i++) {
      state = applyResponse(state, "vocabulario", "conhecido");
    }
    expect(state.vocabulario.nivel).toBe(6);

    state = seedState(1);
    for (let i = 0; i < 6; i++) {
      state = applyResponse(state, "vocabulario", "desconhecido");
    }
    expect(state.vocabulario.nivel).toBe(1);
  });

  it("resposta parcial reseta o streak sem mudar o nivel", () => {
    let state = seedState(3);
    state = applyResponse(state, "expressao", "conhecido");
    state = applyResponse(state, "expressao", "parcial");
    expect(state.expressao.nivel).toBe(3);
    expect(state.expressao.acertos_seguidos).toBe(0);
  });
});

describe("proximoDominio", () => {
  it("escolhe o dominio com menos respostas (round-robin)", () => {
    let state = seedState(3);
    state = applyResponse(state, "vocabulario", "conhecido");
    expect(proximoDominio(state)).toBe("gramatica");
  });
});

describe("sessaoCompleta", () => {
  it("para quando atinge o teto de itens da sessao", () => {
    expect(sessaoCompleta(seedState(3), TETO_ITENS_SESSAO)).toBe(true);
  });

  it("nao termina antes do minimo de respostas por dominio", () => {
    expect(sessaoCompleta(seedState(3), 0)).toBe(false);
  });

  it("termina quando todos os dominios estabilizam apos o minimo", () => {
    let state = seedState(3);
    let total = 0;
    for (const domain of ["vocabulario", "gramatica", "expressao"] as const) {
      for (let i = 0; i < 6; i++) {
        state = applyResponse(state, domain, "parcial");
        total++;
      }
    }
    expect(sessaoCompleta(state, total)).toBe(true);
  });
});
