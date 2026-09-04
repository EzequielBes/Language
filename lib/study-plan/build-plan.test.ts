import { describe, expect, it } from "vitest";
import { buildMilestones } from "./build-plan";

describe("buildMilestones", () => {
  it("usa o dominio mais fraco como nivel alvo", () => {
    const milestones = buildMilestones({
      tipoObjetivo: "trabalho",
      nivelPorDominio: { vocabulario: "B1", gramatica: "A1", expressao: "B2" },
      scenariosDisponiveis: [],
    });
    expect(milestones.every((m) => m.nivel_cefr_alvo === "A1")).toBe(true);
  });

  it("assume A1 quando nao ha nivel nenhum ainda", () => {
    const milestones = buildMilestones({
      tipoObjetivo: "dia_a_dia",
      nivelPorDominio: {},
      scenariosDisponiveis: [],
    });
    expect(milestones[0].nivel_cefr_alvo).toBe("A1");
  });

  it("numera os milestones em ordem crescente a partir de 1", () => {
    const milestones = buildMilestones({
      tipoObjetivo: "viagem",
      nivelPorDominio: { vocabulario: "A2" },
      scenariosDisponiveis: [],
    });
    expect(milestones.map((m) => m.ordem)).toEqual(milestones.map((_, i) => i + 1));
  });

  it("cruza milestone com cenario cuja tag bate", () => {
    const milestones = buildMilestones({
      tipoObjetivo: "trabalho",
      nivelPorDominio: { expressao: "A1" },
      scenariosDisponiveis: [{ id: "cenario-1", tags: ["trabalho"] }],
    });
    expect(milestones.some((m) => m.scenario_id === "cenario-1")).toBe(true);
  });

  it("sem cenario compativel, scenario_id fica nulo", () => {
    const milestones = buildMilestones({
      tipoObjetivo: "trabalho",
      nivelPorDominio: { expressao: "A1" },
      scenariosDisponiveis: [{ id: "cenario-1", tags: ["viagem"] }],
    });
    expect(milestones.every((m) => m.scenario_id === null)).toBe(true);
  });
});
