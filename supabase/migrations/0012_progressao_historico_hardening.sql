-- Hardening: garante que os niveis gravados em progressao_historico fiquem
-- dentro da escala valida (1-6 / A1-C2). registrarProgressaoDiaria (que
-- escreve nesta tabela) nunca lanca excecao — sem este CHECK, um bug de
-- mapeamento (off-by-one, dominio errado, zero espurio) persistiria dado
-- invalido e permanente no historico, sem nenhum erro visivel em lugar
-- nenhum.

alter table progressao_historico
  add constraint progressao_historico_nivel_vocabulario_check check (nivel_vocabulario between 1 and 6),
  add constraint progressao_historico_nivel_gramatica_check check (nivel_gramatica between 1 and 6),
  add constraint progressao_historico_nivel_expressao_check check (nivel_expressao between 1 and 6);
