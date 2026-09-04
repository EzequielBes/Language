-- Fase 4: professor especialista (feedback estruturado), planos de estudo
-- (Can-Do milestones) e priorizacao/repeticao espacada. Tudo aditivo.

-- 1) Priorizacao por frequencia/relevancia (mecanismo; sem repovoar os itens existentes)
alter table skill_items add column prioridade smallint not null default 0;
create index skill_items_prioridade_idx on skill_items (idioma, tipo, nivel_cefr, prioridade desc);

-- 2) Repeticao espacada leve (degrau simples, base pro FSRS depois)
alter table user_item_status add column proxima_revisao_em timestamptz;
create index user_item_status_revisao_idx on user_item_status (user_id, proxima_revisao_em);

-- 3) Professor especialista — taxonomia fixa de Lyster & Ranta (1997)
create type feedback_type as enum (
  'correcao_explicita', 'recast', 'pedido_esclarecimento',
  'feedback_metalinguistico', 'elicitacao', 'repeticao'
);

create table correction_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles (user_id) on delete cascade,
  skill_item_id uuid references skill_items (id) on delete set null, -- null = duvida geral, sem item associado
  origem text not null, -- 'avaliacao' | 'cenario' | 'conversa_livre' (metadado; sem FK, a origem varia de tabela)
  origem_session_id uuid,
  tipo_feedback feedback_type not null,
  erro_do_aluno text,
  correcao text not null,
  criado_em timestamptz not null default now()
);
create index correction_events_user_id_idx on correction_events (user_id, criado_em desc);
create index correction_events_skill_item_idx on correction_events (skill_item_id) where skill_item_id is not null;

-- 4) Plano de estudo — Can-Do milestones
create type study_plan_status as enum ('ativo', 'concluido', 'abandonado');
create type milestone_status as enum ('pendente', 'em_andamento', 'concluido');

create table study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles (user_id) on delete cascade,
  goal_id uuid references goals (id) on delete set null,
  status study_plan_status not null default 'ativo',
  criado_em timestamptz not null default now()
);
-- so 1 plano ativo por vez (uso pessoal, sem necessidade de multiplos planos simultaneos)
create unique index study_plans_user_ativo_idx on study_plans (user_id) where status = 'ativo';

create table study_plan_items (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references study_plans (id) on delete cascade,
  ordem integer not null,
  can_do_statement text not null,
  dominio_foco skill_domain, -- null = mistura dominios
  nivel_cefr_alvo cefr_level not null,
  scenario_id uuid references scenarios (id) on delete set null,
  skill_item_tags text[] not null default '{}',
  status milestone_status not null default 'pendente',
  concluido_em timestamptz
);
create index study_plan_items_plan_idx on study_plan_items (study_plan_id, ordem);
