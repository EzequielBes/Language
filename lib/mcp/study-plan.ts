import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dbFail, json, getLocalUserId } from "@/lib/mcp/shared";
import { buildMilestones, type ScenarioDisponivel } from "@/lib/study-plan/build-plan";
import type { TipoObjetivo } from "@/lib/study-plan/can-do-catalog";
import { progressoDoMilestone } from "@/lib/study-plan/progress";
import type { Domain } from "@/lib/assessment/adaptive";
import { numberToCefr, type Cefr } from "@/lib/cefr";
import { unlockOnce } from "@/lib/achievements/unlock";

interface StudyPlanItemRow {
  id: string;
  ordem: number;
  can_do_statement: string;
  dominio_foco: Domain | null;
  nivel_cefr_alvo: Cefr;
  scenario_id: string | null;
  skill_item_tags: string[];
  status: "pendente" | "em_andamento" | "concluido";
}

export function registerStudyPlanTools(server: McpServer) {
  server.registerTool(
    "generate_study_plan",
    {
      title: "Gerar plano de estudo",
      description:
        "Gera um plano de estudo personalizado (sequencia de metas 'consigo fazer') a partir do objetivo e nivel atual do aluno. Chame apos onboarding/avaliacao. Substitui o plano ativo anterior, se houver.",
      inputSchema: z.object({ goal_id: z.string().optional() }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const goalQuery = args.goal_id
        ? db.from("goals").select("id, tipo").eq("id", args.goal_id).single()
        : db
            .from("goals")
            .select("id, tipo")
            .eq("user_id", getLocalUserId())
            .order("criado_em", { ascending: false })
            .limit(1)
            .single();

      const [
        { data: profile, error: profileError },
        { data: goal, error: goalError },
        { data: scenarios, error: scenariosError },
      ] = await Promise.all([
        db.from("profiles").select("nivel_estimado, nivel_pratica").eq("user_id", getLocalUserId()).single(),
        goalQuery,
        db.from("scenarios").select("id, tags"),
      ]);
      if (profileError) dbFail(profileError);
      if (goalError) dbFail(goalError);
      if (scenariosError) dbFail(scenariosError);

      // nivel_pratica guarda o AdaptiveState cru (nivel numerico por
      // dominio), diferente de nivel_estimado que ja e Record<Domain, Cefr>
      // (convertido em finish_assessment_session). Precisa de numberToCefr
      // aqui, senao o valor bruto vaza pra uma coluna enum cefr_level.
      const nivelPratica = (profile.nivel_pratica ?? {}) as Partial<
        Record<Domain, { nivel: number }>
      >;
      const nivelEstimado = (profile.nivel_estimado ?? {}) as Partial<Record<Domain, Cefr>>;
      const DOMINIOS: Domain[] = ["vocabulario", "gramatica", "expressao"];
      const nivelPorDominio: Partial<Record<Domain, Cefr>> = {};
      for (const dominio of DOMINIOS) {
        const daPratica = nivelPratica[dominio];
        nivelPorDominio[dominio] =
          nivelEstimado[dominio] ?? (daPratica ? numberToCefr(daPratica.nivel) : undefined);
      }

      const milestones = buildMilestones({
        tipoObjetivo: goal.tipo as TipoObjetivo,
        nivelPorDominio,
        scenariosDisponiveis: (scenarios ?? []) as ScenarioDisponivel[],
      });

      // indice unico so permite 1 plano ativo — abandona o anterior primeiro.
      await db
        .from("study_plans")
        .update({ status: "abandonado" })
        .eq("user_id", getLocalUserId())
        .eq("status", "ativo");

      const { data: plan, error: planError } = await db
        .from("study_plans")
        .insert({ user_id: getLocalUserId(), goal_id: goal.id, status: "ativo" })
        .select("id")
        .single();
      if (planError) dbFail(planError);

      const { error: itemsError } = await db.from("study_plan_items").insert(
        milestones.map((m) => ({
          study_plan_id: plan.id,
          ordem: m.ordem,
          can_do_statement: m.can_do_statement,
          dominio_foco: m.dominio_foco,
          nivel_cefr_alvo: m.nivel_cefr_alvo,
          scenario_id: m.scenario_id,
          skill_item_tags: m.skill_item_tags,
        })),
      );
      if (itemsError) dbFail(itemsError);

      await unlockOnce(db, getLocalUserId(), "primeiro_plano");

      return json({ plan_id: plan.id, milestones });
    },
  );

  server.registerTool(
    "get_current_study_plan",
    {
      title: "Ver plano de estudo atual",
      description:
        "Retorna o plano de estudo ativo do aluno, com o progresso de cada meta calculado a partir dos itens que ele ja domina. Chame no inicio de uma sessao pra saber o que sugerir a seguir.",
      inputSchema: z.object({}),
    },
    async () => {
      const db = supabaseAdmin();

      const { data: plan, error: planError } = await db
        .from("study_plans")
        .select("id, criado_em, study_plan_items(*)")
        .eq("user_id", getLocalUserId())
        .eq("status", "ativo")
        .maybeSingle();
      if (planError) dbFail(planError);
      if (!plan) return json({ plan: null });

      const items = (
        (plan as unknown as { study_plan_items: StudyPlanItemRow[] }).study_plan_items ?? []
      ).sort((a, b) => a.ordem - b.ordem);

      const milestones = await Promise.all(
        items.map(async (item) => ({
          ...item,
          progresso: await progressoDoMilestone(db, item.skill_item_tags),
        })),
      );

      return json({ plan: { id: plan.id, criado_em: plan.criado_em }, milestones });
    },
  );

  server.registerTool(
    "advance_study_plan_milestone",
    {
      title: "Avançar meta do plano",
      description: "Marca uma meta (milestone) do plano de estudo ativo como concluida.",
      inputSchema: z.object({ study_plan_item_id: z.string() }),
    },
    async (args) => {
      const db = supabaseAdmin();
      const { data: item, error } = await db
        .from("study_plan_items")
        .update({ status: "concluido", concluido_em: new Date().toISOString() })
        .eq("id", args.study_plan_item_id)
        .select("study_plan_id")
        .single();
      if (error) dbFail(error);

      const { count: pendentes } = await db
        .from("study_plan_items")
        .select("id", { count: "exact", head: true })
        .eq("study_plan_id", item.study_plan_id)
        .neq("status", "concluido");

      if ((pendentes ?? 0) === 0) {
        await unlockOnce(db, getLocalUserId(), "plano_completo");
      }

      return json({ ok: true });
    },
  );
}
