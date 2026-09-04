-- Dataset inicial de itens (ingles), Fase 1. ~54 itens: 3 dominios x 6 niveis CEFR x 3 itens.
-- 'texto' e o que a ferramenta MCP devolve para o Claude testar o aluno na conversa
-- (ex.: perguntar se ele conhece/usa aquele item). Tags cruzam com goal_type quando aplicavel.

insert into skill_items (idioma, tipo, texto, nivel_cefr, tags) values
-- A1
('en', 'vocabulario', 'hello / goodbye', 'A1', '{dia_a_dia}'),
('en', 'vocabulario', 'my name is...', 'A1', '{dia_a_dia}'),
('en', 'vocabulario', 'numbers 1-20', 'A1', '{dia_a_dia,viagem}'),
('en', 'gramatica', 'verb "to be" (am/is/are)', 'A1', '{dia_a_dia}'),
('en', 'gramatica', 'plural nouns (-s)', 'A1', '{dia_a_dia}'),
('en', 'gramatica', 'simple present affirmative', 'A1', '{dia_a_dia}'),
('en', 'expressao', 'how are you? / I''m fine, thanks', 'A1', '{dia_a_dia}'),
('en', 'expressao', 'nice to meet you', 'A1', '{dia_a_dia,entrevista}'),
('en', 'expressao', 'excuse me / sorry', 'A1', '{dia_a_dia,viagem}'),

-- A2
('en', 'vocabulario', 'directions (turn left/right, straight ahead)', 'A2', '{viagem}'),
('en', 'vocabulario', 'family members', 'A2', '{dia_a_dia}'),
('en', 'vocabulario', 'daily routine verbs (wake up, commute, have lunch)', 'A2', '{dia_a_dia}'),
('en', 'gramatica', 'simple past (regular and common irregular verbs)', 'A2', '{dia_a_dia}'),
('en', 'gramatica', 'there is / there are', 'A2', '{viagem}'),
('en', 'gramatica', 'comparatives and superlatives', 'A2', '{dia_a_dia}'),
('en', 'expressao', 'can you help me, please?', 'A2', '{viagem}'),
('en', 'expressao', 'how much does it cost?', 'A2', '{viagem}'),
('en', 'expressao', 'I would like to...', 'A2', '{viagem,dia_a_dia}'),

-- B1
('en', 'vocabulario', 'job titles and departments', 'B1', '{trabalho,entrevista}'),
('en', 'vocabulario', 'booking a hotel / flight vocabulary', 'B1', '{viagem}'),
('en', 'vocabulario', 'small talk topics (weather, weekend, hobbies)', 'B1', '{dia_a_dia}'),
('en', 'gramatica', 'present perfect vs simple past', 'B1', '{dia_a_dia,trabalho}'),
('en', 'gramatica', 'first conditional', 'B1', '{trabalho}'),
('en', 'gramatica', 'modal verbs of obligation (must/have to/should)', 'B1', '{trabalho}'),
('en', 'expressao', 'could you repeat that, please?', 'B1', '{trabalho,viagem}'),
('en', 'expressao', 'tell me about yourself', 'B1', '{entrevista}'),
('en', 'expressao', 'what do you do for a living?', 'B1', '{dia_a_dia,entrevista}'),

-- B2
('en', 'vocabulario', 'phrasal verbs at work (follow up, catch up, hand in)', 'B2', '{trabalho}'),
('en', 'vocabulario', 'describing strengths and weaknesses', 'B2', '{entrevista}'),
('en', 'vocabulario', 'travel disruptions (delay, cancellation, layover)', 'B2', '{viagem}'),
('en', 'gramatica', 'second conditional', 'B2', '{dia_a_dia}'),
('en', 'gramatica', 'passive voice', 'B2', '{trabalho}'),
('en', 'gramatica', 'reported speech', 'B2', '{trabalho,dia_a_dia}'),
('en', 'expressao', 'why should we hire you?', 'B2', '{entrevista}'),
('en', 'expressao', 'I see what you mean, but...', 'B2', '{trabalho}'),
('en', 'expressao', 'let''s circle back to that later', 'B2', '{trabalho}'),

-- C1
('en', 'vocabulario', 'business idioms (touch base, ballpark figure, low-hanging fruit)', 'C1', '{trabalho}'),
('en', 'vocabulario', 'nuanced adjectives (meticulous, ambivalent, resilient)', 'C1', '{dia_a_dia,entrevista}'),
('en', 'vocabulario', 'negotiation vocabulary (leverage, concession, counteroffer)', 'C1', '{trabalho}'),
('en', 'gramatica', 'mixed conditionals', 'C1', '{dia_a_dia}'),
('en', 'gramatica', 'inversion for emphasis (Not only did..., Rarely have I...)', 'C1', '{trabalho}'),
('en', 'gramatica', 'cleft sentences (What I meant was...)', 'C1', '{trabalho}'),
('en', 'expressao', 'walk me through a challenge you overcame', 'C1', '{entrevista}'),
('en', 'expressao', 'to be honest, I think we should reconsider...', 'C1', '{trabalho}'),
('en', 'expressao', 'that''s a fair point, though I''d push back on...', 'C1', '{trabalho}'),

-- C2
('en', 'vocabulario', 'subtle register shifts (formal vs colloquial synonyms)', 'C2', '{trabalho,entrevista}'),
('en', 'vocabulario', 'idiomatic travel storytelling vocabulary', 'C2', '{viagem}'),
('en', 'vocabulario', 'precise emotional/attitude vocabulary (disillusioned, indignant, wistful)', 'C2', '{dia_a_dia}'),
('en', 'gramatica', 'subjunctive mood in formal register', 'C2', '{trabalho}'),
('en', 'gramatica', 'complex hedging structures (were it not for, had it not been)', 'C2', '{trabalho}'),
('en', 'gramatica', 'discourse markers for nuanced argumentation', 'C2', '{trabalho}'),
('en', 'expressao', 'reframing a disagreement diplomatically in a negotiation', 'C2', '{trabalho}'),
('en', 'expressao', 'narrating a complex personal story fluently in an interview', 'C2', '{entrevista}'),
('en', 'expressao', 'giving nuanced, culturally-aware small talk with strangers while traveling', 'C2', '{viagem}');
