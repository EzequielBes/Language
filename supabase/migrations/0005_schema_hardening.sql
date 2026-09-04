-- Ajustes apontados pelo ecc:database-reviewer sobre o schema ja aplicado
-- (0001-0004). Todos de baixo risco, verificados contra o dado real antes
-- de aplicar (0 nulos em activities.dominio/nivel_cefr, 0 inconsistencias
-- em scenarios.predefinido vs user_id).

-- 1) Indice redundante: skill_items_prioridade_idx (0004) ja cobre o
-- mesmo prefixo (idioma, tipo, nivel_cefr) usado por pickItem() em
-- lib/mcp/tools.ts, so que com uma coluna a mais (prioridade).
drop index if exists skill_items_idioma_nivel_idx;

-- 2) scenarios.predefinido e user_id (null = predefinido) sao dois sinais
-- pro mesmo conceito, sem nada no schema garantindo que fiquem em sincronia.
alter table scenarios
  add constraint scenarios_predefinido_check check (predefinido = (user_id is null));

-- 3) Nada impedia dois milestones do mesmo plano com a mesma ordem — um bug
-- em buildMilestones() quebraria a ordem do plano silenciosamente.
create unique index study_plan_items_plan_ordem_idx on study_plan_items (study_plan_id, ordem);

-- 4) lib/activities/types.ts ja exige dominio/nivelCefr como obrigatorios
-- (GeneratedActivity) — alinha o banco com o contrato que o TS ja forca.
alter table activities
  alter column dominio set not null,
  alter column nivel_cefr set not null;
