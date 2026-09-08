import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dbFail, json } from "@/lib/mcp/shared";
import {
  DEFAULT_LANGUAGE,
  IDIOMA_RE,
  getActiveLanguage,
  setActiveLanguage,
  userIdForLanguage,
} from "@/lib/profile/active-profile";
import { ensureLanguageProfile, listLanguageProfiles } from "@/lib/profile/language-profiles";

export function registerLanguageProfileTools(server: McpServer) {
  server.registerTool(
    "list_language_profiles",
    {
      title: "Listar perfis de idioma",
      description:
        "Lista os perfis de idioma criados neste ambiente (uso pessoal, um perfil separado por idioma estudado, estilo Duolingo) e marca qual esta ativo agora.",
      inputSchema: z.object({}),
    },
    async () => {
      const db = supabaseAdmin();
      const ativo = getActiveLanguage();

      let perfis;
      try {
        perfis = await listLanguageProfiles(db);
      } catch (error) {
        dbFail(error as { message: string });
      }

      return json({
        ativo,
        perfis: perfis.map((p) => ({
          idioma: p.idioma_alvo ?? DEFAULT_LANGUAGE,
          onboarding_status: p.onboarding_status,
          nivel_autodeclarado: p.nivel_autodeclarado,
          ativo: (p.idioma_alvo ?? DEFAULT_LANGUAGE) === ativo,
        })),
      });
    },
  );

  server.registerTool(
    "create_language_profile",
    {
      title: "Criar perfil de idioma",
      description:
        "Cria (ou reaproveita, se ja existir) um perfil de estudo separado para outro idioma alvo, e o torna o perfil ativo. Use quando o aluno quiser comecar a estudar um idioma diferente do atual.",
      inputSchema: z.object({
        idioma_alvo: z
          .string()
          .regex(IDIOMA_RE)
          .describe("Codigo ISO 639 minusculo do idioma, ex: en, ja, es"),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();
      let profile;
      try {
        profile = await ensureLanguageProfile(db, args.idioma_alvo);
      } catch (error) {
        dbFail(error as { message: string });
      }
      setActiveLanguage(args.idioma_alvo);
      return json({ profile, ativo: args.idioma_alvo });
    },
  );

  server.registerTool(
    "switch_active_language",
    {
      title: "Trocar idioma ativo",
      description:
        "Troca qual perfil de idioma fica ativo para as proximas chamadas (avaliacao, flashcards, cenarios etc). O perfil precisa ja existir — use create_language_profile primeiro se for um idioma novo.",
      inputSchema: z.object({
        idioma: z.string().regex(IDIOMA_RE),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();
      const { data: existing, error } = await db
        .from("profiles")
        .select("user_id")
        .eq("user_id", userIdForLanguage(args.idioma))
        .maybeSingle();
      if (error) dbFail(error);
      if (!existing) {
        throw new Error(
          `Ainda nao existe perfil para "${args.idioma}". Use create_language_profile primeiro.`,
        );
      }

      setActiveLanguage(args.idioma);
      return json({ ativo: args.idioma });
    },
  );
}
