import { describe, expect, it } from "vitest";
import { escolherLacuna } from "@/lib/activities/generators/cloze";

describe("escolherLacuna", () => {
  it("monta antes/depois reconstruiveis (antes + resposta + depois === texto original)", () => {
    const texto = "how are you? / I'm fine, thanks";
    const lacuna = escolherLacuna(texto);
    expect(lacuna).not.toBeNull();
    expect(`${lacuna!.antes}${lacuna!.resposta}${lacuna!.depois}`.toLowerCase()).toBe(
      texto.toLowerCase(),
    );
  });

  it("nunca escolhe token com apostrofo, pontuacao colada ou menos de 3 letras", () => {
    for (let i = 0; i < 30; i++) {
      const lacuna = escolherLacuna("how are you? / I'm fine, thanks");
      expect(lacuna).not.toBeNull();
      expect(["you?", "I'm", "fine,"]).not.toContain(lacuna!.resposta);
      expect(lacuna!.resposta.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("retorna null quando nao ha nenhuma palavra 'limpa' de 3+ letras", () => {
    expect(escolherLacuna("1-20")).toBeNull();
    expect(escolherLacuna("am/is/are")).toBeNull();
  });

  it("resposta sempre em minusculo, mesmo se o token original tinha maiuscula", () => {
    const lacuna = escolherLacuna("Nice to meet you");
    expect(lacuna!.resposta).toBe(lacuna!.resposta.toLowerCase());
  });
});
