import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dbFail, json, LOCAL_USER_ID } from "@/lib/mcp/shared";
import { recordPracticeResponse } from "@/lib/progress/record-response";
import type { Domain } from "@/lib/assessment/adaptive";

const TIPO_OBJETIVO = z.enum([
  "trabalho",
  "viagem",
  "entrevista",
  "dia_a_dia",
  "custom",
]);

export function registerScenarioTools(server: McpServer) {
  server.registerTool(
    "list_scenarios",
    {
      title: "Listar cenarios de conversa",
      description:
        "Lista cenarios/personas predefinidos e os criados pelo aluno, opcionalmente filtrados por objetivo. Use para sugerir opcoes antes de iniciar uma conversa com persona.",
      inputSchema: z.object({ tipo_objetivo: TIPO_OBJETIVO.optional() }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const campos = "id, titulo, prompt_seed, tipo_objetivo, tags, predefinido";
      const [predefinidos, custom] = await Promise.all([
        (() => {
          let q = db.from("scenarios").select(campos).is("user_id", null);
          if (args.tipo_objetivo) q = q.eq("tipo_objetivo", args.tipo_objetivo);
          return q;
        })(),
        (() => {
          let q = db.from("scenarios").select(campos).eq("user_id", LOCAL_USER_ID);
          if (args.tipo_objetivo) q = q.eq("tipo_objetivo", args.tipo_objetivo);
          return q;
        })(),
      ]);
      if (predefinidos.error) dbFail(predefinidos.error);
      if (custom.error) dbFail(custom.error);

      return json({ cenarios: [...(predefinidos.data ?? []), ...(custom.data ?? [])] });
    },
  );

  server.registerTool(
    "create_custom_scenario",
    {
      title: "Criar cenario personalizado",
      description:
        "Cria um cenario/persona personalizado pelo aluno, para usar em conversas futuras (por texto ou por voz nativa do Claude.ai).",
      inputSchema: z.object({
        titulo: z.string().min(1).max(120),
        prompt_seed: z.string().min(1).max(2000),
        tipo_objetivo: TIPO_OBJETIVO.optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const { data, error } = await db
        .from("scenarios")
        .insert({
          user_id: LOCAL_USER_ID,
          titulo: args.titulo,
          prompt_seed: args.prompt_seed,
          tipo_objetivo: args.tipo_objetivo ?? null,
          tags: args.tags ?? [],
        })
        .select("*")
        .single();
      if (error) dbFail(error);

      return json(data);
    },
  );

  server.registerTool(
    "start_conversation_session",
    {
      title: "Iniciar conversa com persona",
      description:
        "Inicia uma sessao de conversa com um cenario/persona (por texto ou por voz nativa do Claude.ai) e retorna um briefing: siga-o para interpretar a persona. Sem scenario_id, monta um briefing generico de dia a dia a partir do objetivo do aluno.",
      inputSchema: z.object({
        scenario_id: z.string().uuid().optional(),
        canal: z.enum(["texto", "voz"]).optional(),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();

      let briefing: string;
      if (args.scenario_id) {
        const { data: scenario, error } = await db
          .from("scenarios")
          .select("id, prompt_seed, user_id")
          .eq("id", args.scenario_id)
          .single();
        if (error) dbFail(error);
        if (scenario.user_id !== null && scenario.user_id !== LOCAL_USER_ID) {
          throw new Error("Cenario nao encontrado.");
        }
        briefing = scenario.prompt_seed;
      } else {
        const { data: goal } = await db
          .from("goals")
          .select("tipo, descricao_livre")
          .eq("user_id", LOCAL_USER_ID)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle();
        briefing = goal
          ? `Converse casualmente sobre o dia a dia, com foco no objetivo do aluno (${goal.tipo}${
              goal.descricao_livre ? `: ${goal.descricao_livre}` : ""
            }). Faca perguntas abertas e reaja naturalmente ao que ele disser.`
          : "Converse casualmente sobre o dia a dia, com perguntas abertas, reagindo naturalmente ao que o aluno disser.";
      }

      const { data: session, error: sessionError } = await db
        .from("conversation_sessions")
        .insert({
          user_id: LOCAL_USER_ID,
          scenario_id: args.scenario_id ?? null,
          canal: args.canal ?? "texto",
        })
        .select("id")
        .single();
      if (sessionError) dbFail(sessionError);

      return json({ session_id: session.id, briefing });
    },
  );

  server.registerTool(
    "log_practice_item",
    {
      title: "Registrar item praticado na conversa",
      description:
        "Registra que um item de vocabulario/gramatica/expressao foi praticado durante a conversa com persona, atualizando o progresso do aluno.",
      inputSchema: z.object({
        session_id: z.string().uuid(),
        skill_item_id: z.string().uuid(),
        resultado: z.enum(["conhecido", "desconhecido", "parcial"]),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const [
        { data: session, error: sessionError },
        { data: item, error: itemError },
      ] = await Promise.all([
        db
          .from("conversation_sessions")
          .select("id, itens_praticados_ids")
          .eq("id", args.session_id)
          .eq("user_id", LOCAL_USER_ID)
          .single(),
        db.from("skill_items").select("tipo").eq("id", args.skill_item_id).single(),
      ]);
      if (sessionError) dbFail(sessionError);
      if (itemError) dbFail(itemError);

      const { error: updateError } = await db
        .from("conversation_sessions")
        .update({
          itens_praticados_ids: [
            ...(session.itens_praticados_ids ?? []),
            args.skill_item_id,
          ],
        })
        .eq("id", args.session_id);
      if (updateError) dbFail(updateError);

      const resultado = await recordPracticeResponse(db, {
        userId: LOCAL_USER_ID,
        skillItemId: args.skill_item_id,
        domain: item.tipo as Domain,
        resultado: args.resultado,
      });

      return json(resultado);
    },
  );

  server.registerTool(
    "finish_conversation_session",
    {
      title: "Finalizar conversa com persona",
      description:
        "Fecha a sessao de conversa. Estruture o resumo em 3 partes curtas, nessa ordem: pontos fortes, o que precisa de atencao, e um proximo passo concreto — apps de idioma bem avaliados fecham sessao assim, resumo generico demais nao ajuda o aluno.",
      inputSchema: z.object({
        session_id: z.string().uuid(),
        resumo: z.string().max(800).optional(),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const { error } = await db
        .from("conversation_sessions")
        .update({
          finalizado_em: new Date().toISOString(),
          resumo: args.resumo ?? null,
        })
        .eq("id", args.session_id)
        .eq("user_id", LOCAL_USER_ID);
      if (error) dbFail(error);

      return json({ ok: true });
    },
  );
}
