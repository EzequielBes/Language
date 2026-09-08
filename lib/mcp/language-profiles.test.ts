import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createTestMcpServer, parseToolResult } from "@/lib/mcp/test-utils";
import { registerLanguageProfileTools } from "@/lib/mcp/language-profiles";

// Codigo de idioma ficticio que nao colide com nenhum idioma real seedado.
const TEST_LANG = "zz";
const TEST_USER_ID = "local:zz";

const STATE_PATH = fileURLToPath(new URL("../../.local-profile.json", import.meta.url));
const db = supabaseAdmin();

describe("mcp/language-profiles (integracao real contra Supabase)", () => {
  const { server, handlers } = createTestMcpServer();
  registerLanguageProfileTools(server);

  let originalState: string | null = null;

  beforeAll(() => {
    originalState = existsSync(STATE_PATH) ? readFileSync(STATE_PATH, "utf-8") : null;
  });

  afterAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER_ID);
    if (originalState === null) rmSync(STATE_PATH, { force: true });
    else writeFileSync(STATE_PATH, originalState);
  });

  it("cria um novo perfil de idioma e o torna ativo", async () => {
    const criado = parseToolResult<{ ativo: string; profile: { user_id: string } }>(
      await handlers.get("create_language_profile")!({ idioma_alvo: TEST_LANG }),
    );
    expect(criado.ativo).toBe(TEST_LANG);
    expect(criado.profile.user_id).toBe(TEST_USER_ID);
  });

  it("lista o perfil recem-criado marcado como ativo", async () => {
    const listado = parseToolResult<{
      ativo: string;
      perfis: { idioma: string; ativo: boolean }[];
    }>(await handlers.get("list_language_profiles")!({}));

    expect(listado.ativo).toBe(TEST_LANG);
    const entrada = listado.perfis.find((p) => p.idioma === TEST_LANG);
    expect(entrada?.ativo).toBe(true);
  });

  it("troca de volta pro idioma padrao (perfil 'local' ja existente)", async () => {
    const trocado = parseToolResult<{ ativo: string }>(
      await handlers.get("switch_active_language")!({ idioma: "en" }),
    );
    expect(trocado.ativo).toBe("en");
  });

  it("recusa trocar pra um idioma sem perfil criado ainda", async () => {
    await expect(handlers.get("switch_active_language")!({ idioma: "xx" })).rejects.toThrow(
      /nao existe perfil/i,
    );
  });
});
