# Sequência de dias (streak) — design

**Data:** 2026-09-10
**Status:** aprovado, pronto para virar plano de implementação
**Parte de:** epic "Motivação e progressão" (selos [feito] → sequência de dias → visualização de progressão → XP/níveis, cada um com seu próprio ciclo design → spec → plano → implementação)

## Contexto e objetivo

Segundo sub-projeto do epic de motivação. Objetivo: reconhecer visualmente o hábito de praticar todo dia, no estilo streak de apps de idioma, com uma mecânica de tolerância (freeze) pra não punir excessivamente um dia esquecido.

## Modelo de dados

Diferente de conquistas/vocabulário/flashcards (que são por perfil de idioma, via `user_id = "local"` / `"local:<idioma>"`), a sequência é **global** — há vários perfis de idioma mas uma única pessoa real por trás deles, e praticar qualquer idioma no dia mantém a mesma sequência.

Usa o padrão "singleton" (uma linha garantida por constraint, sem lógica de aplicação extra para impedir duplicata):

```sql
create table streak_estado (
  singleton boolean primary key default true,
  constraint streak_estado_singleton_check check (singleton),
  dias_atual integer not null default 0,
  dias_recorde integer not null default 0,
  ultimo_dia_praticado date,
  freezes_disponiveis integer not null default 0
);

insert into streak_estado (singleton) values (true);
```

## Lógica de atualização

Um único ponto de entrada, `atualizarStreak(db)`, chamado de dentro de `lib/progress/record-response.ts` — o mesmo funil único de progresso que já dispara `checkThresholds` para as conquistas de vocabulário (`recordPracticeResponse`, usado por flashcards, atividades, conversas e correções). Isso cobre "qualquer atividade de prática" automaticamente, sem precisar espalhar chamadas em múltiplos pontos como no feature de conquistas.

### Algoritmo

Idempotente por dia — pode ser chamado várias vezes no mesmo dia (o funil é chamado a cada flashcard, cada atividade, etc.) sem efeito duplicado:

```
hoje = data de hoje (YYYY-MM-DD)
se ultimo_dia_praticado == hoje: retorna sem fazer nada (ja contabilizado hoje)

se nunca praticou antes (ultimo_dia_praticado is null):
  dias_atual = 1
senao:
  gap = dias entre hoje e ultimo_dia_praticado
  diasPerdidos = gap - 1

  se diasPerdidos <= 0 (dia seguinte, consecutivo):
    dias_atual += 1
  senao se diasPerdidos <= freezes_disponiveis:
    dias_atual += 1
    freezes_disponiveis -= diasPerdidos   -- consome os freezes usados pra cobrir o buraco
  senao (mais dias perdidos do que freezes cobrem):
    dias_atual = 1
    freezes_disponiveis = 0               -- sequencia quebrou, freezes zeram junto

se dias_atual e multiplo de 7:
  freezes_disponiveis = min(freezes_disponiveis + 1, 2)   -- teto de 2 freezes guardados

dias_recorde = max(dias_recorde, dias_atual)
ultimo_dia_praticado = hoje
```

### Garantia de não-falha

Assim como `unlockOnce`/`checkThresholds` (feature de conquistas), `atualizarStreak` **nunca lança exceção** — qualquer erro é logado e engolido internamente. Uma falha aqui não pode derrubar a ação principal do usuário (revisar um flashcard, iniciar uma conversa, etc.).

## Exibição na UI

Só no Painel (`/dashboard`), como mais uma seção no grid existente (mesmo padrão de "Objetivo"/"Nível avaliado por domínio"/"Itens estudados" — sem página nova, sem item de menu novo):

- Ícone de chama (lucide `Flame`) + número grande de `dias_atual`
- Legenda "dia(s) seguido(s)" (singular/plural)
- Subtítulo pequeno: "recorde: N dias" (usa `dias_recorde`, já disponível no mesmo fetch)
- Chama colorida (`text-stamp`) quando `dias_atual > 0`, tom neutro (`text-ink-soft`) quando 0
- **Sem indicador visual de freeze** — decisão deliberada de manter só o essencial; o freeze funciona nos bastidores

Dado buscado dentro do `Promise.all` já existente em `app/dashboard/page.tsx` (mesmo padrão de paralelização usado no resto do app) — sem query sequencial extra.

## Testes

Seguindo o padrão do projeto (integração real contra Supabase, `describe("dado...")` / `it("quando... então...")`):

- Primeira prática (nunca praticou antes) inicializa `dias_atual = 1`.
- Dia consecutivo incrementa `dias_atual`.
- Mesmo dia chamado de novo não altera nada (idempotência).
- Dia perdido sem freeze disponível zera `dias_atual` e `freezes_disponiveis`.
- Dia perdido coberto por freeze mantém a sequência e consome exatamente os freezes usados.
- Ganho de freeze ao cruzar múltiplo de 7, respeitando o teto de 2.
- `dias_recorde` nunca diminui, mesmo após a sequência quebrar.
- `atualizarStreak` nunca lança exceção mesmo em erro real de banco (mesmo padrão de teste usado no motor de conquistas).

## Fora de escopo deste spec

- Visualização de progressão ao longo do tempo, XP/níveis — sub-projetos seguintes do mesmo epic.
- Qualquer celebração/toast ao atingir marcos de sequência (ex: "7 dias!") — não pedido; poderia virar uma conquista futura no catálogo de selos, mas isso é decisão de um spec futuro, não deste.
- Indicador visual de freezes disponíveis — decisão deliberada de manter a UI mínima.
- Fuso horário / definição precisa de "dia" além do calendário do servidor — app de uso pessoal e local, não há usuários em fusos diferentes a considerar.
