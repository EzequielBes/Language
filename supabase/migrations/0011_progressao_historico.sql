-- supabase/migrations/0011_progressao_historico.sql
-- Snapshot diario do nivel estimado (1-6 / A1-C2) por dominio e por perfil
-- de idioma, para desenhar um grafico de progressao ao longo do tempo no
-- painel. Diferente da sequencia (streak, 0010, que e global), o nivel e
-- por perfil — mesmo padrao de FK de user_achievements/user_item_status
-- (0009): varios perfis de idioma podem ter niveis diferentes.
-- Upsert por (user_id, data): chamadas repetidas no mesmo dia sobrescrevem
-- a linha do dia com o nivel mais recente (comportamento correto aqui,
-- diferente da idempotencia "so a primeira conta" do streak).

create table progressao_historico (
  user_id text not null references profiles (user_id) on delete cascade,
  data date not null,
  nivel_vocabulario integer not null,
  nivel_gramatica integer not null,
  nivel_expressao integer not null,
  primary key (user_id, data)
);

create index progressao_historico_user_id_idx on progressao_historico (user_id);
