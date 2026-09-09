-- Achados da revisao de seguranca (ecc:security-reviewer + ecc:database-reviewer):

-- 1) user_item_status tem PK composta (user_id, skill_item_id), mas nada
-- indexa skill_item_id sozinho — a FK pra skill_items (on delete cascade)
-- faz seq scan em toda cascade delete. Verificado: 0 violacoes nos dados
-- atuais, indice so acelera, nao muda comportamento.
create index user_item_status_skill_item_idx on user_item_status (skill_item_id);

-- 2) titulo/prompt_seed eram limitados so por maxLength no HTML (client-side,
-- contornavel postando direto na server action). Mesmos limites ja usados
-- pelo form (120/2000) e pela tool MCP create_custom_scenario
-- (lib/mcp/scenarios.ts). Verificado: 0 violacoes nos 8 cenarios existentes.
alter table scenarios
  add constraint scenarios_titulo_len_check check (char_length(titulo) between 1 and 120),
  add constraint scenarios_prompt_seed_len_check check (char_length(prompt_seed) between 1 and 2000);
