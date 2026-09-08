import type { ActivityGenerator } from "@/lib/activities/types";
import { multipleChoiceGenerator } from "@/lib/activities/generators/multiple-choice";
import { clozeGenerator } from "@/lib/activities/generators/cloze";
import { meaningChoiceGenerator } from "@/lib/activities/generators/meaning-choice";

// Adicionar um tipo de atividade novo: 1 gerador em generators/, 1 linha
// aqui, 1 insert em activity_types — sem migracao destrutiva.
export const GENERATORS: Record<string, ActivityGenerator> = {
  multiple_choice: multipleChoiceGenerator,
  cloze: clozeGenerator,
  meaning_choice: meaningChoiceGenerator,
};
