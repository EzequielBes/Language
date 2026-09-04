-- Fase 4: cenarios de tecnica (nao de persona/roleplay) — shadowing e
-- leitura/escuta guiada. tipo_objetivo null porque se aplicam a qualquer
-- objetivo; tags marcam a tecnica pra o plano de estudo (4b) conseguir
-- encontrar esses cenarios.

insert into scenarios (user_id, tipo_objetivo, titulo, prompt_seed, tags, predefinido) values
(null, null, 'Prática de shadowing (pronúncia)',
 'Voce vai conduzir uma pratica de shadowing. Escolha 3-5 frases curtas relacionadas aos pontos fracos do aluno (consulte o perfil e os itens que ele ainda nao domina). Para cada frase: fale/escreva a frase claramente, peca para o aluno repetir imitando entonacao e ritmo (se estiver em modo de voz, ele deve repetir falado), e de feedback especifico sobre pronuncia/ritmo usando a ferramenta de correcao — nao aceite so "ok", aponte o que especificamente melhorar. Termine perguntando se ele quer mais uma rodada com frases novas.',
 '{shadowing,pronuncia}', true),

(null, null, 'Leitura e escuta guiada',
 'Voce vai conduzir uma pratica de compreensao. Gere um texto curto (4-8 frases) no idioma alvo do aluno, no nivel CEFR atual dele mais um degrau acima (i+1) — nao mais que isso, senao fica incompreensivel. O tema deve cruzar com o objetivo do aluno (trabalho, viagem, entrevista ou dia a dia). Depois do texto, faca 2-3 perguntas de compreensao em ordem crescente de dificuldade. Se o aluno errar uma pergunta, nao so corrija — explique a parte do texto que respondia aquilo.',
 '{leitura_guiada,compreensao}', true);
