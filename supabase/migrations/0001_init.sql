-- Fase 1: onboarding adaptativo + avaliacao de nivel.
-- Uso local/pessoal: sem multi-tenant, sem RLS. O servidor MCP roda local
-- (stdio, iniciado pelo Claude Desktop) e o dashboard so e acessado via
-- localhost — ambos usam a service-role key do Supabase diretamente.

create type cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
create type goal_type as enum ('trabalho', 'viagem', 'entrevista', 'dia_a_dia', 'custom');
create type skill_domain as enum ('vocabulario', 'gramatica', 'expressao');
create type item_status as enum ('desconhecido', 'aprendendo', 'conhecido');
create type onboarding_status as enum ('novo', 'objetivo_definido', 'avaliando', 'avaliado');
create type assessment_status as enum ('em_andamento', 'concluida', 'abandonada');

create table profiles (
  user_id text primary key,
  nome text,
  idioma_nativo text,
  idioma_alvo text,
  nivel_autodeclarado cefr_level,
  nivel_estimado jsonb not null default '{}'::jsonb,
  onboarding_status onboarding_status not null default 'novo',
  criado_em timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles (user_id) on delete cascade,
  tipo goal_type not null,
  descricao_livre text,
  criado_em timestamptz not null default now()
);

create table skill_items (
  id uuid primary key default gen_random_uuid(),
  idioma text not null,
  tipo skill_domain not null,
  texto text not null,
  nivel_cefr cefr_level not null,
  tags text[] not null default '{}'
);

create table user_item_status (
  user_id text not null references profiles (user_id) on delete cascade,
  skill_item_id uuid not null references skill_items (id) on delete cascade,
  status item_status not null default 'desconhecido',
  ultima_revisao timestamptz not null default now(),
  streak integer not null default 0,
  primary key (user_id, skill_item_id)
);

create table assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles (user_id) on delete cascade,
  goal_id uuid references goals (id) on delete set null,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  estado_adaptativo jsonb not null default '{}'::jsonb,
  nivel_resultante_estimado jsonb,
  status assessment_status not null default 'em_andamento',
  itens_respondidos integer not null default 0,
  itens_ids_respondidos uuid[] not null default '{}'
);

create index goals_user_id_idx on goals (user_id);
create index skill_items_idioma_nivel_idx on skill_items (idioma, tipo, nivel_cefr);
create index assessment_sessions_user_id_idx on assessment_sessions (user_id);
