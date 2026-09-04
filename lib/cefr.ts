export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Cefr = (typeof CEFR_LEVELS)[number];

export function cefrToNumber(level: Cefr): number {
  return CEFR_LEVELS.indexOf(level) + 1;
}

export function numberToCefr(n: number): Cefr {
  const idx = Math.min(CEFR_LEVELS.length, Math.max(1, Math.round(n))) - 1;
  return CEFR_LEVELS[idx];
}
