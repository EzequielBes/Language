-- Fase 2: cenarios/personas de conversa + nivel de pratica continuo
-- (usado por cenarios agora, e por flashcards/atividades na Fase 3).

create type conversation_channel as enum ('texto', 'voz');

alter table profiles add column nivel_pratica jsonb not null default '{}'::jsonb;

create table scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles (user_id) on delete cascade, -- null = predefinido/compartilhado
  tipo_objetivo goal_type,
  titulo text not null,
  prompt_seed text not null, -- briefing que o Claude recebe ao iniciar a conversa (texto ou voz nativa do Claude.ai)
  tags text[] not null default '{}',
  predefinido boolean not null default false,
  criado_em timestamptz not null default now()
);

create table conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles (user_id) on delete cascade,
  scenario_id uuid references scenarios (id) on delete set null,
  canal conversation_channel not null default 'texto', -- so metadado; o canal real e o Claude.ai
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  itens_praticados_ids uuid[] not null default '{}',
  resumo text -- nota curta, nao transcript completo (custo/privacidade)
);

create index scenarios_user_id_idx on scenarios (user_id);
create index conversation_sessions_user_id_idx on conversation_sessions (user_id);
