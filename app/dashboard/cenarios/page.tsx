import Link from "next/link";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { LOCAL_USER_ID } from "@/lib/mcp/shared";

export const dynamic = "force-dynamic";

const OBJETIVOS: Record<string, string> = {
  trabalho: "Trabalho",
  viagem: "Viagem",
  entrevista: "Entrevista",
  dia_a_dia: "Dia a dia",
  custom: "Personalizado",
};

async function criarCenario(formData: FormData) {
  "use server";
  const db = supabaseAdmin();

  const titulo = String(formData.get("titulo") ?? "").trim();
  const promptSeed = String(formData.get("prompt_seed") ?? "").trim();
  const tipoObjetivo = String(formData.get("tipo_objetivo") ?? "");

  if (!titulo || !promptSeed) return;

  const { error } = await db.from("scenarios").insert({
    user_id: LOCAL_USER_ID,
    titulo,
    prompt_seed: promptSeed,
    tipo_objetivo: tipoObjetivo || null,
  });
  if (error) {
    console.error("[dashboard/cenarios] falha ao criar cenario:", error.message);
    return;
  }

  revalidatePath("/dashboard/cenarios");
}

export default async function CenariosPage() {
  const db = supabaseAdmin();

  const { data: cenarios } = await db
    .from("scenarios")
    .select("id, titulo, prompt_seed, tipo_objetivo, predefinido")
    .order("predefinido", { ascending: false })
    .order("criado_em", { ascending: false });

  const predefinidos = (cenarios ?? []).filter((c) => c.predefinido);
  const personalizados = (cenarios ?? []).filter((c) => !c.predefinido);

  return (
    <>
      <div className="airmail-stripe" />

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-lg tracking-tight">
            Correio
          </Link>
          <Link href="/dashboard" className="text-sm text-ink-soft hover:text-ink">
            Meu painel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl flex-1 px-6 py-16">
        <h1 className="font-display text-3xl">Cenários de conversa</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Escolha uma persona antes de conversar com o Claude — por texto ou
          pelo modo de voz do próprio Claude.ai. Peça ao Claude para usar um
          desses cenários no início da conversa.
        </p>

        <section className="mt-10">
          <p className="text-xs text-ink-soft">Predefinidos</p>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {predefinidos.map((cenario) => (
              <li key={cenario.id} className="py-4">
                <div className="flex items-center gap-3">
                  <span className="envelope-tag">
                    {OBJETIVOS[cenario.tipo_objetivo ?? ""] ?? "Geral"}
                  </span>
                  <span className="font-medium">{cenario.titulo}</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{cenario.prompt_seed}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <p className="text-xs text-ink-soft">Seus cenários</p>
          {personalizados.length === 0 ? (
            <p className="mt-4 text-ink-soft">Nenhum ainda — crie um abaixo.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {personalizados.map((cenario) => (
                <li key={cenario.id} className="py-4">
                  <div className="flex items-center gap-3">
                    <span className="envelope-tag">
                      {OBJETIVOS[cenario.tipo_objetivo ?? ""] ?? "Geral"}
                    </span>
                    <span className="font-medium">{cenario.titulo}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{cenario.prompt_seed}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <p className="text-xs text-ink-soft">Criar cenário</p>
          <form action={criarCenario} className="mt-4 space-y-4">
            <div>
              <label htmlFor="titulo" className="block text-sm">
                Título
              </label>
              <input
                id="titulo"
                name="titulo"
                required
                maxLength={120}
                className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="tipo_objetivo" className="block text-sm">
                Objetivo
              </label>
              <select
                id="tipo_objetivo"
                name="tipo_objetivo"
                className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="">Geral</option>
                {Object.entries(OBJETIVOS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prompt_seed" className="block text-sm">
                O que o Claude deve interpretar
              </label>
              <textarea
                id="prompt_seed"
                name="prompt_seed"
                required
                maxLength={2000}
                rows={4}
                placeholder="Ex: Você é um recrutador técnico entrevistando para uma vaga de suporte ao cliente..."
                className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="border border-ink bg-ink px-5 py-2.5 text-sm text-paper hover:bg-stamp hover:border-stamp"
            >
              Criar cenário
            </button>
          </form>
        </section>
      </main>

      <div className="airmail-stripe" />
    </>
  );
}
