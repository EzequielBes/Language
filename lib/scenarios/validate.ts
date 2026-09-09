import { z } from "zod";

// Mesmos limites do form (maxLength 120/2000) e das tools MCP
// (create_custom_scenario) — HTML maxLength e so client-side e da pra
// contornar postando direto na server action, entao valida de novo aqui.
const CenarioSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  promptSeed: z.string().trim().min(1).max(2000),
});

export type ValidacaoCenario =
  | { ok: true; titulo: string; promptSeed: string }
  | { ok: false; error: string };

export function validateCenarioInput(input: { titulo: string; promptSeed: string }): ValidacaoCenario {
  const resultado = CenarioSchema.safeParse(input);
  if (!resultado.success) {
    return { ok: false, error: resultado.error.issues[0]?.message ?? "Entrada invalida." };
  }
  return { ok: true, titulo: resultado.data.titulo, promptSeed: resultado.data.promptSeed };
}
