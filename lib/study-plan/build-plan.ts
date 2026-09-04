import type { Domain } from "@/lib/assessment/adaptive";
import type { Cefr } from "@/lib/cefr";
import { canDoParaObjetivo, type TipoObjetivo } from "@/lib/study-plan/can-do-catalog";

export interface ScenarioDisponivel {
  id: string;
  tags: string[];
}

export interface MilestoneBuilt {
  ordem: number;
  can_do_statement: string;
  dominio_foco: Domain | null;
  nivel_cefr_alvo: Cefr;
  scenario_id: string | null;
  skill_item_tags: string[];
}

const ORDEM_CEFR: Cefr[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function nivelMaisFraco(nivelPorDominio: Partial<Record<Domain, Cefr>>): Cefr {
  const niveis = Object.values(nivelPorDominio).filter((v): v is Cefr => Boolean(v));
  if (niveis.length === 0) return "A1";
  return niveis.reduce((pior, atual) =>
    ORDEM_CEFR.indexOf(atual) < ORDEM_CEFR.indexOf(pior) ? atual : pior,
  );
}

function encontrarCenario(tags: string[], scenarios: ScenarioDisponivel[]): string | null {
  const match = scenarios.find((s) => s.tags.some((t) => tags.includes(t)));
  return match?.id ?? null;
}

/**
 * Monta a sequencia de metas "consigo fazer" a partir do objetivo e do
 * dominio mais fraco do aluno (scaffolding: comeca de onde ele precisa de
 * mais apoio). Cruza cada meta com um cenario existente quando as tags
 * batem — nao duplica conteudo, so aponta pra ele.
 */
export function buildMilestones(params: {
  tipoObjetivo: TipoObjetivo;
  nivelPorDominio: Partial<Record<Domain, Cefr>>;
  scenariosDisponiveis: ScenarioDisponivel[];
}): MilestoneBuilt[] {
  const nivelAlvo = nivelMaisFraco(params.nivelPorDominio);
  const canDos = canDoParaObjetivo(params.tipoObjetivo, nivelAlvo);

  return canDos.map((entry, index) => ({
    ordem: index + 1,
    can_do_statement: entry.statement,
    dominio_foco: entry.dominioFoco,
    nivel_cefr_alvo: nivelAlvo,
    scenario_id: encontrarCenario(entry.tags, params.scenariosDisponiveis),
    skill_item_tags: entry.tags,
  }));
}
