# Conquistas / selos colecionáveis — design

**Data:** 2026-09-09
**Status:** aprovado, pronto para virar plano de implementação
**Parte de:** epic "Motivação e progressão" (selos → sequência de dias → visualização de progressão → XP/níveis, cada um com seu próprio ciclo design → spec → plano → implementação)

## Contexto e objetivo

O app ("Correio") é uma plataforma pessoal de estudo de idiomas, single-user, local. O
pedido original: "colocar algumas coisas a mais pra ter mais motivação para estudos,
espécie de recompensas visuais, poder ver a progressão". Decompôs-se em 4 sub-projetos
independentes; este spec cobre só o primeiro: **conquistas/selos colecionáveis**.

Objetivo: dar reconhecimento visual a marcos de progresso já existentes nos dados
(vocabulário dominado, primeiras ações, esforço/consistência), reaproveitando a
linguagem visual postal que o app já usa (`postmark`, `envelope-tag`), sem introduzir
um sistema de gamificação genérico que destoe do resto do produto.

## Modelo de dados

Segue o mesmo padrão já usado em `activity_types`/`activities` (catálogo em tabela, não
enum, para crescer via `insert` em vez de migração destrutiva — ver comentário em
`supabase/migrations/0003_activities.sql:1-3`):

```sql
create table achievements (
  chave text primary key,        -- 'vocab_10', 'primeira_conversa', ...
  categoria text not null,       -- 'vocabulario' | 'primeira_vez' | 'consistencia'
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
```

`achievements` é semeada via `supabase/seed/achievements.sql` (mesmo padrão de
`activity_types`/`scenarios`). `user_achievements` é escopado por perfil de idioma —
o mesmo `user_id` (`local` / `local:<idioma>`) usado em todo o resto do app, então
cada idioma tem sua própria coleção (consistente com vocabulário/flashcards/plano de
estudo, que já são por perfil).

A tabela `user_achievements` **é** o registro de "já conquistei isso" — não precisa de
lógica separada para saber se é a primeira vez. Toda chamada de desbloqueio é
idempotente (`insert ... on conflict do nothing`), então pode ser chamada de novo sem
efeito colateral.

## Lógica de desbloqueio

Duas famílias de conquista:

### Por limite (contagem)
Vocabulário (10/50/100/250 dominadas) e consistência (X atividades, X conversas).
Uma função `checkThresholds(db, userId, categoria)` recalcula a contagem real (ex:
`count(user_item_status where status='conhecido')`) e tenta desbloquear qualquer selo
da categoria cujo limite já foi atingido. Sempre idempotente — pode rodar em toda
escrita relevante sem custo de "já verifiquei isso antes".

### Por evento (primeira vez / plano completo)
`unlockOnce(db, userId, chave)` chamado direto no ponto exato do código onde aquilo
acontece (ex: dentro de `start_conversation_session`). Não precisa calcular "é a
primeira vez" — o `on conflict do nothing` resolve isso.

Ambas retornam a lista de conquistas **recém-desbloqueadas** (vazia se nada novo), para
o chamador decidir o que fazer com isso (persistir só, ou também celebrar).

## Pontos de chamada

| Onde | O que dispara |
|---|---|
| `lib/progress/record-response.ts` (funil único de flashcard/atividade/conversa/correção) | `checkThresholds(db, userId, 'vocabulario')` |
| `app/api/flashcards/review/route.ts` | `unlockOnce(db, userId, 'primeiro_flashcard')` |
| `app/api/activities/[id]/respond/route.ts` | `checkThresholds(db, userId, 'consistencia')` (atividades) |
| `lib/mcp/scenarios.ts` → `start_conversation_session` | `unlockOnce(db, userId, 'primeira_conversa')` |
| `lib/mcp/scenarios.ts` → `finish_conversation_session` | `checkThresholds(db, userId, 'consistencia')` (conversas) |
| `lib/mcp/tools.ts` → `finish_assessment_session` | `unlockOnce(db, userId, 'primeira_avaliacao')` |
| `lib/mcp/study-plan.ts` → avançar marco | `unlockOnce(db, userId, 'plano_completo')` quando o último marco do plano ativo vira `concluido` |
| `lib/mcp/study-plan.ts` → `generate_study_plan` | `unlockOnce(db, userId, 'primeiro_plano')` |

## Celebração visual

Só existe UI para reagir nas duas rotas de API que o dashboard chama diretamente
(flashcards e atividades) — a resposta JSON ganha um campo `newlyUnlocked:
Achievement[]`, e o componente client (`FlashcardDeck`/`ActivityCard`) mostra um toast
com o selo "carimbando" na hora (CSS puro, sem nova dependência).

Desbloqueios disparados via MCP (conversas, avaliação, plano — tudo dentro do Claude
Desktop) não têm onde mostrar um toast; ficam registrados e aparecem na página de
coleção com uma marca de "novo" (calculada por `desbloqueado_em` recente — ex: últimas
48h —, sem precisar de uma flag "visto" nova).

## Catálogo inicial (13 selos)

| Categoria | Chave | Título | Critério |
|---|---|---|---|
| vocabulario | `vocab_10` | Primeiras palavras | 10 itens dominados |
| vocabulario | `vocab_50` | Vocabulário em construção | 50 itens dominados |
| vocabulario | `vocab_100` | Cem palavras | 100 itens dominados |
| vocabulario | `vocab_250` | Fluência à vista | 250 itens dominados |
| primeira_vez | `primeiro_flashcard` | Primeira revisão | 1º flashcard revisado |
| primeira_vez | `primeira_conversa` | Primeira carta | 1ª conversa iniciada |
| primeira_vez | `primeira_avaliacao` | Autoavaliação | 1ª avaliação concluída |
| primeira_vez | `primeiro_plano` | Traçando a rota | 1º plano de estudo gerado |
| consistencia | `atividades_10` | Mão na massa | 10 atividades respondidas |
| consistencia | `atividades_50` | Disciplina | 50 atividades respondidas |
| consistencia | `conversas_5` | Quebrando o gelo | 5 conversas concluídas |
| consistencia | `conversas_20` | Conversador | 20 conversas concluídas |
| consistencia | `plano_completo` | Missão cumprida | plano de estudo 100% completo |

Adicionar um selo novo no futuro = uma linha no seed + (se for por limite) uma entrada
no mapa de contagem em `lib/achievements/catalog.ts` — sem migração.

## Página `/dashboard/conquistas`

Novo item de menu "Conquistas" no `DashboardHeader`. Página server component, grid
agrupado por categoria (reaproveitando `DashboardSection`, já existente). Cada selo é
um `postmark` (componente já existente) — carimbado com cor `stamp` e ícone se
desbloqueado, contorno cinza se não.

Selos por limite mostram progresso quando bloqueados (ex: "23/50"); selos de
"primeira vez" só mostram cadeado, sem progresso parcial.

## Testes

Seguindo o padrão do projeto (integração real contra Supabase, `describe("dado...")` /
`it("quando... então...")`):

- `unlockOnce` é idempotente — chamar duas vezes só desbloqueia uma vez, a segunda
  chamada retorna "nada novo".
- `checkThresholds` desbloqueia exatamente os selos cujo limite foi atingido e ignora
  os que não foram, incluindo o caso de cruzar dois limites de uma vez (ex: pular de 9
  para 51 itens dominados desbloqueia `vocab_10` e `vocab_50` juntos).
- Isolamento por perfil: conquistas de um perfil de idioma não vazam para outro (mesmo
  padrão de teste já usado em `lib/scenarios/list.test.ts`).
- Rotas de API (`flashcards/review`, `activities/[id]/respond`) retornam
  `newlyUnlocked` corretamente povoado quando um selo é cruzado, vazio quando não.

## Fora de escopo deste spec

- Sequência de dias (streak), visualização de progressão ao longo do tempo, XP/níveis
  — sub-projetos seguintes do mesmo epic, cada um com seu próprio design.
- Celebração dentro da conversa do Claude Desktop (decidido explicitamente que não).
- Motor de critérios genérico/configurável — 13 selos fixos não justificam essa
  abstração; se o catálogo crescer muito, revisitar.
