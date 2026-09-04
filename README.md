# Correio

Plataforma de estudo de idiomas adaptativa, pessoal e local. Sem API paga da
Claude, sem servidor exposto na internet — o "professor" é a sua própria
sessão do **Claude Desktop** (conta Pro/Max), conectada a um **servidor MCP
que roda na sua máquina**. O sistema só guarda seu perfil, seu objetivo e o
que você já aprendeu; a conversa acontece direto no Claude.

## Como funciona

```
Claude Desktop (sua conta Pro/Max)
        │  stdio (processo local, sem rede)
        ▼
mcp-server/index.ts  →  18 tools (perfil, avaliação, cenários, correção, plano de estudo)
        │
        ▼
Supabase Postgres (service-role key, sem RLS — uso pessoal, um usuário só)
        ▲
        │
Next.js dashboard (npm run dev, só acessado via localhost)
```

O Claude conduz a conversa naturalmente e chama as tools (via MCP) pra
lembrar quem você é, o que já foi coberto e o que ensinar a seguir. O
dashboard web é só bootstrap e visualização — flashcards e atividades viram
telas de verdade lá, porque são mais rápidas de usar do que via chat.

## Funcionalidades

- **Onboarding + avaliação adaptativa de nível** — você diz seu objetivo
  (trabalho, viagem, entrevista, dia a dia ou personalizado) e nível
  autodeclarado; o Claude vai testando vocabulário/gramática/expressão e
  ajusta a dificuldade por domínio conforme você acerta ou erra.
- **Cenários e personas de conversa** — entrevista de emprego, pedir
  informação na rua, check-in de hotel, cafeteria, e mais — por texto ou
  pelo modo de voz nativo do Claude Desktop. Inclui prática de shadowing
  (pronúncia) e leitura/escuta guiada (input um nível acima do seu, i+1).
  Dá pra criar cenários personalizados também.
- **Flashcards** — os itens que você ainda não domina, com virada em 3D,
  histórico personalizado por cartão e repetição espaçada (intervalos
  graduados: 1, 3, 7, 16, 35 dias).
- **Atividades** — exercícios de múltipla escolha gerados a partir dos seus
  pontos fracos. Motor extensível: um tipo de exercício novo é só um
  gerador + uma linha de registro, sem reescrever nada.
- **Professor especialista** — o Claude corrige usando a taxonomia de
  feedback corretivo de Lyster & Ranta (1997): correção explícita, recast,
  pedido de esclarecimento, feedback metalinguístico, elicitação,
  repetição. Fica registrado num diário de erros no dashboard.
- **Plano de estudo** — sequência de metas "consigo fazer" (Can-Do,
  padrão CEFR) geradas a partir do seu objetivo e nível, cruzadas com os
  cenários disponíveis.
- **Priorização por frequência** — itens mais relevantes/frequentes têm
  prioridade na hora de escolher o que praticar.

## Stack

- **[Next.js](https://nextjs.org)** (App Router) — dashboard web, só acessado via `localhost`.
- **[`@modelcontextprotocol/server`](https://modelcontextprotocol.io)** — servidor MCP local via stdio.
- **[Supabase](https://supabase.com)** (Postgres) — banco de dados, acessado via service-role key.
- **[Tailwind CSS v4](https://tailwindcss.com)** + design system próprio ("aerograma/correio aéreo").
- **[Vitest](https://vitest.dev)** — testes da lógica pura (avaliação adaptativa, repetição espaçada, plano de estudo).
- **[tsx](https://github.com/privatenumber/tsx)** — roda o servidor MCP sem build step.

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar um projeto Supabase

Crie um projeto gratuito em [supabase.com](https://supabase.com).

### 3. Aplicar o schema

No **SQL Editor** do painel do Supabase (ou via CLI), rode nesta ordem:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_scenarios.sql
supabase/migrations/0003_activities.sql
supabase/migrations/0004_coaching_plans_and_pacing.sql
supabase/migrations/0005_schema_hardening.sql

supabase/seed/skill_items_en.sql
supabase/seed/scenarios.sql
supabase/seed/scenarios_fase4.sql
supabase/seed/activity_types.sql
```

### 4. Configurar variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os dados do seu
projeto (**Project Settings → API** no painel do Supabase):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # a chave secreta, nunca a publishable/anon
```

### 5. Conectar ao Claude Desktop

Instale o [Claude Desktop](https://claude.ai/download) se ainda não tiver,
depois rode o dashboard:

```bash
npm run dev
```

Abra **http://localhost:3000/connect** — a página gera o bloco JSON certo
(com o caminho absoluto do seu projeto) pra colar em
`%APPDATA%\Claude\claude_desktop_config.json`. Reinicie o Claude Desktop e
comece uma conversa nova.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o dashboard web em `localhost:3000` |
| `npm run build` | Build de produção do dashboard |
| `npm run mcp` | Roda o servidor MCP standalone (útil pra testar tools manualmente) |
| `npm test` | Roda os testes (`vitest`) |
| `npm run lint` | Roda o ESLint |

## Estrutura do projeto

```
mcp-server/index.ts          → entrypoint stdio, carrega .env.local, registra as 18 tools
lib/mcp/
  tools.ts                   → onboarding + avaliação adaptativa (7 tools)
  scenarios.ts                → cenários/personas de conversa (5 tools)
  coaching.ts                 → professor especialista (3 tools)
  study-plan.ts                → planos de estudo (3 tools)
  shared.ts                   → identidade local (LOCAL_USER_ID), helpers
lib/assessment/
  adaptive.ts                  → heurística de nível por domínio (pura, testada)
  spaced-repetition.ts         → intervalos de repetição espaçada (pura, testada)
lib/activities/                → motor de atividades extensível (types/registry/generators)
lib/study-plan/                → catálogo Can-Do, montagem do plano (pura, testada), progresso
lib/progress/record-response.ts → motor único de escrita de progresso
lib/skill-items/rank.ts        → critério único de priorização de item
lib/supabase/server.ts         → cliente Supabase (service-role)
lib/http/same-origin.ts        → mitigação de CSRF local
app/
  page.tsx, connect/           → landing e instruções de conexão
  dashboard/                   → painel, cenários, flashcards, atividades, plano, erros
  api/                         → rotas que mutam progresso (flashcards, atividades)
supabase/
  migrations/                  → schema completo, em ordem
  seed/                        → conteúdo inicial (itens, cenários, tipos de atividade)
```

## Design

Identidade visual própria ("Correio") inspirada em aerogramas/correio
aéreo: tarja diagonal vermelho-e-azul só como moldura, carimbos postais
circulares pra níveis CEFR, etiquetas de envelope no lugar de badges
genéricos. Tipografia: Fraunces (títulos), IBM Plex Sans (corpo), IBM Plex
Mono (rótulos/dados). Ver `app/globals.css` pros tokens e componentes.

## Limitações conhecidas

- Só funciona com o **Claude Desktop** — não com Claude.ai (navegador) nem
  os apps mobile, porque exigiriam voltar a expor um servidor remoto com
  OAuth (ver histórico de decisões no plano do projeto).
- Dataset de conteúdo hoje só cobre **inglês** (~54 itens semeados).
- `skill_items` não tem tradução/definição — algumas atividades testam
  reconhecimento, não significado.
- Repetição espaçada é um degrau simples (Leitner-like), não o algoritmo
  FSRS completo.
