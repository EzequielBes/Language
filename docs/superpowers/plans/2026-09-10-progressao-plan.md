# Visualização de progressão ao longo do tempo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar a evolução do nível estimado do aluno em cada domínio (vocabulário, gramática, expressão) ao longo do tempo, num gráfico de linhas no Painel.

**Architecture:** Um snapshot diário do nível (`profiles.nivel_pratica[dominio].nivel`) é gravado por perfil de idioma numa tabela nova (`progressao_historico`, upsert por `(user_id, data)`), chamado de dentro do funil único de progresso (`recordPracticeResponse`). O Painel busca todo o histórico do perfil e desenha um gráfico de 3 linhas em SVG feito à mão (sem dependência nova).

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres via `@supabase/supabase-js`), Vitest (integração real contra Supabase, sem mocks de banco), SVG nativo (sem lib de gráficos).

**Spec:** `docs/superpowers/specs/2026-09-10-progressao-design.md`

## Global Constraints

- Testes seguem o padrão do projeto (já é BDD na prática): `describe("dado...")` / `it("quando... então...")`, integração real contra o Supabase do projeto (`ueboouuljzozirnvwqpq`), sem mocks de banco. Watch-fail (RED) antes de cada implementação.
- `registrarProgressaoDiaria` nunca lança exceção — erros são logados e engolidos. Mesma garantia já usada em `unlockOnce`/`checkThresholds` (conquistas) e `atualizarStreak` (sequência).
- O nível é **por perfil de idioma** (`user_id`) — diferente da sequência, que é global. Segue o padrão de FK de `user_achievements`/`user_item_status`: `user_id text not null references profiles (user_id) on delete cascade`.
- Migration aplicada diretamente no projeto Supabase real (`ueboouuljzozirnvwqpq`) via `mcp__claude_ai_Supabase__apply_migration` — não basta deixar o `.sql` no repo.
- Sem página nova, sem item de menu novo, sem dependência de gráfico nova — só uma seção a mais no `/dashboard` existente.
- Ao executar cada task, usar os agentes/skills `ecc:*` que se encaixem na fase (ex.: `ecc:typescript-reviewer`/`ecc:react-review` para revisar o código escrito, `ecc:code-review` como revisão final antes do commit da última task) — preferência explícita do usuário por rotear pelo harness ECC em vez de ferramentas genéricas quando existe equivalente.

---

## File Structure

**Novos arquivos:**
- `lib/date.ts` — `hojeISO()` compartilhado (extraído de `lib/streak/update.ts`)
- `supabase/migrations/0011_progressao_historico.sql` — schema
- `lib/progressao/historico.ts` — `registrarProgressaoDiaria(db, userId, estado)`
- `lib/progressao/historico.test.ts`
- `app/dashboard/_components/progress-chart.tsx` — `ProgressChart`

**Modificados:**
- `lib/streak/update.ts` — usa `hojeISO` de `lib/date.ts` em vez de definição local
- `lib/progress/record-response.ts` — chama `registrarProgressaoDiaria(db, userId, novoEstado)` em paralelo com `checkThresholds`/`atualizarStreak`
- `app/dashboard/page.tsx` — busca `progressao_historico` no `Promise.all` existente, renderiza a seção "Progressão"
- `README.md` — migration 0011 na lista

---

### Task 1: Extrair helper de data compartilhado

**Files:**
- Create: `lib/date.ts`
- Modify: `lib/streak/update.ts:1-10`

**Interfaces:**
- Produces: `hojeISO(): string` — data de hoje no calendário local (`YYYY-MM-DD`), usada por `atualizarStreak` (já existente) e por `registrarProgressaoDiaria` (Task 3).

- [ ] **Step 1: Criar `lib/date.ts`**

```ts
// lib/date.ts
export function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA");
}
```

- [ ] **Step 2: Atualizar `lib/streak/update.ts` para usar o helper compartilhado**

Substituir as linhas 1-10 atuais:

```ts
import type { supabaseAdmin } from "@/lib/supabase/server";

type Db = ReturnType<typeof supabaseAdmin>;

const FREEZE_MAXIMO = 2;
const DIAS_POR_FREEZE = 7;

function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA");
}
```

por:

```ts
import type { supabaseAdmin } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/date";

type Db = ReturnType<typeof supabaseAdmin>;

const FREEZE_MAXIMO = 2;
const DIAS_POR_FREEZE = 7;
```

O resto do arquivo (`diffDias`, `atualizarStreak`) não muda — só a definição local de `hojeISO` sai daqui.

- [ ] **Step 3: Rodar a suite do streak para confirmar que nada quebrou**

Run: `npm test -- --run lib/streak/update.test.ts`
Expected: PASS (mesmo comportamento de antes — refactor não muda lógica, só a origem de `hojeISO`).

- [ ] **Step 4: Commit**

```bash
git add lib/date.ts lib/streak/update.ts
git commit -m "refactor(date): extract hojeISO into shared lib/date.ts"
```

---

### Task 2: Schema e migration

**Files:**
- Create: `supabase/migrations/0011_progressao_historico.sql`
- Modify: `README.md` (lista de migrations)

**Interfaces:**
- Produces: tabela `progressao_historico(user_id, data, nivel_vocabulario, nivel_gramatica, nivel_expressao)`, chave primária `(user_id, data)`, sem linhas iniciais (populada só quando o usuário pratica).

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/0011_progressao_historico.sql
-- Snapshot diario do nivel estimado (1-6 / A1-C2) por dominio e por perfil
-- de idioma, para desenhar um grafico de progressao ao longo do tempo no
-- painel. Diferente da sequencia (streak, 0010, que e global), o nivel e
-- por perfil — mesmo padrao de FK de user_achievements/user_item_status
-- (0009): varios perfis de idioma podem ter niveis diferentes.
-- Upsert por (user_id, data): chamadas repetidas no mesmo dia sobrescrevem
-- a linha do dia com o nivel mais recente (comportamento correto aqui,
-- diferente da idempotencia "so a primeira conta" do streak).

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

- [ ] **Step 2: Aplicar a migration no Supabase real**

Via `mcp__claude_ai_Supabase__apply_migration` com `project_id: "ueboouuljzozirnvwqpq"`, `name: "progressao_historico"`, `query`: conteúdo do Step 1.

- [ ] **Step 3: Verificar**

Via `mcp__claude_ai_Supabase__execute_sql`:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'progressao_historico'
order by ordinal_position;
```

Expected: 5 colunas — `user_id` (text), `data` (date), `nivel_vocabulario` (integer), `nivel_gramatica` (integer), `nivel_expressao` (integer).

- [ ] **Step 4: Atualizar README**

Em `README.md`, na lista de migrations (mesma seção editada para 0009/0010), adicionar `supabase/migrations/0011_progressao_historico.sql` depois de `0010_streak.sql`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0011_progressao_historico.sql README.md
git commit -m "feat(progressao): add progressao_historico schema"
```

---

### Task 3: Lógica de atualização (`registrarProgressaoDiaria`)

**Files:**
- Create: `lib/progressao/historico.ts`
- Create: `lib/progressao/historico.test.ts`

**Interfaces:**
- Consumes: `hojeISO` de `lib/date.ts` (Task 1); `AdaptiveState` de `@/lib/assessment/adaptive`.
- Produces: `registrarProgressaoDiaria(db: ReturnType<typeof supabaseAdmin>, userId: string, estado: AdaptiveState): Promise<void>`. Nunca lança exceção.

- [ ] **Step 1: Escrever os testes (falhando)**

```ts
// lib/progressao/historico.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { AdaptiveState } from "@/lib/assessment/adaptive";
import { registrarProgressaoDiaria } from "./historico";

const db = supabaseAdmin();
const TEST_USER = "test-progressao-historico";

function estadoComNiveis(vocabulario: number, gramatica: number, expressao: number): AdaptiveState {
  const dominio = (nivel: number) => ({
    nivel,
    acertos_seguidos: 0,
    erros_seguidos: 0,
    respondidos: 0,
    ultima_mudanca_em: 0,
  });
  return {
    vocabulario: dominio(vocabulario),
    gramatica: dominio(gramatica),
    expressao: dominio(expressao),
  };
}

async function lerHoje() {
  const hoje = new Date().toLocaleDateString("en-CA");
  const { data } = await db
    .from("progressao_historico")
    .select("nivel_vocabulario, nivel_gramatica, nivel_expressao")
    .eq("user_id", TEST_USER)
    .eq("data", hoje)
    .maybeSingle();
  return data;
}

describe("registrarProgressaoDiaria", () => {
  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });
  });

  afterAll(async () => {
    await db.from("progressao_historico").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado que ainda nao ha registro hoje para o perfil", () => {
    it("quando chamado, entao insere uma linha com os niveis do estado", async () => {
      await registrarProgressaoDiaria(db, TEST_USER, estadoComNiveis(2, 4, 6));
      const linha = await lerHoje();
      expect(linha).toEqual({
        nivel_vocabulario: 2,
        nivel_gramatica: 4,
        nivel_expressao: 6,
      });
    });
  });

  describe("dado que ja existe um registro hoje para o perfil", () => {
    it("quando chamado de novo com niveis diferentes, entao atualiza os valores sem duplicar", async () => {
      await registrarProgressaoDiaria(db, TEST_USER, estadoComNiveis(1, 1, 1));
      await registrarProgressaoDiaria(db, TEST_USER, estadoComNiveis(5, 3, 6));

      const linha = await lerHoje();
      expect(linha).toEqual({
        nivel_vocabulario: 5,
        nivel_gramatica: 3,
        nivel_expressao: 6,
      });

      const { count } = await db
        .from("progressao_historico")
        .select("data", { count: "exact", head: true })
        .eq("user_id", TEST_USER);
      expect(count).toBe(1);
    });
  });

  describe("dado um user_id que viola a FK de progressao_historico", () => {
    it("quando registrarProgressaoDiaria e chamado, entao nao lanca excecao", async () => {
      await expect(
        registrarProgressaoDiaria(db, "usuario-que-nao-existe-nunca", estadoComNiveis(1, 1, 1)),
      ).resolves.toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- --run lib/progressao/historico.test.ts`
Expected: FAIL — `Cannot find module './historico'`

- [ ] **Step 3: Implementar**

```ts
// lib/progressao/historico.ts
import type { supabaseAdmin } from "@/lib/supabase/server";
import type { AdaptiveState } from "@/lib/assessment/adaptive";
import { hojeISO } from "@/lib/date";

type Db = ReturnType<typeof supabaseAdmin>;

// Chamado pelo funil unico de progresso (recordPracticeResponse) — grava um
// snapshot diario do nivel estimado por dominio, por perfil de idioma
// (diferente do streak, que e global). Upsert por (user_id, data): chamadas
// repetidas no mesmo dia apenas atualizam a linha do dia com o nivel mais
// recente. Nunca lanca excecao (mesma garantia de unlockOnce/atualizarStreak).
export async function registrarProgressaoDiaria(
  db: Db,
  userId: string,
  estado: AdaptiveState,
): Promise<void> {
  try {
    const { error } = await db.from("progressao_historico").upsert({
      user_id: userId,
      data: hojeISO(),
      nivel_vocabulario: estado.vocabulario.nivel,
      nivel_gramatica: estado.gramatica.nivel,
      nivel_expressao: estado.expressao.nivel,
    });
    if (error) throw error;
  } catch (error) {
    console.error("[progressao] falha ao registrar:", (error as Error).message);
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- --run lib/progressao/historico.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/progressao/historico.ts lib/progressao/historico.test.ts
git commit -m "feat(progressao): add registrarProgressaoDiaria"
```

---

### Task 4: Ligar `registrarProgressaoDiaria` ao funil único de progresso

**Files:**
- Modify: `lib/progress/record-response.ts:16`, `lib/progress/record-response.ts:107-112`

**Interfaces:**
- Consumes: `registrarProgressaoDiaria` de `lib/progressao/historico.ts` (Task 3); `novoEstado` (variável já existente na função, tipo `AdaptiveState`).

- [ ] **Step 1: Implementar**

Adicionar o import, junto aos outros de `lib/progress/record-response.ts:16`:

```ts
import { registrarProgressaoDiaria } from "@/lib/progressao/historico";
```

Substituir o bloco final antes do `return` (atualmente linhas 107-112):

```ts
  // As duas chamadas sao independentes (nenhuma depende da outra) — rodam
  // em paralelo, mesmo padrao ja usado nas duas escritas acima.
  const [newlyUnlocked] = await Promise.all([
    checkThresholds(db, userId, "vocabulario_dominado"),
    atualizarStreak(db),
  ]);
```

por:

```ts
  // As tres chamadas sao independentes (nenhuma depende do resultado das
  // outras) — rodam em paralelo, mesmo padrao ja usado nas duas escritas
  // acima.
  const [newlyUnlocked] = await Promise.all([
    checkThresholds(db, userId, "vocabulario_dominado"),
    atualizarStreak(db),
    registrarProgressaoDiaria(db, userId, novoEstado),
  ]);
```

- [ ] **Step 2: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam (mudança aditiva/paralela — `checkThresholds` e `atualizarStreak` continuam retornando o mesmo valor, só passam a rodar concorrentes com `registrarProgressaoDiaria`).

- [ ] **Step 3: Commit**

```bash
git add lib/progress/record-response.ts
git commit -m "feat(progressao): wire registrarProgressaoDiaria into the shared progress funnel"
```

---

### Task 5: Gráfico de progressão e exibição no Painel

**Files:**
- Create: `app/dashboard/_components/progress-chart.tsx`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: tabela `progressao_historico` (Task 2) via query direta, mesmo padrão de leitura das outras queries desta página; `numberToCefr` de `@/lib/cefr` (já existe, usado para os rótulos A1-C2 do eixo Y).
- Produces: `ProgressChart({ historico }: { historico: PontoProgressao[] })` — componente puro, sem estado/interatividade.

- [ ] **Step 1: Criar o componente do gráfico**

```tsx
// app/dashboard/_components/progress-chart.tsx
import { numberToCefr } from "@/lib/cefr";

export interface PontoProgressao {
  data: string;
  nivel_vocabulario: number;
  nivel_gramatica: number;
  nivel_expressao: number;
}

const LARGURA = 560;
const ALTURA = 180;
const PAD_ESQUERDA = 28;
const PAD_DIREITA = 8;
const PAD_TOPO = 8;
const PAD_BASE = 20;

const SERIES = [
  { chave: "nivel_vocabulario", cor: "var(--airmail)", rotulo: "Vocabulário" },
  { chave: "nivel_gramatica", cor: "var(--correction)", rotulo: "Gramática" },
  { chave: "nivel_expressao", cor: "var(--stamp)", rotulo: "Expressão" },
] as const;

function x(indice: number, total: number): number {
  if (total <= 1) return PAD_ESQUERDA;
  const larguraUtil = LARGURA - PAD_ESQUERDA - PAD_DIREITA;
  return PAD_ESQUERDA + (indice / (total - 1)) * larguraUtil;
}

function y(nivel: number): number {
  const alturaUtil = ALTURA - PAD_TOPO - PAD_BASE;
  return PAD_TOPO + (1 - (nivel - 1) / 5) * alturaUtil;
}

function formatarData(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function ProgressChart({ historico }: { historico: PontoProgressao[] }) {
  if (historico.length < 2) {
    return <p className="text-ink-soft">Ainda sem histórico suficiente.</p>;
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label="Nível estimado por domínio ao longo do tempo"
      >
        {[1, 2, 3, 4, 5, 6].map((nivel) => (
          <g key={nivel}>
            <line
              x1={PAD_ESQUERDA}
              x2={LARGURA - PAD_DIREITA}
              y1={y(nivel)}
              y2={y(nivel)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text x={0} y={y(nivel) + 3} fontSize={9} fill="var(--ink-soft)">
              {numberToCefr(nivel)}
            </text>
          </g>
        ))}

        {SERIES.map((serie) => (
          <polyline
            key={serie.chave}
            fill="none"
            stroke={serie.cor}
            strokeWidth={2}
            points={historico
              .map((ponto, indice) => `${x(indice, historico.length)},${y(ponto[serie.chave])}`)
              .join(" ")}
          />
        ))}

        <text x={PAD_ESQUERDA} y={ALTURA - 4} fontSize={9} fill="var(--ink-soft)">
          {formatarData(historico[0].data)}
        </text>
        <text
          x={LARGURA - PAD_DIREITA}
          y={ALTURA - 4}
          fontSize={9}
          fill="var(--ink-soft)"
          textAnchor="end"
        >
          {formatarData(historico[historico.length - 1].data)}
        </text>
      </svg>

      <div className="mt-3 flex gap-4 text-xs text-ink-soft">
        {SERIES.map((serie) => (
          <span key={serie.chave} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: serie.cor }}
              aria-hidden="true"
            />
            {serie.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar a query ao `Promise.all` existente**

Em `app/dashboard/page.tsx`, adicionar o import do componente junto aos outros do topo:

```ts
import { ProgressChart } from "./_components/progress-chart";
```

Substituir a desestruturação do `Promise.all` (linhas 30-39 atuais):

```ts
  const [
    { data: profile, error: profileError },
    { data: goal, error: goalError },
    { data: itemStatuses, error: itemStatusesError },
    { data: lastSession, error: lastSessionError },
    { count: revisoesVencidas, error: revisoesError },
    { count: atividadesPendentes, error: atividadesError },
    { data: streak, error: streakError },
    headerData,
  ] = await Promise.all([
```

por:

```ts
  const [
    { data: profile, error: profileError },
    { data: goal, error: goalError },
    { data: itemStatuses, error: itemStatusesError },
    { data: lastSession, error: lastSessionError },
    { count: revisoesVencidas, error: revisoesError },
    { count: atividadesPendentes, error: atividadesError },
    { data: streak, error: streakError },
    { data: progressao, error: progressaoError },
    headerData,
  ] = await Promise.all([
```

E adicionar a query antes de `getHeaderData(db)` no array de promises (depois da query de `streak_estado`, linhas 66-70 atuais):

```ts
    db
      .from("progressao_historico")
      .select("data, nivel_vocabulario, nivel_gramatica, nivel_expressao")
      .eq("user_id", userId)
      .order("data", { ascending: true }),
```

- [ ] **Step 3: Logar erro de query, se houver**

No loop de erros existente (linhas 74-84 atuais), adicionar `["progressao", progressaoError]` à lista de tuplas checadas.

- [ ] **Step 4: Calcular os valores de exibição**

Depois da linha `const diasRecorde = streak?.dias_recorde ?? 0;` (linha 94 atual), adicionar:

```ts
  const progressaoHistorico = progressao ?? [];
```

- [ ] **Step 5: Renderizar a seção "Progressão"**

Dentro do grid, adicionar uma nova `DashboardSection` logo depois da seção "Sequência" (antes de "Objetivo"), com `lg:col-span-2` (o gráfico precisa de mais largura que uma coluna do grid de 2 colunas):

```tsx
            <DashboardSection label="Progressão" className="lg:col-span-2">
              <ProgressChart historico={progressaoHistorico} />
            </DashboardSection>
```

- [ ] **Step 6: Verificar tipo/lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 7: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam.

- [ ] **Step 8: `npm run build`**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 9: Verificação manual no navegador**

Subir `npm run dev`, abrir `/dashboard`:

- Com menos de 2 dias de histórico (estado atual do perfil real), confirmar que aparece a mensagem "Ainda sem histórico suficiente." sem erro no console.
- Para ver o gráfico com dados, usar `mcp__claude_ai_Supabase__execute_sql` pra inserir temporariamente 3 linhas em `progressao_historico` para o `user_id` real (ex: `insert into progressao_historico (user_id, data, nivel_vocabulario, nivel_gramatica, nivel_expressao) values ('<user_id real>', current_date - 2, 2, 3, 1), ('<user_id real>', current_date - 1, 3, 3, 2), ('<user_id real>', current_date, 3, 4, 2);`), recarregar `/dashboard`, confirmar que as 3 linhas aparecem com cores distintas, legenda e rótulos A1-C2 no eixo Y — depois **apagar essas linhas temporárias** (`delete from progressao_historico where user_id = '<user_id real>' and data < current_date;` mais o registro de hoje se tiver sido sobrescrito por dado de teste, restaurando o valor real se necessário).
- Parar o servidor de dev depois.

- [ ] **Step 10: Commit**

```bash
git add app/dashboard/_components/progress-chart.tsx app/dashboard/page.tsx
git commit -m "feat(progressao): show level-over-time chart on the dashboard"
```
