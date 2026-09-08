import type { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_LANGUAGE, userIdForLanguage } from "@/lib/profile/active-profile";

type Db = ReturnType<typeof supabaseAdmin>;

export interface LanguageProfileRow {
  user_id: string;
  idioma_alvo: string | null;
  onboarding_status: string;
  nivel_autodeclarado: string | null;
}

// Todos os perfis de idioma vivem na mesma tabela `profiles`, diferenciados
// pelo prefixo do user_id ("local" ou "local:<idioma>") — sem tabela nova.
export async function listLanguageProfiles(db: Db): Promise<LanguageProfileRow[]> {
  const { data, error } = await db
    .from("profiles")
    .select("user_id, idioma_alvo, onboarding_status, nivel_autodeclarado")
    .like("user_id", "local%")
    .order("criado_em", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Mesmo formato de get_or_create_profile (lib/mcp/tools.ts): reaproveita se
// ja existir, cria vazio se for a primeira vez pra esse idioma.
export async function ensureLanguageProfile(db: Db, idioma: string) {
  const userId = userIdForLanguage(idioma);

  const { data: existing } = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await db
    .from("profiles")
    .insert({ user_id: userId, idioma_alvo: idioma === DEFAULT_LANGUAGE ? null : idioma })
    .select("*")
    .single();
  if (error) throw error;
  return created;
}
