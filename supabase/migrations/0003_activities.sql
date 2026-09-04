-- Fase 3b: motor de atividades extensivel. activity_types e uma TABELA (nao
-- enum) de proposito: um tipo de exercicio novo (ex: ditado, pronuncia) no
-- futuro e so 1 gerador + 1 linha aqui, sem migracao destrutiva.

create type activity_status as enum ('pendente', 'concluida', 'descartada');

create table activity_types (
  chave text primary key, -- ex: 'multiple_choice', futuramente 'fill_blank', 'ditado'...
  titulo text not null,
  gerador text not null, -- chave que mapeia para lib/activities/registry.ts
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles (user_id) on delete cascade,
  tipo text not null references activity_types (chave),
  dominio skill_domain,
  nivel_cefr cefr_level,
  payload jsonb not null, -- shape definido pelo gerador de cada tipo; validado em app, nao no banco
  fonte_skill_item_ids uuid[] not null default '{}',
  status activity_status not null default 'pendente',
  criado_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table activity_responses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  user_id text not null references profiles (user_id) on delete cascade,
  resposta jsonb not null,
  correta boolean,
  criado_em timestamptz not null default now()
);

create index activities_user_id_status_idx on activities (user_id, status);
create index activity_responses_activity_id_idx on activity_responses (activity_id);
