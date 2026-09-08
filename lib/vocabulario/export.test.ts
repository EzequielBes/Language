import { describe, expect, it } from "vitest";
import { itensParaCsv, type VocabularioItem } from "./export";

function item(overrides: Partial<VocabularioItem> = {}): VocabularioItem {
  return {
    texto: "hello",
    dominio: "vocabulario",
    nivel: "A1",
    definicao: "Cumprimento informal.",
    ...overrides,
  };
}

describe("itensParaCsv", () => {
  describe("dado uma lista vazia", () => {
    it("quando gera o csv, entao so tem a linha de cabecalho", () => {
      expect(itensParaCsv([])).toBe("Texto,Domínio,Nível,Definição");
    });
  });

  describe("dado um item com campos simples", () => {
    it("quando gera o csv, entao produz uma linha com os campos separados por virgula", () => {
      const csv = itensParaCsv([item()]);
      expect(csv).toBe(
        "Texto,Domínio,Nível,Definição\nhello,vocabulario,A1,Cumprimento informal.",
      );
    });
  });

  describe("dado um item sem definicao", () => {
    it("quando gera o csv, entao o campo definicao fica vazio (nao 'null')", () => {
      const csv = itensParaCsv([item({ definicao: null })]);
      expect(csv.endsWith(",")).toBe(true);
      expect(csv).not.toContain("null");
    });
  });

  describe("dado um campo com virgula", () => {
    it("quando gera o csv, entao o campo fica entre aspas", () => {
      const csv = itensParaCsv([item({ definicao: "Usa-se para saudar, cumprimentar." })]);
      expect(csv).toContain('"Usa-se para saudar, cumprimentar."');
    });
  });

  describe("dado um campo com aspas duplas", () => {
    it("quando gera o csv, entao escapa as aspas duplicando-as e envolve o campo em aspas", () => {
      const csv = itensParaCsv([item({ texto: 'diz "oi"' })]);
      expect(csv).toContain('"diz ""oi"""');
    });
  });

  describe("dado varios itens", () => {
    it("quando gera o csv, entao cada item vira uma linha, na ordem recebida", () => {
      const csv = itensParaCsv([
        item({ texto: "hello" }),
        item({ texto: "goodbye", dominio: "vocabulario", nivel: "A1", definicao: null }),
      ]);
      const linhas = csv.split("\n");
      expect(linhas).toHaveLength(3); // cabecalho + 2 itens
      expect(linhas[1]).toContain("hello");
      expect(linhas[2]).toContain("goodbye");
    });
  });
});
