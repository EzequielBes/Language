import type { Domain } from "@/lib/assessment/adaptive";
import type { Cefr } from "@/lib/cefr";

export type TipoObjetivo = "trabalho" | "viagem" | "entrevista" | "dia_a_dia" | "custom";

export interface CanDoEntry {
  statement: string;
  dominioFoco: Domain | null;
  tags: string[]; // cruza com scenarios.tags e skill_items.tags
}

type Faixa = "A1-A2" | "B1-B2" | "C1-C2";

function faixaDe(nivel: Cefr): Faixa {
  if (nivel === "A1" || nivel === "A2") return "A1-A2";
  if (nivel === "B1" || nivel === "B2") return "B1-B2";
  return "C1-C2";
}

// Catalogo estatico (dado de configuracao, muda raramente — mesmo espirito
// do briefing generico ja hardcoded em start_conversation_session):
// tipo_objetivo x faixa CEFR -> metas "consigo fazer", em ordem.
const CATALOGO: Record<TipoObjetivo, Record<Faixa, CanDoEntry[]>> = {
  trabalho: {
    "A1-A2": [
      { statement: "Consegue se apresentar e falar sobre seu cargo", dominioFoco: "vocabulario", tags: ["trabalho"] },
      { statement: "Consegue participar de small talk simples com colegas", dominioFoco: "expressao", tags: ["trabalho", "dia_a_dia"] },
    ],
    "B1-B2": [
      { statement: "Consegue participar de uma reunião e dar uma opinião simples", dominioFoco: "expressao", tags: ["trabalho"] },
      { statement: "Consegue escrever um e-mail profissional básico", dominioFoco: "gramatica", tags: ["trabalho"] },
      { statement: "Consegue discordar educadamente numa discussão de trabalho", dominioFoco: "expressao", tags: ["trabalho"] },
    ],
    "C1-C2": [
      { statement: "Consegue negociar e defender uma posição em inglês de negócios", dominioFoco: "expressao", tags: ["trabalho"] },
      { statement: "Consegue usar linguagem nuançada em contextos formais de trabalho", dominioFoco: "vocabulario", tags: ["trabalho"] },
    ],
  },
  viagem: {
    "A1-A2": [
      { statement: "Consegue pedir informações e entender direções na rua", dominioFoco: "expressao", tags: ["viagem"] },
      { statement: "Consegue fazer check-in em um hotel", dominioFoco: "vocabulario", tags: ["viagem"] },
    ],
    "B1-B2": [
      { statement: "Consegue resolver um imprevisto de viagem", dominioFoco: "vocabulario", tags: ["viagem"] },
      { statement: "Consegue pedir comida e fazer pequenas conversas com locais", dominioFoco: "expressao", tags: ["viagem", "dia_a_dia"] },
    ],
    "C1-C2": [
      { statement: "Consegue contar uma história de viagem de forma fluente e nuançada", dominioFoco: "expressao", tags: ["viagem"] },
    ],
  },
  entrevista: {
    "A1-A2": [
      { statement: "Consegue se apresentar numa entrevista de forma simples", dominioFoco: "expressao", tags: ["entrevista"] },
    ],
    "B1-B2": [
      { statement: "Consegue contar sua trajetória profissional numa entrevista", dominioFoco: "expressao", tags: ["entrevista"] },
      { statement: "Consegue descrever pontos fortes e fracos", dominioFoco: "vocabulario", tags: ["entrevista"] },
    ],
    "C1-C2": [
      { statement: "Consegue responder perguntas difíceis de entrevista com nuance e confiança", dominioFoco: "expressao", tags: ["entrevista"] },
    ],
  },
  dia_a_dia: {
    "A1-A2": [
      { statement: "Consegue se apresentar e falar sobre a família", dominioFoco: "vocabulario", tags: ["dia_a_dia"] },
      { statement: "Consegue descrever sua rotina diária", dominioFoco: "gramatica", tags: ["dia_a_dia"] },
    ],
    "B1-B2": [
      { statement: "Consegue manter uma conversa casual sobre hobbies e fim de semana", dominioFoco: "expressao", tags: ["dia_a_dia"] },
    ],
    "C1-C2": [
      { statement: "Consegue conversar naturalmente sobre qualquer assunto do dia a dia", dominioFoco: "expressao", tags: ["dia_a_dia"] },
    ],
  },
  custom: {
    "A1-A2": [
      { statement: "Consegue se apresentar e cobrir o básico do seu objetivo pessoal", dominioFoco: "vocabulario", tags: ["dia_a_dia"] },
    ],
    "B1-B2": [
      { statement: "Consegue manter uma conversa funcional sobre o seu objetivo pessoal", dominioFoco: "expressao", tags: ["dia_a_dia"] },
    ],
    "C1-C2": [
      { statement: "Consegue se comunicar com fluência sobre o seu objetivo pessoal", dominioFoco: "expressao", tags: ["dia_a_dia"] },
    ],
  },
};

export function canDoParaObjetivo(tipoObjetivo: TipoObjetivo, nivel: Cefr): CanDoEntry[] {
  return CATALOGO[tipoObjetivo][faixaDe(nivel)];
}
