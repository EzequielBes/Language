import { describe, expect, it } from "vitest";
import { validateCenarioInput } from "./validate";

describe("validateCenarioInput", () => {
  describe("dado um titulo vazio", () => {
    it("quando valida, entao retorna erro", () => {
      const resultado = validateCenarioInput({ titulo: "", promptSeed: "Prompt valido" });
      expect(resultado.ok).toBe(false);
    });
  });

  describe("dado um titulo com mais de 120 caracteres", () => {
    it("quando valida, entao retorna erro", () => {
      const resultado = validateCenarioInput({
        titulo: "a".repeat(121),
        promptSeed: "Prompt valido",
      });
      expect(resultado.ok).toBe(false);
    });
  });

  describe("dado um prompt_seed vazio", () => {
    it("quando valida, entao retorna erro", () => {
      const resultado = validateCenarioInput({ titulo: "Titulo valido", promptSeed: "" });
      expect(resultado.ok).toBe(false);
    });
  });

  describe("dado um prompt_seed com mais de 2000 caracteres", () => {
    it("quando valida, entao retorna erro", () => {
      const resultado = validateCenarioInput({
        titulo: "Titulo valido",
        promptSeed: "a".repeat(2001),
      });
      expect(resultado.ok).toBe(false);
    });
  });

  describe("dado um titulo e prompt_seed dentro dos limites", () => {
    it("quando valida, entao retorna ok com os valores tratados (trim)", () => {
      const resultado = validateCenarioInput({
        titulo: "  Titulo valido  ",
        promptSeed: "  Prompt valido  ",
      });
      expect(resultado).toEqual({ ok: true, titulo: "Titulo valido", promptSeed: "Prompt valido" });
    });
  });
});
