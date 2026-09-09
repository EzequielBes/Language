import type { supabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_LANGUAGE, getActiveLanguage } from "@/lib/profile/active-profile";
import { listLanguageProfiles } from "@/lib/profile/language-profiles";

type Db = ReturnType<typeof supabaseAdmin>;

export interface HeaderData {
  idiomas: string[];
  ativo: string;
}

// Extraido de DashboardHeader pra poder ser buscado em paralelo com a query
// propria de cada pagina (Promise.all), em vez de so comecar depois que a
// pagina inteira ja terminou de renderizar (waterfall sequencial).
export async function getHeaderData(db: Db): Promise<HeaderData> {
  const perfis = await listLanguageProfiles(db).catch(() => []);
  const idiomas = perfis.length > 0 ? perfis.map((p) => p.idioma_alvo ?? DEFAULT_LANGUAGE) : [DEFAULT_LANGUAGE];
  return { idiomas, ativo: getActiveLanguage() };
}
