-- supabase/migrations/0010_streak.sql
-- Sequencia de dias (streak) global: pratica em qualquer perfil de idioma
-- mantem a mesma sequencia (diferente de conquistas/vocabulario, que sao
-- por perfil) — o app tem varios perfis de idioma mas uma pessoa so.
-- Singleton via boolean PK com check: garante 1 linha so, sem precisar
-- de logica de aplicacao pra impedir duplicata (mesmo padrao usado em
-- achievements/user_achievements, 0009).

create table streak_estado (
  singleton boolean primary key default true,
  constraint streak_estado_singleton_check check (singleton),
  dias_atual integer not null default 0,
  dias_recorde integer not null default 0,
  ultimo_dia_praticado date,
  freezes_disponiveis integer not null default 0
);

insert into streak_estado (singleton) values (true);
