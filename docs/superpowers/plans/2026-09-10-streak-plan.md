# Sequência de dias (streak) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconhecer visualmente o hábito de praticar todo dia (sequência de dias, estilo streak), global entre todos os perfis de idioma, com uma mecânica de tolerância (freeze) pra não zerar a sequência num único dia esquecido.

**Architecture:** Uma tabela singleton (`streak_estado`, uma linha só, sem FK/user_id — a sequência é global, não por perfil de idioma) atualizada por uma única função (`atualizarStreak`) chamada de dentro do funil único de progresso (`recordPracticeResponse`), que já cobre flashcards/atividades/conversas/correções. Exibida como mais uma seção no Painel existente.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres via `@supabase/supabase-js`), Vitest (integração real contra Supabase, sem mocks de banco), lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-10-streak-design.md`

## Global Constraints

- Testes seguem o padrão do projeto: `describe("dado...")` / `it("quando... então...")`, integração real contra o Supabase do projeto (`ueboouuljzozirnvwqpq`), sem mocks de banco. Watch-fail (RED) antes de cada implementação.
- `atualizarStreak` nunca lança exceção — erros são logados e engolidos. Uma falha aqui não pode derrubar a ação principal do usuário (revisar flashcard, iniciar conversa, etc.) — mesma garantia já usada em `unlockOnce`/`checkThresholds` (feature de conquistas).
- A sequência é **global** (uma linha só, sem `user_id`) — diferente de conquistas/vocabulário/flashcards, que são por perfil de idioma. Não escopar nada disto por `getLocalUserId()`.
- Migration aplicada diretamente no projeto Supabase real (`ueboouuljzozirnvwqpq`) via `mcp__claude_ai_Supabase__apply_migration` — não basta deixar o `.sql` no repo.
- Sem celebração/toast, sem indicador visual de freeze, sem página nova — só um número + ícone de chama no Painel existente.

---

## File Structure

**Novos arquivos:**
- `supabase/migrations/0010_streak.sql` — schema (tabela singleton)
- `lib/streak/update.ts` — `atualizarStreak(db)`
- `lib/streak/update.test.ts`

**Modificados:**
- `lib/progress/record-response.ts` — chama `atualizarStreak(db)` em paralelo com `checkThresholds`
- `app/dashboard/page.tsx` — busca `streak_estado` no `Promise.all` existente, renderiza a seção "Sequência"
- `README.md` — migration 0010 na lista

---

### Task 1: Schema e migration aplicada

**Files:**
- Create: `supabase/migrations/0010_streak.sql`
- Modify: `README.md` (lista de migrations)

**Interfaces:**
- Produces: tabela `streak_estado(singleton, dias_atual, dias_recorde, ultimo_dia_praticado, freezes_disponiveis)`, com exatamente 1 linha.

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/0010_streak.sql
-- Sequencia de dias (streak) global: pratica em qualquer perfil de idioma
-- mantem a mesma sequencia (diferente de conquistas/vocabulario, que sao
-- por perfil) — o app tem varios perfis de idioma mas uma pessoa so.
-- Singleton via boolean PK com check: garante 1 linha so, sem precisar
-- de logica de aplicacao pra impedir duplicata (mesmo padrao usado em
-- achievements/user_achievements, 0009).

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

- [ ] **Step 2: Aplicar a migration no Supabase real**

Via `mcp__claude_ai_Supabase__apply_migration` com `project_id: "ueboouuljzozirnvwqpq"`, `name: "streak"`, `query`: conteúdo do Step 1.

- [ ] **Step 3: Verificar**

Via `mcp__claude_ai_Supabase__execute_sql`: `select * from streak_estado;` — esperado exatamente 1 linha, com `dias_atual = 0`, `freezes_disponiveis = 0`, `ultimo_dia_praticado` nulo.

- [ ] **Step 4: Atualizar README**

Em `README.md`, na lista de migrations (mesma seção editada para 0008/0009), adicionar `supabase/migrations/0010_streak.sql` depois de `0009_achievements.sql`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0010_streak.sql README.md
git commit -m "feat(streak): add streak_estado singleton schema"
```

---

### Task 2: Lógica de atualização (`atualizarStreak`)

**Files:**
- Create: `lib/streak/update.ts`
- Create: `lib/streak/update.test.ts`

**Interfaces:**
- Produces: `atualizarStreak(db: ReturnType<typeof supabaseAdmin>): Promise<void>`. Nunca lança exceção.

- [ ] **Step 1: Escrever os testes (falhando)**

```ts
// lib/streak/update.test.ts
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { atualizarStreak } from "./update";

const db = supabaseAdmin();

interface StreakRow {
  dias_atual: number;
  dias_recorde: number;
  ultimo_dia_praticado: string | null;
  freezes_disponiveis: number;
}

async function lerEstado(): Promise<StreakRow> {
  const { data } = await db
    .from("streak_estado")
    .select("dias_atual, dias_recorde, ultimo_dia_praticado, freezes_disponiveis")
    .eq("singleton", true)
    .single();
  return data as StreakRow;
}

async function definirEstado(estado: Partial<StreakRow>) {
  await db.from("streak_estado").update(estado).eq("singleton", true);
}

function diasAtras(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe("atualizarStreak", () => {
  let original: StreakRow;

  beforeAll(async () => {
    original = await lerEstado();
  });

  afterEach(async () => {
    await definirEstado(original);
  });

  afterAll(async () => {
    await definirEstado(original);
  });

  describe("dado que nunca praticou antes", () => {
    it("quando atualiza, entao inicia a sequencia em 1 dia", async () => {
      await definirEstado({ dias_atual: 0, dias_recorde: 0, ultimo_dia_praticado: null, freezes_disponiveis: 0 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(1);
      expect(estado.dias_recorde).toBe(1);
    });
  });

  describe("dado que praticou ontem", () => {
    it("quando atualiza hoje, entao incrementa a sequencia", async () => {
      await definirEstado({ dias_atual: 5, dias_recorde: 5, ultimo_dia_praticado: diasAtras(1), freezes_disponiveis: 0 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(6);
      expect(estado.dias_recorde).toBe(6);
    });
  });

  describe("dado que ja atualizou hoje", () => {
    it("quando chamado de novo, entao nao muda nada", async () => {
      await definirEstado({ dias_atual: 3, dias_recorde: 3, ultimo_dia_praticado: diasAtras(0), freezes_disponiveis: 1 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(3);
      expect(estado.freezes_disponiveis).toBe(1);
    });
  });

  describe("dado que perdeu um dia sem freeze disponivel", () => {
    it("quando atualiza, entao zera a sequencia mas mantem o recorde", async () => {
      await definirEstado({ dias_atual: 10, dias_recorde: 10, ultimo_dia_praticado: diasAtras(2), freezes_disponiveis: 0 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(1);
      expect(estado.freezes_disponiveis).toBe(0);
      expect(estado.dias_recorde).toBe(10);
    });
  });

  describe("dado que perdeu um dia com freeze disponivel", () => {
    it("quando atualiza, entao mantem a sequencia e consome o freeze", async () => {
      await definirEstado({ dias_atual: 10, dias_recorde: 10, ultimo_dia_praticado: diasAtras(2), freezes_disponiveis: 1 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(11);
      expect(estado.freezes_disponiveis).toBe(0);
    });
  });

  describe("dado que a sequencia chega a um multiplo de 7", () => {
    it("quando atualiza, entao ganha um freeze", async () => {
      await definirEstado({ dias_atual: 6, dias_recorde: 6, ultimo_dia_praticado: diasAtras(1), freezes_disponiveis: 1 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(7);
      expect(estado.freezes_disponiveis).toBe(2);
    });

    it("dado que ja tem 2 freezes, quando atualiza, entao nao ultrapassa o teto", async () => {
      await definirEstado({ dias_atual: 6, dias_recorde: 6, ultimo_dia_praticado: diasAtras(1), freezes_disponiveis: 2 });
      await atualizarStreak(db);
      const estado = await lerEstado();
      expect(estado.dias_atual).toBe(7);
      expect(estado.freezes_disponiveis).toBe(2);
    });
  });

  describe("dado um erro real do banco (linha singleton ausente)", () => {
    it("quando atualizarStreak e chamado, entao nao lanca excecao", async () => {
      await db.from("streak_estado").delete().eq("singleton", true);
      await expect(atualizarStreak(db)).resolves.toBeUndefined();
      await db.from("streak_estado").insert({ singleton: true, ...original });
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- --run lib/streak/update.test.ts`
Expected: FAIL — `Cannot find module './update'`

- [ ] **Step 3: Implementar**

```ts
// lib/streak/update.ts
import type { supabaseAdmin } from "@/lib/supabase/server";

type Db = ReturnType<typeof supabaseAdmin>;

const FREEZE_MAXIMO = 2;
const DIAS_POR_FREEZE = 7;

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffDias(a: string, b: string): number {
  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.round((new Date(a).getTime() - new Date(b).getTime()) / msPorDia);
}

// Chamado pelo funil unico de progresso (recordPracticeResponse) — pratica
// em qualquer perfil de idioma mantem a mesma sequencia global (so existe
// uma pessoa real por tras dos varios perfis). Nunca lanca excecao (mesma
// garantia do motor de conquistas): uma falha aqui nao pode derrubar a
// acao principal do usuario.
export async function atualizarStreak(db: Db): Promise<void> {
  try {
    const { data: estado, error } = await db
      .from("streak_estado")
      .select("dias_atual, dias_recorde, ultimo_dia_praticado, freezes_disponiveis")
      .eq("singleton", true)
      .single();
    if (error) throw error;

    const hoje = hojeISO();
    if (estado.ultimo_dia_praticado === hoje) return;

    let diasAtual: number;
    let freezesDisponiveis = estado.freezes_disponiveis;

    if (!estado.ultimo_dia_praticado) {
      diasAtual = 1;
    } else {
      const diasPerdidos = diffDias(hoje, estado.ultimo_dia_praticado) - 1;
      if (diasPerdidos <= 0) {
        diasAtual = estado.dias_atual + 1;
      } else if (diasPerdidos <= freezesDisponiveis) {
        diasAtual = estado.dias_atual + 1;
        freezesDisponiveis -= diasPerdidos;
      } else {
        diasAtual = 1;
        freezesDisponiveis = 0;
      }
    }

    if (diasAtual % DIAS_POR_FREEZE === 0) {
      freezesDisponiveis = Math.min(freezesDisponiveis + 1, FREEZE_MAXIMO);
    }

    const { error: updateError } = await db
      .from("streak_estado")
      .update({
        dias_atual: diasAtual,
        dias_recorde: Math.max(estado.dias_recorde, diasAtual),
        ultimo_dia_praticado: hoje,
        freezes_disponiveis: freezesDisponiveis,
      })
      .eq("singleton", true);
    if (updateError) throw updateError;
  } catch (error) {
    console.error("[streak] falha ao atualizar:", (error as Error).message);
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- --run lib/streak/update.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/streak/update.ts lib/streak/update.test.ts
git commit -m "feat(streak): add atualizarStreak with freeze mechanic"
```

---

### Task 3: Ligar `atualizarStreak` ao funil único de progresso

**Files:**
- Modify: `lib/progress/record-response.ts`

**Interfaces:**
- Consumes: `atualizarStreak` de `lib/streak/update.ts` (Task 2).

- [ ] **Step 1: Implementar**

Em `lib/progress/record-response.ts`, adicionar o import:

```ts
import { atualizarStreak } from "@/lib/streak/update";
```

Substituir a linha final antes do `return` (atualmente `const newlyUnlocked = await checkThresholds(db, userId, "vocabulario_dominado");`) por:

```ts
  // As duas chamadas sao independentes (nenhuma depende da outra) — rodam
  // em paralelo, mesmo padrao ja usado nas duas escritas acima.
  const [newlyUnlocked] = await Promise.all([
    checkThresholds(db, userId, "vocabulario_dominado"),
    atualizarStreak(db),
  ]);
```

- [ ] **Step 2: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam (mudança aditiva/paralela, nenhum comportamento anterior muda — `checkThresholds` continua retornando o mesmo valor, só passa a rodar concorrente com `atualizarStreak` em vez de depois dele).

- [ ] **Step 3: Commit**

```bash
git add lib/progress/record-response.ts
git commit -m "feat(streak): wire atualizarStreak into the shared progress funnel"
```

---

### Task 4: Exibir a sequência no Painel

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: tabela `streak_estado` (Task 1) diretamente via query — sem função helper nova, mesmo padrão de leitura direta já usado pelas outras queries desta página.

- [ ] **Step 1: Adicionar a query ao `Promise.all` existente**

Em `app/dashboard/page.tsx`, adicionar `Flame` ao import de `lucide-react` (o arquivo hoje não importa nada de lucide-react — adicionar a linha `import { Flame } from "lucide-react";` junto aos outros imports do topo).

Substituir a desestruturação do `Promise.all` (linhas 29-37 atuais):

```ts
  const [
    { data: profile, error: profileError },
    { data: goal, error: goalError },
    { data: itemStatuses, error: itemStatusesError },
    { data: lastSession, error: lastSessionError },
    { count: revisoesVencidas, error: revisoesError },
    { count: atividadesPendentes, error: atividadesError },
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
    headerData,
  ] = await Promise.all([
```

E adicionar a query antes de `getHeaderData(db)` no array de promises (depois da query de `activities`/`atividadesPendentes`, linha 63 atual):

```ts
    db
      .from("streak_estado")
      .select("dias_atual, dias_recorde")
      .eq("singleton", true)
      .maybeSingle(),
```

- [ ] **Step 2: Logar erro de query, se houver**

No loop de erros existente (linhas 67-76 atuais), adicionar `["streak", streakError]` à lista de tuplas checadas.

- [ ] **Step 3: Calcular os valores de exibição**

Depois da linha `const nivelEstimado = ...` (linha 83 atual), adicionar:

```ts
  const diasAtual = streak?.dias_atual ?? 0;
  const diasRecorde = streak?.dias_recorde ?? 0;
```

- [ ] **Step 4: Renderizar a seção "Sequência"**

Dentro do grid (`<div className="mt-10 grid ...">`), adicionar uma nova `DashboardSection` logo depois da seção "Hoje" (antes de "Objetivo"):

```tsx
            <DashboardSection label="Sequência" className="">
              <div className="flex items-center gap-3">
                <Flame
                  size={28}
                  strokeWidth={1.75}
                  className={diasAtual > 0 ? "text-stamp" : "text-ink-soft"}
                  aria-hidden="true"
                />
                <div>
                  <p className="font-display text-2xl">
                    {diasAtual} dia{diasAtual === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-ink-soft">seguido{diasAtual === 1 ? "" : "s"}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                Recorde: {diasRecorde} dia{diasRecorde === 1 ? "" : "s"}
              </p>
            </DashboardSection>
```

- [ ] **Step 5: Verificar tipo/lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam.

- [ ] **Step 7: `npm run build`**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 8: Verificação manual no navegador**

Subir `npm run dev`, abrir `/dashboard` — conferir que a seção "Sequência" aparece com o ícone de chama e o número de dias/recorde, sem erros no console. Parar o servidor de dev depois.

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(streak): show current streak and record on the dashboard"
```
