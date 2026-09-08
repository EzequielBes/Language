import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { dbFail, json, getLocalUserId } from "@/lib/mcp/shared";
import { recordPracticeResponse } from "@/lib/progress/record-response";
import type { Domain } from "@/lib/assessment/adaptive";

const TIPO_FEEDBACK = z.enum([
  "correcao_explicita",
  "recast",
  "pedido_esclarecimento",
  "feedback_metalinguistico",
  "elicitacao",
  "repeticao",
]);

const ORIGEM = z.enum(["avaliacao", "cenario", "conversa_livre"]);

export function registerCoachingTools(server: McpServer) {
  server.registerTool(
    "give_correction",
    {
      title: "Dar correção estruturada",
      description:
        "Registra uma correção durante qualquer conversa (avaliação, cenário ou livre), usando a taxonomia de feedback corretivo de Lyster & Ranta (1997): correcao_explicita, recast, pedido_esclarecimento, feedback_metalinguistico, elicitacao ou repeticao. Prefira tipos que levam o aluno a se autocorrigir (elicitacao, feedback_metalinguistico) quando fizer sentido — retêm mais que recast puro. Se o erro mapeia a um item de vocabulário/gramática/expressão, informe skill_item_id e domain pra atualizar o progresso do aluno.",
      inputSchema: z.object({
        origem: ORIGEM,
        origem_session_id: z.string().optional(),
        skill_item_id: z.string().optional(),
        domain: z.enum(["vocabulario", "gramatica", "expressao"]).optional(),
        tipo_feedback: TIPO_FEEDBACK,
        erro_do_aluno: z.string().max(500).optional(),
        correcao: z.string().min(1).max(1000),
        gravidade: z.enum(["leve", "recorrente"]).optional(),
      }),
    },
    async (args) => {
      const db = supabaseAdmin();

      const { data: event, error } = await db
        .from("correction_events")
        .insert({
          user_id: getLocalUserId(),
          skill_item_id: args.skill_item_id ?? null,
          origem: args.origem,
          origem_session_id: args.origem_session_id ?? null,
          tipo_feedback: args.tipo_feedback,
          erro_do_aluno: args.erro_do_aluno ?? null,
          correcao: args.correcao,
        })
        .select("id")
        .single();
      if (error) dbFail(error);

      let sinalRegistrado = false;
      if (args.skill_item_id && args.domain) {
        await recordPracticeResponse(db, {
          userId: getLocalUserId(),
          skillItemId: args.skill_item_id,
          domain: args.domain as Domain,
          resultado: args.gravidade === "recorrente" ? "desconhecido" : "parcial",
        });
        sinalRegistrado = true;
      }

      return json({ correction_event_id: event.id, sinal_registrado: sinalRegistrado });
    },
  );

  server.registerTool(
    "explain_doubt",
    {
      title: "Registrar dúvida esclarecida",
      description:
        "Registra uma dúvida do aluno junto com a explicação já dada, pra histórico. Dúvida não é erro — não altera o progresso do aluno.",
      inputSchema: z.object({
        pergunta: z.string().min(1).max(500),
        explicacao: z.string().min(1).max(1500),
        skill_item_id: z.string().optional(),
        origem: ORIGEM,
      }),
    },
    async (args) => {
      const db = supabaseAdmin();
      const { data, error } = await db
        .from("correction_events")
        .insert({
          user_id: getLocalUserId(),
          skill_item_id: args.skill_item_id ?? null,
          origem: args.origem,
          tipo_feedback: "feedback_metalinguistico",
          erro_do_aluno: args.pergunta,
          correcao: args.explicacao,
        })
        .select("id")
        .single();
      if (error) dbFail(error);
      return json({ correction_event_id: data.id });
    },
  );

  server.registerTool(
    "list_recent_corrections",
    {
      title: "Listar correções recentes",
      description:
        "Lista as correções/dúvidas mais recentes do aluno — use pra não repetir a mesma explicação e pra montar um resumo de pontos recorrentes no início de uma conversa nova.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
    },
    async (args) => {
      const db = supabaseAdmin();
      const { data, error } = await db
        .from("correction_events")
        .select("*")
        .eq("user_id", getLocalUserId())
        .order("criado_em", { ascending: false })
        .limit(args.limit ?? 10);
      if (error) dbFail(error);
      return json({ correcoes: data });
    },
  );
}
