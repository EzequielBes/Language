import type { ItemStatus } from "@/lib/assessment/adaptive";

// SM-2-lite: fator de facilidade por item (SuperMemo SM-2, sem o modelo
// estatistico completo do FSRS). Cada item guarda um fator de facilidade
// (comeca em 2.5, piso 1.3) que sobe quando o aluno acerta de primeira e
// desce quando erra ou acerta com dificuldade — os intervalos passam a
// refletir o quao dificil aquele item especifico e pro aluno, em vez de uma
// escada fixa igual pra todo mundo.
export const FATOR_FACILIDADE_INICIAL = 2.5;
export const FATOR_FACILIDADE_MINIMO = 1.3;

// Mantido so pra desenhar os pontinhos de progresso do flashcard (5 marcos
// visuais) — nao participa mais do calculo do intervalo.
export const INTERVALOS_DIAS = [1, 3, 7, 16, 35] as const;

export interface EstadoRepeticao {
  streak: number;
  fatorFacilidade: number;
  intervaloDias: number;
}

export interface ProximaRevisao extends EstadoRepeticao {
  proximaRevisaoEm: Date;
}

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * 24 * 60 * 60 * 1000);
}

export function calcularProximaRevisao(
  estadoAtual: EstadoRepeticao,
  resultado: ItemStatus,
  agora: Date = new Date(),
): ProximaRevisao {
  const fatorAtual = estadoAtual.fatorFacilidade || FATOR_FACILIDADE_INICIAL;

  if (resultado === "desconhecido") {
    const fatorFacilidade = Math.max(FATOR_FACILIDADE_MINIMO, fatorAtual - 0.2);
    return { streak: 0, fatorFacilidade, intervaloDias: 1, proximaRevisaoEm: somarDias(agora, 1) };
  }

  const streak = estadoAtual.streak + 1;
  const intervaloDias =
    streak === 1 ? 1 : streak === 2 ? 6 : Math.round(estadoAtual.intervaloDias * fatorAtual);

  const delta = resultado === "conhecido" ? 0.1 : -0.14;
  const fatorFacilidade = Math.max(FATOR_FACILIDADE_MINIMO, fatorAtual + delta);

  return { streak, fatorFacilidade, intervaloDias, proximaRevisaoEm: somarDias(agora, intervaloDias) };
}
