import { describe, expect, it } from "vitest";
import { localeParaIdioma } from "./locale";

describe("localeParaIdioma", () => {
  describe("dado um idioma com locale mapeado", () => {
    it.each([
      ["en", "en-US"],
      ["ja", "ja-JP"],
      ["es", "es-ES"],
      ["fr", "fr-FR"],
      ["de", "de-DE"],
      ["it", "it-IT"],
    ])("quando o idioma e '%s', entao o locale e '%s'", (idioma, esperado) => {
      expect(localeParaIdioma(idioma)).toBe(esperado);
    });
  });

  describe("dado um idioma sem locale mapeado", () => {
    it("quando o codigo tem 2 letras, entao usa o proprio codigo como locale (o navegador tenta casar por prefixo)", () => {
      expect(localeParaIdioma("pt")).toBe("pt");
    });
  });

  describe("dado um codigo de idioma em caixa alta ou com espacos", () => {
    it("quando normaliza, entao ainda encontra o locale mapeado", () => {
      expect(localeParaIdioma(" EN ")).toBe("en-US");
    });
  });
});
