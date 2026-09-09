import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { listScenarios } from "@/lib/scenarios/list";
import { validateCenarioInput } from "@/lib/scenarios/validate";
import { DashboardHeader } from "../_components/dashboard-header";
import { DashboardSection } from "../_components/dashboard-section";
import { CopyPrompt } from "../_components/copy-prompt";

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

  const tipoObjetivo = String(formData.get("tipo_objetivo") ?? "");

  const validado = validateCenarioInput({
    titulo: String(formData.get("titulo") ?? ""),
    promptSeed: String(formData.get("prompt_seed") ?? ""),
  });
  if (!validado.ok) {
    console.error("[dashboard/cenarios] entrada invalida:", validado.error);
    return;
  }

  const { error } = await db.from("scenarios").insert({
    user_id: getLocalUserId(),
    titulo: validado.titulo,
    prompt_seed: validado.promptSeed,
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
  const { predefinidos, personalizados } = await listScenarios(db, getLocalUserId());

  return (
    <>

      <DashboardHeader current="/dashboard/cenarios" />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">Uma conversa por vez</p>
        <h1 className="font-display text-3xl">Cenários de conversa</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Escolha uma persona antes de conversar com o Claude — por texto ou
          pelo modo de voz do próprio Claude.ai. Peça ao Claude para usar um
          desses cenários no início da conversa.
        </p>

        <DashboardSection label="Predefinidos">
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
            {predefinidos.map((cenario) => (
              <li key={cenario.id} className="px-3 py-4">
                <div className="flex items-center gap-3">
                  <span className="envelope-tag">
                    {OBJETIVOS[cenario.tipo_objetivo ?? ""] ?? "Geral"}
                  </span>
                  <span className="font-medium">{cenario.titulo}</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{cenario.prompt_seed}</p>
                <CopyPrompt prompt={`Vamos fazer o cenário "${cenario.titulo}" agora.`} />
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection label="Seus cenários">
          {personalizados.length === 0 ? (
            <p className="text-ink-soft">Nenhum ainda — crie um abaixo.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-paper">
              {personalizados.map((cenario) => (
                <li key={cenario.id} className="px-3 py-4">
                  <div className="flex items-center gap-3">
                    <span className="envelope-tag">
                      {OBJETIVOS[cenario.tipo_objetivo ?? ""] ?? "Geral"}
                    </span>
                    <span className="font-medium">{cenario.titulo}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">{cenario.prompt_seed}</p>
                  <CopyPrompt prompt={`Vamos fazer o cenário "${cenario.titulo}" agora.`} />
                </li>
              ))}
            </ul>
          )}
        </DashboardSection>

        <DashboardSection label="Criar cenário" className="mt-12">
          <form action={criarCenario} className="space-y-4">
            <div>
              <label htmlFor="titulo" className="block text-sm">
                Título
              </label>
              <input
                id="titulo"
                name="titulo"
                required
                maxLength={120}
                className="field-control mt-1 w-full"
              />
            </div>
            <div>
              <label htmlFor="tipo_objetivo" className="block text-sm">
                Objetivo
              </label>
              <select
                id="tipo_objetivo"
                name="tipo_objetivo"
                className="field-control mt-1 w-full"
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
                className="field-control mt-1 w-full"
              />
            </div>
            <button
              type="submit"
              className="button-primary"
            >
              Criar cenário
            </button>
          </form>
        </DashboardSection>
      </main>

    </>
  );
}
