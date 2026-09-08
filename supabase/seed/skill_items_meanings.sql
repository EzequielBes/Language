-- Definicoes em PT-BR pro dataset 'en' existente (Fase B) — habilita o
-- quiz de significado (meaning_choice) e o hint no verso do flashcard.
-- Match por (idioma, texto): todo texto do dataset 'en' e unico.

update skill_items set definicao = 'Cumprimentos básicos de chegada e despedida.' where idioma = 'en' and texto = 'hello / goodbye';
update skill_items set definicao = 'Frase pra se apresentar dizendo seu nome.' where idioma = 'en' and texto = 'my name is...';
update skill_items set definicao = 'Números de 1 a 20.' where idioma = 'en' and texto = 'numbers 1-20';
update skill_items set definicao = 'Verbo "ser/estar" no presente: am, is, are.' where idioma = 'en' and texto = 'verb "to be" (am/is/are)';
update skill_items set definicao = 'Formação do plural de substantivos com -s.' where idioma = 'en' and texto = 'plural nouns (-s)';
update skill_items set definicao = 'Presente simples afirmativo.' where idioma = 'en' and texto = 'simple present affirmative';
update skill_items set definicao = 'Pergunta comum sobre o estado da pessoa e resposta padrão.' where idioma = 'en' and texto = 'how are you? / I''m fine, thanks';
update skill_items set definicao = 'Expressão usada ao conhecer alguém pela primeira vez.' where idioma = 'en' and texto = 'nice to meet you';
update skill_items set definicao = 'Formas de pedir licença ou se desculpar.' where idioma = 'en' and texto = 'excuse me / sorry';

update skill_items set definicao = 'Vocabulário pra dar ou pedir direções.' where idioma = 'en' and texto = 'directions (turn left/right, straight ahead)';
update skill_items set definicao = 'Nomes dos membros da família.' where idioma = 'en' and texto = 'family members';
update skill_items set definicao = 'Verbos de rotina diária.' where idioma = 'en' and texto = 'daily routine verbs (wake up, commute, have lunch)';
update skill_items set definicao = 'Passado simples, verbos regulares e irregulares comuns.' where idioma = 'en' and texto = 'simple past (regular and common irregular verbs)';
update skill_items set definicao = 'Estrutura pra dizer que algo existe (singular/plural).' where idioma = 'en' and texto = 'there is / there are';
update skill_items set definicao = 'Comparativo e superlativo de adjetivos.' where idioma = 'en' and texto = 'comparatives and superlatives';
update skill_items set definicao = 'Pedido de ajuda educado.' where idioma = 'en' and texto = 'can you help me, please?';
update skill_items set definicao = 'Pergunta sobre o preço de algo.' where idioma = 'en' and texto = 'how much does it cost?';
update skill_items set definicao = 'Forma educada de expressar um desejo ou pedido.' where idioma = 'en' and texto = 'I would like to...';

update skill_items set definicao = 'Cargos e departamentos de uma empresa.' where idioma = 'en' and texto = 'job titles and departments';
update skill_items set definicao = 'Vocabulário pra reservar hotel ou voo.' where idioma = 'en' and texto = 'booking a hotel / flight vocabulary';
update skill_items set definicao = 'Assuntos de conversa informal (clima, fim de semana, hobbies).' where idioma = 'en' and texto = 'small talk topics (weather, weekend, hobbies)';
update skill_items set definicao = 'Diferença entre presente perfeito e passado simples.' where idioma = 'en' and texto = 'present perfect vs simple past';
update skill_items set definicao = 'Primeira condicional (if + presente, will + verbo).' where idioma = 'en' and texto = 'first conditional';
update skill_items set definicao = 'Verbos modais de obrigação: must, have to, should.' where idioma = 'en' and texto = 'modal verbs of obligation (must/have to/should)';
update skill_items set definicao = 'Pedido educado pra repetirem algo.' where idioma = 'en' and texto = 'could you repeat that, please?';
update skill_items set definicao = 'Pedido comum em entrevistas pra falar sobre você.' where idioma = 'en' and texto = 'tell me about yourself';
update skill_items set definicao = 'Pergunta sobre a profissão da pessoa.' where idioma = 'en' and texto = 'what do you do for a living?';

update skill_items set definicao = 'Phrasal verbs usados no ambiente de trabalho.' where idioma = 'en' and texto = 'phrasal verbs at work (follow up, catch up, hand in)';
update skill_items set definicao = 'Vocabulário pra descrever pontos fortes e fracos.' where idioma = 'en' and texto = 'describing strengths and weaknesses';
update skill_items set definicao = 'Vocabulário de imprevistos em viagens.' where idioma = 'en' and texto = 'travel disruptions (delay, cancellation, layover)';
update skill_items set definicao = 'Segunda condicional (situação hipotética no presente/futuro).' where idioma = 'en' and texto = 'second conditional';
update skill_items set definicao = 'Voz passiva.' where idioma = 'en' and texto = 'passive voice';
update skill_items set definicao = 'Discurso indireto (relatar o que alguém disse).' where idioma = 'en' and texto = 'reported speech';
update skill_items set definicao = 'Pergunta clássica de entrevista sobre por que contratar você.' where idioma = 'en' and texto = 'why should we hire you?';
update skill_items set definicao = 'Forma de concordar parcialmente antes de discordar.' where idioma = 'en' and texto = 'I see what you mean, but...';
update skill_items set definicao = 'Sugestão de voltar a um assunto depois.' where idioma = 'en' and texto = 'let''s circle back to that later';

update skill_items set definicao = 'Expressões idiomáticas comuns no mundo corporativo.' where idioma = 'en' and texto = 'business idioms (touch base, ballpark figure, low-hanging fruit)';
update skill_items set definicao = 'Adjetivos com nuances de significado mais sofisticadas.' where idioma = 'en' and texto = 'nuanced adjectives (meticulous, ambivalent, resilient)';
update skill_items set definicao = 'Vocabulário de negociação.' where idioma = 'en' and texto = 'negotiation vocabulary (leverage, concession, counteroffer)';
update skill_items set definicao = 'Condicionais mistas (misturando tempos hipotéticos).' where idioma = 'en' and texto = 'mixed conditionals';
update skill_items set definicao = 'Inversão de sujeito/verbo pra dar ênfase.' where idioma = 'en' and texto = 'inversion for emphasis (Not only did..., Rarely have I...)';
update skill_items set definicao = 'Frases clivadas, usadas pra enfatizar parte da frase.' where idioma = 'en' and texto = 'cleft sentences (What I meant was...)';
update skill_items set definicao = 'Pedido pra descrever em detalhes um desafio superado.' where idioma = 'en' and texto = 'walk me through a challenge you overcame';
update skill_items set definicao = 'Forma de introduzir uma opinião franca.' where idioma = 'en' and texto = 'to be honest, I think we should reconsider...';
update skill_items set definicao = 'Forma de reconhecer um argumento antes de contestá-lo.' where idioma = 'en' and texto = 'that''s a fair point, though I''d push back on...';

update skill_items set definicao = 'Diferenças sutis entre registro formal e coloquial.' where idioma = 'en' and texto = 'subtle register shifts (formal vs colloquial synonyms)';
update skill_items set definicao = 'Vocabulário idiomático pra contar histórias de viagem.' where idioma = 'en' and texto = 'idiomatic travel storytelling vocabulary';
update skill_items set definicao = 'Vocabulário preciso pra descrever emoções e atitudes.' where idioma = 'en' and texto = 'precise emotional/attitude vocabulary (disillusioned, indignant, wistful)';
update skill_items set definicao = 'Modo subjuntivo em registro formal.' where idioma = 'en' and texto = 'subjunctive mood in formal register';
update skill_items set definicao = 'Estruturas complexas de ressalva/hipótese.' where idioma = 'en' and texto = 'complex hedging structures (were it not for, had it not been)';
update skill_items set definicao = 'Marcadores discursivos pra argumentação sofisticada.' where idioma = 'en' and texto = 'discourse markers for nuanced argumentation';
update skill_items set definicao = 'Reformular um desacordo de forma diplomática numa negociação.' where idioma = 'en' and texto = 'reframing a disagreement diplomatically in a negotiation';
update skill_items set definicao = 'Narrar uma história pessoal complexa com fluência numa entrevista.' where idioma = 'en' and texto = 'narrating a complex personal story fluently in an interview';
update skill_items set definicao = 'Fazer small talk culturalmente sensível com desconhecidos viajando.' where idioma = 'en' and texto = 'giving nuanced, culturally-aware small talk with strangers while traveling';
