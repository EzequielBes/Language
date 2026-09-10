# Visualização de progressão ao longo do tempo — design

**Data:** 2026-09-10
**Status:** aprovado, pronto para virar plano de implementação
**Parte de:** epic "Motivação e progressão" (selos [feito] → sequência de dias [feito] → visualização de progressão → XP/níveis, cada um com seu próprio ciclo design → spec → plano → implementação)

## Contexto e objetivo

Terceiro sub-projeto do epic de motivação. Objetivo: mostrar a evolução do nível estimado do aluno em cada domínio (vocabulário, gramática, expressão) ao longo do tempo, num gráfico de linhas — hoje só existe o nível *atual* (`profiles.nivel_pratica`), sem nenhum histórico guardado.

## Modelo de dados

Diferente da sequência (streak, que é global — uma pessoa só por trás de vários perfis de idioma), o nível é **por perfil de idioma**, mesmo padrão de `user_achievements`/`user_item_status`:

```sql
create table progressao_historico (
  user_id text not null references profiles (user_id) on delete cascade,
  data date not null,
  nivel_vocabulario integer not null,
  nivel_gramatica integer not null,
  nivel_expressao integer not null,
  primary key (user_id, data)
);

create index progressao_historico_user_id_idx on progressao_historico (user_id);
```

Uma linha por dia por perfil: um snapshot do nível (`profiles.nivel_pratica[dominio].nivel`, escala 1–6 equivalente a A1–C2) no fim daquele dia. Sem limite de retenção — a tabela cresce um registro por dia por perfil, volume irrelevante para um app de uso pessoal.

## Lógica de atualização

Mais simples que o streak: não há diffing de datas nem estado anterior a considerar — é um **upsert puro** com o estado que `recordPracticeResponse` já acabou de calcular:

```
registrarProgressaoDiaria(db, userId, estado):
  tentar:
    upsert progressao_historico
      (user_id, data=hoje,
       nivel_vocabulario=estado.vocabulario.nivel,
       nivel_gramatica=estado.gramatica.nivel,
       nivel_expressao=estado.expressao.nivel)
      on conflict (user_id, data) do update
  se erro: logar e engolir (nunca lança)
```

Chamada de dentro do funil único de progresso (`recordPracticeResponse`), em paralelo com `checkThresholds` (conquistas) e `atualizarStreak` (sequência) — nenhuma das três depende do resultado das outras. Recebe `novoEstado` já calculado na função, sem reler o banco.

Idempotência por dia é automática via `on conflict do update`: chamadas repetidas no mesmo dia (comum, já que o funil roda a cada flashcard/atividade/conversa) apenas sobrescrevem a linha do dia com o nível mais recente — comportamento correto, não é um bug a evitar (diferente do streak, aqui queremos sempre o último valor do dia, não "ignorar se já rodou hoje").

### Garantia de não-falha

Mesma garantia de `unlockOnce`/`checkThresholds` e `atualizarStreak`: `registrarProgressaoDiaria` **nunca lança exceção** — qualquer erro é logado e engolido internamente. Uma falha aqui não pode derrubar a ação principal do usuário.

## Exibição na UI

Nova seção "Progressão" no grid existente do `/dashboard` (mesmo padrão de "Sequência"/"Objetivo" — sem página nova, sem item de menu novo):

- Gráfico de linhas em SVG feito à mão, sem dependência nova (nenhuma lib de gráficos instalada no projeto; 3 linhas simples não justificam uma) — componente puro `app/dashboard/_components/progress-chart.tsx`, sem interatividade/JS de cliente
- 3 `<polyline>`, uma por domínio: vocabulário em `--color-airmail`, gramática em `--color-correction`, expressão em `--color-stamp` (cores já usadas na paleta do app)
- Eixo Y fixo de 1 a 6 (rotulado A1–C2), eixo X com as datas de todo o histórico disponível (decisão: sem corte de janela, mostra tudo que existir)
- Legenda pequena (bolinha colorida + rótulo do domínio), mesmo padrão visual da seção "Nível avaliado por domínio"
- **Estado vazio**: menos de 2 pontos de histórico (não dá pra traçar uma linha) → mensagem "Ainda sem histórico suficiente" no lugar do gráfico

Dado buscado dentro do `Promise.all` já existente em `app/dashboard/page.tsx` (mesmo padrão de paralelização usado no resto do app): `progressao_historico` filtrado por `user_id`, ordenado por `data` ascendente, sem `limit`.

## Testes

Seguindo o padrão do projeto (integração real contra Supabase, `describe("dado...")` / `it("quando... então...")`):

- Dado que ainda não há registro hoje para o perfil, quando `registrarProgressaoDiaria` é chamado, então insere uma linha nova com os níveis do estado passado.
- Dado que já existe um registro hoje para o perfil, quando é chamado de novo com níveis diferentes, então atualiza os valores da linha existente (não duplica — upsert por `(user_id, data)`).
- Dado um erro real de banco (ex: `user_id` inexistente violando a FK), quando `registrarProgressaoDiaria` é chamado, então não lança exceção.

O componente de gráfico (`progress-chart.tsx`) não ganha teste automatizado — nenhum componente `.tsx` do projeto tem teste hoje; a verificação é manual no navegador (mesmo padrão do Step 8 do plano do streak), cobrindo: gráfico com histórico (≥2 dias), estado vazio (<2 dias) e nenhum erro no console.

## Fora de escopo deste spec

- Frequência de prática (heatmap de dias ativos) e itens de vocabulário dominados acumulados ao longo do tempo — outras dimensões de "progressão" possíveis, não pedidas nesta rodada; podem virar sub-projetos futuros do mesmo epic.
- Zoom, filtro de período ou tooltip interativo no gráfico — SVG estático simples, sem interatividade.
- Nova página dedicada (`/dashboard/progressao`) — decisão deliberada de reaproveitar o `/dashboard` existente, como o streak.
- XP / níveis — próximo (e último) sub-projeto do mesmo epic (#25).
