import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service-role key — usado só dentro das tools MCP, DEPOIS que
 * withMcpAuth já verificou o bearer token. RLS é bypassada aqui, então toda
 * query precisa filtrar manualmente por user_id (ver lib/mcp/tools.ts).
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar definidos",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
