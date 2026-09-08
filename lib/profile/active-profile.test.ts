import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_LANGUAGE,
  getActiveLanguage,
  getLocalUserId,
  setActiveLanguage,
  userIdForLanguage,
} from "@/lib/profile/active-profile";

// Mesmo arquivo real usado pelo processo MCP e pelo dashboard — o teste
// salva o conteudo original e restaura no fim pra nao deixar o ambiente de
// dev com o idioma ativo trocado.
const STATE_PATH = fileURLToPath(new URL("../../.local-profile.json", import.meta.url));

describe("lib/profile/active-profile", () => {
  let original: string | null = null;

  beforeAll(() => {
    original = existsSync(STATE_PATH) ? readFileSync(STATE_PATH, "utf-8") : null;
  });

  afterAll(() => {
    if (original === null) rmSync(STATE_PATH, { force: true });
    else writeFileSync(STATE_PATH, original);
  });

  it("assume ingles como idioma padrao quando nao ha estado salvo", () => {
    rmSync(STATE_PATH, { force: true });
    expect(getActiveLanguage()).toBe(DEFAULT_LANGUAGE);
    expect(getLocalUserId()).toBe("local");
  });

  it("persiste o idioma trocado, simulando dois processos lendo o mesmo arquivo", () => {
    setActiveLanguage("ja");
    expect(getActiveLanguage()).toBe("ja");
    expect(getLocalUserId()).toBe("local:ja");
  });

  it("mantem 'local' (sem sufixo) como alias do idioma padrao", () => {
    setActiveLanguage(DEFAULT_LANGUAGE);
    expect(getLocalUserId()).toBe("local");
  });

  it("userIdForLanguage mapeia idioma -> user_id de forma pura", () => {
    expect(userIdForLanguage("en")).toBe("local");
    expect(userIdForLanguage("es")).toBe("local:es");
  });
});
