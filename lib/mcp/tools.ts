import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CEFR_LEVELS, cefrToNumber, numberToCefr, type Cefr } from "@/lib/cefr";
import { dbFail, json, getLocalUserId } from "@/lib/mcp/shared";
import {
  applyResponse,
  proximoDominio,
  seedState,
  sessaoCompleta,
  type Domain,
  type ItemStatus,
} from "@/lib/assessment/adaptive";
import {
  calcularProximaRevisao,
  FATOR_FACILIDADE_INICIAL,
} from "@/lib/assessment/spaced-repetition";
import { orderSkillItemsByPriority } from "@/lib/skill-items/rank";
import { unlockOnce } from "@/lib/achievements/unlock";

async function pickItem(
  db: ReturnType<typeof supabaseAdmin>,
  opts: { idioma: string; tipo: Domain; nivel: Cefr; excluir: string[] },
) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // zod so valida "e uma string" nesses campos agora (um client MCP real
  // testado nao mandava o argumento quando o schema usava
  // z.string().uuid() — formato+pattern juntos no json-schema gerado
  // confundia o preenchimento de argumentos dele), entao o formato de uuid
  // nunca chega validado aqui — filtra porque esta funcao interpola os ids
  // direto na string do filtro .not().
  const excluir = opts.excluir.filter((id) => UUID_RE.test(id));

  const query = (comNivel: boolean) => {
    let q = db
      .from("skill_items")
      .select("id, texto")
      .eq("idioma", opts.idioma)
      .eq("tipo", opts.tipo);
    if (comNivel) q = q.eq("nivel_cefr", opts.nivel);
    if (excluir.length > 0) {
      q = q.not("id", "in", `(${excluir.join(",")})`);
    }
    return orderSkillItemsByPriority(q).limit(1).maybeSingle();
  };

  const { data: exato } = await query(true);
  if (exato) return exato;

  // Sem mais itens nesse nivel exato: relaxa o filtro de nivel dentro do mesmo dominio/idioma.
  const { data: qualquer } = await query(false);
  return qualquer ?? null;
}

async function resolveAssessmentSessionId(
  db: ReturnType<typeof supabaseAdmin>,
  sessionId?: string,
) {
  if (sessionId) return sessionId;

  const { data: session, error } = await db
    .from("assessment_sessions")
    .select("id")
    .eq("user_id", getLocalUserId())
    .eq("status", "em_andamento")
    .order("iniciado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) dbFail(error);
  if (!session) {
    throw new Error("Inicie uma sessao de avaliacao antes de continuar.");
  }

  return session.id;
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_or_create_profile",
    {
      title: "Obter ou criar perfil",
      description:
        "Retorna o perfil de estudo do aluno (objetivo, nivel, status do onboarding), criando um perfil vazio se for o primeiro contato. Chame isso no inicio de toda conversa.",
      inputSchema: z.object({}),
    },
    async () => {
      const db = supabaseAdmin();

      const { data: existing } = await db
        .from("profiles")
        .select("*")
        .eq("user_id", getLocalUserId())
        .maybeSingle();
      if (existing) return json(existing);

      const { data: created, error } = await db
        .from("profiles")
        .insert({ user_id: getLocalUserId() })
        .select("*")
        .single();
      if (error) dbFail(error);
      return json(created);
    },
  );

  server.registerTool(
    "set_learning_goal",
    {
      title: "Definir objetivo de aprendizado",
      description:
        "Registra idioma alvo/nativo, o objetivo do aluno (trabalho, viagem, entrevista, dia a dia ou custom) e o nivel CEFR autodeclarado. Fecha a primeira etapa do onboarding.",
      inputSchema: z.object({
        idioma_alvo: z.string().describe("Codigo do idioma alvo, ex: en"),
        idioma_nativo: z.string(),
        tipo_objetivo: z.enum([
          "trabalho",
          "viagem",
          "entrevista",
          "dia_a_dia",
          "custom",
        ]),
        descricao_livre: z.string().optional(),
        nivel_autodeclarado: z.enum(CEFR_LEVELS),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const { data: profile, error: profileError } = await db
        .from("profiles")
        .upsert({
          user_id: getLocalUserId(),
          idioma_alvo: args.idioma_alvo,
          idioma_nativo: args.idioma_nativo,
          nivel_autodeclarado: args.nivel_autodeclarado,
          onboarding_status: "objetivo_definido",
        })
        .select("*")
        .single();
      if (profileError) dbFail(profileError);

      const { data: goal, error: goalError } = await db
        .from("goals")
        .insert({
          user_id: getLocalUserId(),
          tipo: args.tipo_objetivo,
          descricao_livre: args.descricao_livre,
        })
        .select("*")
        .single();
      if (goalError) dbFail(goalError);

      return json({ profile, goal });
    },
  );

  server.registerTool(
    "start_assessment_session",
    {
      title: "Iniciar sessao de avaliacao",
      description:
        "Inicia uma sessao de avaliacao adaptativa de nivel, semeada a partir do nivel autodeclarado do aluno.",
      inputSchema: z.object({ goal_id: z.string().optional() }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const { data: profile, error: profileError } = await db
        .from("profiles")
        .select("nivel_autodeclarado")
        .eq("user_id", getLocalUserId())
        .single();
      if (profileError) dbFail(profileError);
      if (!profile.nivel_autodeclarado) {
        throw new Error(
          "Defina o objetivo/nivel com set_learning_goal antes de avaliar.",
        );
      }

      const estado = seedState(cefrToNumber(profile.nivel_autodeclarado as Cefr));

      const { data: session, error } = await db
        .from("assessment_sessions")
        .insert({
          user_id: getLocalUserId(),
          goal_id: args.goal_id ?? null,
          estado_adaptativo: estado,
        })
        .select("id")
        .single();
      if (error) dbFail(error);

      await db
        .from("profiles")
        .update({ onboarding_status: "avaliando" })
        .eq("user_id", getLocalUserId());

      return json({ session_id: session.id });
    },
  );

  server.registerTool(
    "get_next_assessment_item",
    {
      title: "Proximo item da avaliacao",
      description:
        "Retorna o proximo item (vocabulario, gramatica ou expressao) a testar na sessao de avaliacao mais recente em andamento, escolhido adaptativamente. Informe session_id somente para selecionar outra sessao. Retorna done:true quando a sessao terminou.",
      inputSchema: z.object({ session_id: z.string().optional() }),
    },
    async (args) => {
      const db = supabaseAdmin();
      const sessionId = await resolveAssessmentSessionId(db, args.session_id);

      const { data: session, error } = await db
        .from("assessment_sessions")
        .select("*, profiles!inner(idioma_alvo)")
        .eq("id", sessionId)
        .eq("user_id", getLocalUserId())
        .single();
      if (error) dbFail(error);

      const estado = session.estado_adaptativo as ReturnType<typeof seedState>;
      if (sessaoCompleta(estado, session.itens_respondidos)) {
        return json({ done: true, resultado: estado });
      }

      const domain = proximoDominio(estado);
      const nivel = numberToCefr(estado[domain].nivel);
      const idioma =
        (session as unknown as { profiles: { idioma_alvo: string | null } })
          .profiles.idioma_alvo ?? "en";
      const jaRespondidos: string[] = session.itens_ids_respondidos ?? [];

      const item = await pickItem(db, {
        idioma,
        tipo: domain,
        nivel,
        excluir: jaRespondidos,
      });
      if (!item) {
        return json({
          done: true,
          resultado: estado,
          aviso: "sem mais itens disponiveis para este nivel/dominio",
        });
      }

      return json({
        done: false,
        skill_item_id: item.id,
        dominio: domain,
        nivel_testado: nivel,
        texto: item.texto,
      });
    },
  );

  server.registerTool(
    "record_item_response",
    {
      title: "Registrar resposta do aluno",
      description:
        "Registra se o aluno demonstrou conhecer, nao conhecer ou conhecer parcialmente um item na avaliacao mais recente em andamento, atualizando o nivel estimado do dominio. Informe session_id somente para selecionar outra sessao.",
      inputSchema: z.object({
        session_id: z.string().optional(),
        skill_item_id: z.string(),
        status: z.enum(["conhecido", "desconhecido", "parcial"]),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();
      const sessionId = await resolveAssessmentSessionId(db, args.session_id);

      const [
        { data: session, error: sessionError },
        { data: item, error: itemError },
        { data: itemAtual },
      ] = await Promise.all([
        db
          .from("assessment_sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("user_id", getLocalUserId())
          .single(),
        db.from("skill_items").select("tipo").eq("id", args.skill_item_id).single(),
        db
          .from("user_item_status")
          .select("streak, fator_facilidade, intervalo_dias")
          .eq("user_id", getLocalUserId())
          .eq("skill_item_id", args.skill_item_id)
          .maybeSingle(),
      ]);
      if (sessionError) dbFail(sessionError);
      if (itemError) dbFail(itemError);

      const domain = item.tipo as Domain;
      const estadoAtual = session.estado_adaptativo as ReturnType<typeof seedState>;
      const novoEstado = applyResponse(estadoAtual, domain, args.status as ItemStatus);

      const itemStatus =
        args.status === "conhecido"
          ? "conhecido"
          : args.status === "parcial"
            ? "aprendendo"
            : "desconhecido";
      const { streak, fatorFacilidade, intervaloDias, proximaRevisaoEm } = calcularProximaRevisao(
        {
          streak: itemAtual?.streak ?? 0,
          fatorFacilidade: itemAtual?.fator_facilidade ?? FATOR_FACILIDADE_INICIAL,
          intervaloDias: itemAtual?.intervalo_dias ?? 0,
        },
        args.status as ItemStatus,
      );

      // Escritas independentes (nenhuma le o resultado da outra) — paralelas.
      const [{ error: updateError }] = await Promise.all([
        db
          .from("assessment_sessions")
          .update({
            estado_adaptativo: novoEstado,
            itens_respondidos: session.itens_respondidos + 1,
            itens_ids_respondidos: [
              ...(session.itens_ids_respondidos ?? []),
              args.skill_item_id,
            ],
          })
          .eq("id", sessionId),
        db.from("user_item_status").upsert({
          user_id: getLocalUserId(),
          skill_item_id: args.skill_item_id,
          status: itemStatus,
          ultima_revisao: new Date().toISOString(),
          streak,
          fator_facilidade: fatorFacilidade,
          intervalo_dias: intervaloDias,
          proxima_revisao_em: proximaRevisaoEm.toISOString(),
        }),
      ]);
      if (updateError) dbFail(updateError);

      return json({
        dominio: domain,
        nivel_atualizado: numberToCefr(novoEstado[domain].nivel),
        proximo_dominio_sugerido: proximoDominio(novoEstado),
      });
    },
  );

  server.registerTool(
    "finish_assessment_session",
    {
      title: "Finalizar sessao de avaliacao",
      description:
        "Fecha a sessao de avaliacao mais recente em andamento e grava o nivel estimado final por dominio no perfil do aluno. Informe session_id somente para selecionar outra sessao.",
      inputSchema: z.object({ session_id: z.string().optional() }),
    },
    async (args) => {
      const db = supabaseAdmin();
      const sessionId = await resolveAssessmentSessionId(db, args.session_id);

      const { data: session, error } = await db
        .from("assessment_sessions")
        .select("estado_adaptativo")
        .eq("id", sessionId)
        .eq("user_id", getLocalUserId())
        .single();
      if (error) dbFail(error);

      const estado = session.estado_adaptativo as ReturnType<typeof seedState>;
      const nivelEstimado = Object.fromEntries(
        (Object.keys(estado) as Domain[]).map((d) => [d, numberToCefr(estado[d].nivel)]),
      );

      // Escritas independentes (nenhuma le o resultado da outra) — paralelas.
      await Promise.all([
        db
          .from("assessment_sessions")
          .update({
            status: "concluida",
            finalizado_em: new Date().toISOString(),
            nivel_resultante_estimado: nivelEstimado,
          })
          .eq("id", sessionId),
        db
          .from("profiles")
          .update({ nivel_estimado: nivelEstimado, onboarding_status: "avaliado" })
          .eq("user_id", getLocalUserId()),
      ]);

      await unlockOnce(db, getLocalUserId(), "primeira_avaliacao");

      return json({ nivel_estimado: nivelEstimado });
    },
  );

  server.registerTool(
    "get_profile_summary",
    {
      title: "Resumo do perfil",
      description:
        "Visao consolidada do aluno: objetivo atual, nivel autodeclarado/estimado por dominio, contagem de itens conhecidos/aprendendo/desconhecidos, ultima avaliacao e itens com revisao espacada vencida. Use para retomar o contexto em qualquer conversa nova — se houver revisoes_vencidas, avise o aluno e ofereça revisar antes de seguir pra algo novo.",
      inputSchema: z.object({}),
    },
    async () => {
      const db = supabaseAdmin();

      const [
        { data: profile },
        { data: goal },
        { data: itemStatuses },
        { data: lastSession },
        { data: vencidos },
      ] = await Promise.all([
        db.from("profiles").select("*").eq("user_id", getLocalUserId()).maybeSingle(),
        db
          .from("goals")
          .select("*")
          .eq("user_id", getLocalUserId())
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle(),
        db.from("user_item_status").select("status").eq("user_id", getLocalUserId()),
        db
          .from("assessment_sessions")
          .select("*")
          .eq("user_id", getLocalUserId())
          .order("iniciado_em", { ascending: false })
          .limit(1)
          .maybeSingle(),
        db
          .from("user_item_status")
          .select("skill_item_id, skill_items(texto, tipo)")
          .eq("user_id", getLocalUserId())
          .lte("proxima_revisao_em", new Date().toISOString())
          .order("proxima_revisao_em", { ascending: true }),
      ]);

      const contagem = { conhecido: 0, aprendendo: 0, desconhecido: 0 };
      for (const row of itemStatuses ?? []) {
        contagem[row.status as keyof typeof contagem] += 1;
      }

      const listaVencidos = (vencidos ?? []) as unknown as {
        skill_items: { texto: string; tipo: Domain } | null;
      }[];

      return json({
        profile,
        objetivo_atual: goal,
        contagem_itens: contagem,
        ultima_sessao: lastSession,
        revisoes_vencidas: {
          total: listaVencidos.length,
          amostra: listaVencidos
            .slice(0, 5)
            .filter((v) => v.skill_items)
            .map((v) => ({ texto: v.skill_items!.texto, dominio: v.skill_items!.tipo })),
        },
      });
    },
  );
}
