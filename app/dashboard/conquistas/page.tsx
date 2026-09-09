import { Lock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { getHeaderData } from "@/lib/profile/header-data";
import { CONTADORES } from "@/lib/achievements/progress";
import { ACHIEVEMENT_ICONS } from "@/lib/achievements/icons";
import type { Achievement, Metrica } from "@/lib/achievements/types";
import { DashboardHeader } from "../_components/dashboard-header";
import { DashboardSection } from "../_components/dashboard-section";

export const dynamic = "force-dynamic";

const CATEGORIA_LABEL: Record<string, string> = {
  vocabulario: "Vocabulário",
  primeira_vez: "Primeiras vezes",
  consistencia: "Consistência",
};

const NOVO_LIMITE_MS = 48 * 60 * 60 * 1000;

export default async function ConquistasPage() {
  const db = supabaseAdmin();
  const userId = getLocalUserId();

  const [{ data: achievements }, { data: desbloqueadas }, headerData] = await Promise.all([
    db.from("achievements").select("*").order("categoria").order("ordem"),
    db.from("user_achievements").select("achievement_chave, desbloqueado_em").eq("user_id", userId),
    getHeaderData(db),
  ]);

  const desbloqueadaPorChave = new Map(
    (desbloqueadas ?? []).map((d) => [d.achievement_chave, d.desbloqueado_em as string]),
  );

  const metricas = Object.keys(CONTADORES) as Metrica[];
  const contagensPorMetrica = Object.fromEntries(
    await Promise.all(metricas.map(async (m) => [m, await CONTADORES[m](db, userId)] as const)),
  ) as Record<Metrica, number>;

  const porCategoria = new Map<string, Achievement[]>();
  for (const a of (achievements ?? []) as Achievement[]) {
    const lista = porCategoria.get(a.categoria) ?? [];
    lista.push(a);
    porCategoria.set(a.categoria, lista);
  }

  const agora = new Date();

  return (
    <>
      <DashboardHeader current="/dashboard/conquistas" {...headerData} />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">Marcos da sua jornada</p>
        <h1 className="font-display text-3xl">Conquistas</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Selos desbloqueados conforme você estuda — cada idioma tem sua própria coleção.
        </p>

        {[...porCategoria.entries()].map(([categoria, lista]) => (
          <DashboardSection key={categoria} label={CATEGORIA_LABEL[categoria] ?? categoria} className="mt-10">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {lista.map((a) => {
                const desbloqueadoEm = desbloqueadaPorChave.get(a.chave);
                const desbloqueado = Boolean(desbloqueadoEm);
                const novo =
                  desbloqueado && agora.getTime() - new Date(desbloqueadoEm!).getTime() < NOVO_LIMITE_MS;
                const Icone = ACHIEVEMENT_ICONS[a.icone] ?? Lock;
                const progresso =
                  a.limite !== null && a.metrica !== null ? contagensPorMetrica[a.metrica] : null;

                return (
                  <div key={a.chave} className="flex flex-col items-center gap-2 text-center">
                    <div className="relative">
                      <div
                        className="postmark"
                        data-filled={desbloqueado}
                        data-tone={desbloqueado ? "stamp" : undefined}
                        style={{ "--size": "3.5rem" } as React.CSSProperties}
                      >
                        {desbloqueado ? (
                          <Icone size={22} strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <Lock size={18} strokeWidth={1.75} aria-hidden="true" />
                        )}
                      </div>
                      {novo && (
                        <span className="envelope-tag absolute -right-2 -top-2 px-1.5 py-0.5 text-[0.6rem]">
                          novo
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{a.titulo}</p>
                    <p className="text-xs text-ink-soft">{a.descricao}</p>
                    {!desbloqueado && progresso !== null && (
                      <p className="font-mono text-xs text-ink-soft">
                        {progresso}/{a.limite}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </DashboardSection>
        ))}
      </main>
    </>
  );
}
