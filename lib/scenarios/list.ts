import type { SupabaseClient } from "@supabase/supabase-js";

export interface Scenario {
  id: string;
  titulo: string;
  prompt_seed: string;
  tipo_objetivo: string | null;
  predefinido: boolean;
}

const CAMPOS = "id, titulo, prompt_seed, tipo_objetivo, predefinido";

// Predefinidos (user_id null) e personalizados (escopados por perfil/idioma
// ativo) sao buscados em queries separadas — uma unica query sem filtro de
// user_id misturava cenarios personalizados entre perfis de idioma diferentes.
export async function listScenarios(
  db: SupabaseClient,
  userId: string,
): Promise<{ predefinidos: Scenario[]; personalizados: Scenario[] }> {
  const [predefinidosRes, personalizadosRes] = await Promise.all([
    db
      .from("scenarios")
      .select(CAMPOS)
      .is("user_id", null)
      .order("criado_em", { ascending: false }),
    db
      .from("scenarios")
      .select(CAMPOS)
      .eq("user_id", userId)
      .order("criado_em", { ascending: false }),
  ]);
  if (predefinidosRes.error) throw predefinidosRes.error;
  if (personalizadosRes.error) throw personalizadosRes.error;

  return {
    predefinidos: (predefinidosRes.data ?? []) as Scenario[],
    personalizados: (personalizadosRes.data ?? []) as Scenario[],
  };
}
