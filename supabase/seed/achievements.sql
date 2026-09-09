insert into achievements (chave, categoria, metrica, limite, titulo, descricao, icone, ordem) values
  ('vocab_10', 'vocabulario', 'vocabulario_dominado', 10, 'Primeiras palavras', '10 itens dominados.', 'Sparkles', 1),
  ('vocab_50', 'vocabulario', 'vocabulario_dominado', 50, 'Vocabulário em construção', '50 itens dominados.', 'BookOpen', 2),
  ('vocab_100', 'vocabulario', 'vocabulario_dominado', 100, 'Cem palavras', '100 itens dominados.', 'Award', 3),
  ('vocab_250', 'vocabulario', 'vocabulario_dominado', 250, 'Fluência à vista', '250 itens dominados.', 'Trophy', 4),
  ('primeiro_flashcard', 'primeira_vez', null, null, 'Primeira revisão', 'Revisou o primeiro flashcard.', 'CheckCircle2', 1),
  ('primeira_conversa', 'primeira_vez', null, null, 'Primeira carta', 'Iniciou a primeira conversa com uma persona.', 'MessageCircle', 2),
  ('primeira_avaliacao', 'primeira_vez', null, null, 'Autoavaliação', 'Concluiu a primeira avaliação de nível.', 'ClipboardCheck', 3),
  ('primeiro_plano', 'primeira_vez', null, null, 'Traçando a rota', 'Gerou o primeiro plano de estudo.', 'Map', 4),
  ('atividades_10', 'consistencia', 'atividades_respondidas', 10, 'Mão na massa', '10 atividades respondidas.', 'Hammer', 1),
  ('atividades_50', 'consistencia', 'atividades_respondidas', 50, 'Disciplina', '50 atividades respondidas.', 'Zap', 2),
  ('conversas_5', 'consistencia', 'conversas_concluidas', 5, 'Quebrando o gelo', '5 conversas concluídas.', 'Users', 3),
  ('conversas_20', 'consistencia', 'conversas_concluidas', 20, 'Conversador', '20 conversas concluídas.', 'Flag', 4),
  ('plano_completo', 'consistencia', null, null, 'Missão cumprida', 'Completou todas as metas de um plano de estudo.', 'PartyPopper', 5);
