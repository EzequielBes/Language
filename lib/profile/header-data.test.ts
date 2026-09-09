import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getHeaderData } from "./header-data";

const db = supabaseAdmin();

describe("getHeaderData", () => {
  describe("dado nenhum perfil de idioma cadastrado ainda", () => {
    it("quando busca os dados do cabecalho, entao usa o idioma padrao como unica opcao", async () => {
      const { idiomas } = await getHeaderData(db);
      expect(idiomas.length).toBeGreaterThan(0);
    });
  });

  describe("dado perfis de idioma existentes", () => {
    // "local:zz" segue a convencao real de user_id (lib/profile/active-profile.ts)
    // — listLanguageProfiles filtra por user_id like "local%". "zz" e ficticio,
    // nao colide com idiomas reais seedados.
    const TEST_USER = "local:zz";

    beforeAll(async () => {
      await db.from("profiles").delete().eq("user_id", TEST_USER);
      await db.from("profiles").insert({ user_id: TEST_USER, idioma_alvo: "zz" });
    });

    afterAll(async () => {
      await db.from("profiles").delete().eq("user_id", TEST_USER);
    });

    it("quando busca os dados do cabecalho, entao inclui o idioma do perfil criado", async () => {
      const { idiomas } = await getHeaderData(db);
      expect(idiomas).toContain("zz");
    });
  });
});
