-- Selos colecionaveis: reconhecimento visual de marcos de progresso.
-- achievements e uma TABELA (nao enum), mesmo padrao de activity_types
-- (0003) — um selo novo e so uma linha no seed, sem migracao destrutiva.
-- metrica/limite descrevem selos "por contagem" (ex: vocabulario_dominado
-- >= 10); metrica null = selo "de evento", desbloqueado direto no codigo
-- no momento exato em que acontece (ex: primeira conversa).

create table achievements (
  chave text primary key,
  categoria text not null,       -- 'vocabulario' | 'primeira_vez' | 'consistencia' (agrupamento na UI)
  metrica text,                  -- 'vocabulario_dominado' | 'atividades_respondidas' | 'conversas_concluidas' | null
  limite integer,                -- null para selos de evento
  titulo text not null,
  descricao text not null,
  icone text not null,           -- nome do icone lucide-react
  ordem integer not null default 0
);

create table user_achievements (
  user_id text not null references profiles (user_id) on delete cascade,
  achievement_chave text not null references achievements (chave),
  desbloqueado_em timestamptz not null default now(),
  primary key (user_id, achievement_chave)
);

create index user_achievements_user_id_idx on user_achievements (user_id);
