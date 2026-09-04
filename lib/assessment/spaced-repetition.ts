import type { ItemStatus } from "@/lib/assessment/adaptive";

// Degrau simples de repeticao espacada (Leitner/Duolingo-style), nao FSRS
// completo: intervalos fixos por streak, sem modelo estatistico por usuario.
// Entrega a maior parte do ganho de "distributed practice" (Dunlosky et al.
// 2013) sem a complexidade de ajustar um modelo por aluno — upgrade natural
// pra FSRS se o degrau fixo nao bastar.
export const INTERVALOS_DIAS = [1, 3, 7, 16, 35] as const;

export interface ProximaRevisao {
  streak: number;
  proximaRevisaoEm: Date;
}

export function calcularProximaRevisao(
  streakAtual: number,
  resultado: ItemStatus,
  agora: Date = new Date(),
): ProximaRevisao {
  const tetoIndice = INTERVALOS_DIAS.length - 1;
  let novoStreak: number;
  if (resultado === "conhecido") {
    novoStreak = Math.min(streakAtual + 1, tetoIndice);
  } else if (resultado === "parcial") {
    novoStreak = Math.max(streakAtual - 1, 0);
  } else {
    novoStreak = 0;
  }

  const dias = INTERVALOS_DIAS[novoStreak];
  const proximaRevisaoEm = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
  return { streak: novoStreak, proximaRevisaoEm };
}
