-- SM-2-lite: cada item passa a guardar seu proprio fator de facilidade e o
-- intervalo (em dias) da ultima revisao agendada, em vez de depender so do
-- streak pra olhar numa escada fixa (ver lib/assessment/spaced-repetition.ts).
alter table user_item_status
  add column fator_facilidade real not null default 2.5,
  add column intervalo_dias integer not null default 0;
