# Conquistas / selos colecionáveis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar reconhecimento visual (selos colecionáveis, no tema postal do app) a marcos de progresso já existentes nos dados — vocabulário dominado, primeiras ações, consistência/esforço — com celebração em tempo real nas duas superfícies web do dashboard (flashcards, atividades).

**Architecture:** Catálogo de selos em tabela (`achievements`, semeada), desbloqueios persistidos em `user_achievements` (idempotente via `on conflict do nothing`). Dois mecanismos de desbloqueio: `checkThresholds` (recalcula contagem real e desbloqueia o que já foi atingido) e `unlockOnce` (chamado direto no ponto exato de um evento "primeira vez"). Ambos plugados nos 6 pontos de escrita que já existem no app — nenhuma tabela nova além das duas de achievements.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres via `@supabase/supabase-js`), Vitest (integração real contra Supabase, sem mocks de banco), lucide-react, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-09-09-conquistas-design.md`

## Global Constraints

- Testes seguem o padrão do projeto: `describe("dado...")` / `it("quando... então...")`, integração real contra o Supabase do projeto (`ueboouuljzozirnvwqpq`), sem mocks de banco. Watch-fail (RED) antes de cada implementação.
- `user_id` em toda query de achievements é o `getLocalUserId()` já existente (perfil por idioma) — nunca um id novo.
- `unlockOnce`/`checkThresholds` nunca lançam exceção — um selo que falhar ao desbloquear não pode derrubar a ação principal do usuário (revisar flashcard, iniciar conversa, etc.). Erros são logados e engolidos.
- Migrations aplicadas diretamente no projeto Supabase real (`ueboouuljzozirnvwqpq`) via `mcp__claude_ai_Supabase__apply_migration`, mesma prática já usada na migration 0008 desta sessão — não basta deixar o `.sql` no repo.
- Nenhuma celebração (toast) para desbloqueios disparados via MCP (conversa/avaliação/plano) — só os dois endpoints HTTP do dashboard (flashcards, atividades) retornam `newlyUnlocked` pro cliente.

---

## File Structure

**Novos arquivos:**
- `supabase/migrations/0009_achievements.sql` — schema
- `supabase/seed/achievements.sql` — catálogo inicial (13 selos)
- `lib/achievements/types.ts` — `Achievement`, `Categoria`, `Metrica`
- `lib/achievements/progress.ts` — funções de contagem + `CONTADORES`
- `lib/achievements/progress.test.ts`
- `lib/achievements/unlock.ts` — `unlockOnce`, `checkThresholds`
- `lib/achievements/unlock.test.ts`
- `lib/achievements/icons.tsx` — `ACHIEVEMENT_ICONS` (nome → componente lucide)
- `app/dashboard/_components/achievement-toast.tsx` — toast client
- `app/dashboard/conquistas/page.tsx` — página de coleção
- `lib/progress/record-response.test.ts`

**Modificados:**
- `lib/progress/record-response.ts` — `newlyUnlocked` no retorno
- `lib/mcp/scenarios.ts` — `start_conversation_session`, `finish_conversation_session`, `log_practice_item`
- `lib/mcp/tools.ts` — `finish_assessment_session`
- `lib/mcp/study-plan.ts` — `generate_study_plan`, `advance_study_plan_milestone`
- `app/api/flashcards/review/route.ts` — `newlyUnlocked` na resposta
- `app/api/activities/[id]/respond/route.ts` — `newlyUnlocked` na resposta
- `app/dashboard/flashcards/flashcard-deck.tsx` — mostra toast
- `app/dashboard/atividades/activity-card.tsx` — mostra toast
- `app/dashboard/_components/dashboard-header.tsx` — item de menu "Conquistas"
- `app/globals.css` — animação do toast
- `README.md` — migration 0009 na lista
- `lib/mcp/scenarios.test.ts`, `lib/mcp/tools.test.ts`, `lib/mcp/study-plan.test.ts`, `app/api/activities/[id]/respond/route.test.ts` — asserções novas

---

### Task 1: Schema, seed e migration aplicada

**Files:**
- Create: `supabase/migrations/0009_achievements.sql`
- Create: `supabase/seed/achievements.sql`
- Modify: `README.md` (lista de migrations)

**Interfaces:**
- Produces: tabelas `achievements(chave, categoria, metrica, limite, titulo, descricao, icone, ordem)` e `user_achievements(user_id, achievement_chave, desbloqueado_em)`, com 13 linhas semeadas em `achievements`.

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/0009_achievements.sql
-- Selos colecionaveis: reconhecimento visual de marcos de progresso.
-- achievements e uma TABELA (nao enum), mesmo padrao de activity_types
-- (0003) — um selo novo e so uma linha no seed, sem migracao destrutiva.
-- metrica/limite descrevem selos "por contagem" (ex: vocabulario_dominado
-- >= 10); metrica null = selo "de evento", desbloqueado direto no codigo
-- no momento exato em que acontece (ex: primeira conversa).

create table achievements (
  chave text primary key,
  categoria text not null,       -- 'vocabulario' | 'primeira_vez' | 'consistencia' (agrupamento na UI)
  metrica text,                  -- 'vocabulario_dominado' | 'atividades_respondidas' | 'conversas_concluidas' | null
  limite integer,                -- null para selos de evento
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

- [ ] **Step 2: Escrever o seed**

```sql
-- supabase/seed/achievements.sql
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
```

- [ ] **Step 3: Aplicar a migration e o seed no Supabase real**

Via `mcp__claude_ai_Supabase__apply_migration` com `project_id: "ueboouuljzozirnvwqpq"`, `name: "achievements"`, `query`: conteúdo do Step 1.
Em seguida `mcp__claude_ai_Supabase__execute_sql` com o conteúdo do Step 2 (insert é idempotente por PK — seguro rodar de novo se precisar).

- [ ] **Step 4: Verificar**

Via `execute_sql`: `select count(*) from achievements;` — esperado `13`.

- [ ] **Step 5: Atualizar README**

Em `README.md`, na lista de migrations (mesma seção editada para 0008), adicionar `supabase/migrations/0009_achievements.sql` depois de `0008_scenarios_hardening.sql`, e `supabase/seed/achievements.sql` na lista de seeds.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0009_achievements.sql supabase/seed/achievements.sql README.md
git commit -m "feat(achievements): add achievements schema and initial catalog seed"
```

---

### Task 2: Tipos e funções de contagem

**Files:**
- Create: `lib/achievements/types.ts`
- Create: `lib/achievements/progress.ts`
- Create: `lib/achievements/progress.test.ts`

**Interfaces:**
- Produces: `Achievement`, `Categoria`, `Metrica` (types); `contarVocabularioDominado`, `contarAtividadesRespondidas`, `contarConversasConcluidas`, `CONTADORES: Record<Metrica, (db, userId: string) => Promise<number>>`.

- [ ] **Step 1: Criar os tipos**

```ts
// lib/achievements/types.ts
export type Categoria = "vocabulario" | "primeira_vez" | "consistencia";
export type Metrica = "vocabulario_dominado" | "atividades_respondidas" | "conversas_concluidas";

export interface Achievement {
  chave: string;
  categoria: Categoria;
  metrica: Metrica | null;
  limite: number | null;
  titulo: string;
  descricao: string;
  icone: string;
  ordem: number;
}
```

- [ ] **Step 2: Escrever o teste das funções de contagem (falhando)**

```ts
// lib/achievements/progress.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  contarVocabularioDominado,
  contarAtividadesRespondidas,
  contarConversasConcluidas,
} from "./progress";

const db = supabaseAdmin();
const TEST_USER = "test-achievements-progress";

describe("funcoes de contagem de progresso", () => {
  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });
  });

  afterAll(async () => {
    await db.from("activities").delete().eq("user_id", TEST_USER);
    await db.from("conversation_sessions").delete().eq("user_id", TEST_USER);
    await db.from("user_item_status").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado 3 itens marcados como conhecido", () => {
    it("quando contarVocabularioDominado e chamado, entao retorna 3", async () => {
      const { data: itens } = await db.from("skill_items").select("id").limit(3);
      await db.from("user_item_status").upsert(
        itens!.map((i) => ({ user_id: TEST_USER, skill_item_id: i.id, status: "conhecido" })),
      );
      expect(await contarVocabularioDominado(db, TEST_USER)).toBe(3);
    });
  });

  describe("dado 2 atividades concluidas e 1 pendente", () => {
    it("quando contarAtividadesRespondidas e chamado, entao retorna 2", async () => {
      await db.from("activities").insert([
        { user_id: TEST_USER, tipo: "multiple_choice", payload: {}, status: "concluida" },
        { user_id: TEST_USER, tipo: "multiple_choice", payload: {}, status: "concluida" },
        { user_id: TEST_USER, tipo: "multiple_choice", payload: {}, status: "pendente" },
      ]);
      expect(await contarAtividadesRespondidas(db, TEST_USER)).toBe(2);
    });
  });

  describe("dado 1 conversa finalizada e 1 em andamento", () => {
    it("quando contarConversasConcluidas e chamado, entao retorna 1", async () => {
      await db.from("conversation_sessions").insert([
        { user_id: TEST_USER, finalizado_em: new Date().toISOString() },
        { user_id: TEST_USER },
      ]);
      expect(await contarConversasConcluidas(db, TEST_USER)).toBe(1);
    });
  });
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npm test -- --run lib/achievements/progress.test.ts`
Expected: FAIL — `Cannot find module './progress'`

- [ ] **Step 4: Implementar**

```ts
// lib/achievements/progress.ts
import type { supabaseAdmin } from "@/lib/supabase/server";
import type { Metrica } from "./types";

type Db = ReturnType<typeof supabaseAdmin>;

export async function contarVocabularioDominado(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from("user_item_status")
    .select("skill_item_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "conhecido");
  if (error) throw error;
  return count ?? 0;
}

export async function contarAtividadesRespondidas(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "concluida");
  if (error) throw error;
  return count ?? 0;
}

export async function contarConversasConcluidas(db: Db, userId: string): Promise<number> {
  const { count, error } = await db
    .from("conversation_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("finalizado_em", "is", null);
  if (error) throw error;
  return count ?? 0;
}

export const CONTADORES: Record<Metrica, (db: Db, userId: string) => Promise<number>> = {
  vocabulario_dominado: contarVocabularioDominado,
  atividades_respondidas: contarAtividadesRespondidas,
  conversas_concluidas: contarConversasConcluidas,
};
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test -- --run lib/achievements/progress.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/achievements/types.ts lib/achievements/progress.ts lib/achievements/progress.test.ts
git commit -m "feat(achievements): add progress-counting functions"
```

---

### Task 3: Motor de desbloqueio (`unlockOnce`, `checkThresholds`)

**Files:**
- Create: `lib/achievements/unlock.ts`
- Create: `lib/achievements/unlock.test.ts`

**Interfaces:**
- Consumes: `CONTADORES` de `lib/achievements/progress.ts` (Task 2), `Achievement`/`Metrica` de `lib/achievements/types.ts` (Task 2).
- Produces: `unlockOnce(db, userId: string, chave: string): Promise<Achievement | null>`, `checkThresholds(db, userId: string, metrica: Metrica): Promise<Achievement[]>`. Nenhum dos dois lança exceção.

- [ ] **Step 1: Escrever os testes (falhando)**

```ts
// lib/achievements/unlock.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { unlockOnce, checkThresholds } from "./unlock";

const db = supabaseAdmin();

describe("unlockOnce", () => {
  const TEST_USER = "test-achievements-unlock";

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado um selo nunca desbloqueado por este usuario", () => {
    it("quando chamado, entao retorna o achievement e persiste em user_achievements", async () => {
      const achievement = await unlockOnce(db, TEST_USER, "primeiro_flashcard");
      expect(achievement?.chave).toBe("primeiro_flashcard");

      const { data } = await db
        .from("user_achievements")
        .select("achievement_chave")
        .eq("user_id", TEST_USER)
        .eq("achievement_chave", "primeiro_flashcard")
        .maybeSingle();
      expect(data?.achievement_chave).toBe("primeiro_flashcard");
    });
  });

  describe("dado um selo ja desbloqueado por este usuario", () => {
    it("quando chamado de novo, entao retorna null e nao duplica", async () => {
      await unlockOnce(db, TEST_USER, "primeira_avaliacao");
      const segunda = await unlockOnce(db, TEST_USER, "primeira_avaliacao");
      expect(segunda).toBeNull();

      const { count } = await db
        .from("user_achievements")
        .select("achievement_chave", { count: "exact", head: true })
        .eq("user_id", TEST_USER)
        .eq("achievement_chave", "primeira_avaliacao");
      expect(count).toBe(1);
    });
  });
});

describe("checkThresholds", () => {
  const TEST_USER = "test-achievements-thresholds";

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });

    const { data: itens } = await db.from("skill_items").select("id").limit(51);
    await db.from("user_item_status").upsert(
      itens!.map((item) => ({ user_id: TEST_USER, skill_item_id: item.id, status: "conhecido" })),
    );
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().eq("user_id", TEST_USER);
    await db.from("user_item_status").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado um usuario com 51 itens dominados", () => {
    it("quando checkThresholds('vocabulario_dominado') e chamado, entao desbloqueia vocab_10 e vocab_50, mas nao vocab_100", async () => {
      const desbloqueados = await checkThresholds(db, TEST_USER, "vocabulario_dominado");
      const chaves = desbloqueados.map((a) => a.chave);
      expect(chaves).toContain("vocab_10");
      expect(chaves).toContain("vocab_50");
      expect(chaves).not.toContain("vocab_100");
    });

    it("quando chamado de novo sem mudar a contagem, entao nao desbloqueia nada novo", async () => {
      const desbloqueados = await checkThresholds(db, TEST_USER, "vocabulario_dominado");
      expect(desbloqueados).toEqual([]);
    });
  });
});

describe("isolamento entre perfis", () => {
  const USER_A = "test-achievements-perfil-a";
  const USER_B = "test-achievements-perfil-b";

  beforeAll(async () => {
    await db.from("profiles").delete().in("user_id", [USER_A, USER_B]);
    await db.from("profiles").insert([{ user_id: USER_A }, { user_id: USER_B }]);
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().in("user_id", [USER_A, USER_B]);
    await db.from("profiles").delete().in("user_id", [USER_A, USER_B]);
  });

  describe("dado um selo desbloqueado pelo perfil A", () => {
    it("quando verifica o perfil B, entao o selo nao aparece la", async () => {
      await unlockOnce(db, USER_A, "primeiro_flashcard");

      const { data } = await db
        .from("user_achievements")
        .select("achievement_chave")
        .eq("user_id", USER_B)
        .eq("achievement_chave", "primeiro_flashcard")
        .maybeSingle();
      expect(data).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- --run lib/achievements/unlock.test.ts`
Expected: FAIL — `Cannot find module './unlock'`

- [ ] **Step 3: Implementar**

```ts
// lib/achievements/unlock.ts
import type { supabaseAdmin } from "@/lib/supabase/server";
import { CONTADORES } from "./progress";
import type { Achievement, Metrica } from "./types";

type Db = ReturnType<typeof supabaseAdmin>;

// Selo e um bonus motivacional, nunca pode derrubar a acao principal do
// usuario (revisar flashcard, iniciar conversa, etc.) — por isso nenhuma
// das duas funcoes abaixo lanca excecao; erros sao logados e engolidos.
export async function unlockOnce(db: Db, userId: string, chave: string): Promise<Achievement | null> {
  try {
    const { data: inserido, error } = await db
      .from("user_achievements")
      .upsert(
        { user_id: userId, achievement_chave: chave },
        { onConflict: "user_id,achievement_chave", ignoreDuplicates: true },
      )
      .select("achievement_chave");
    if (error) throw error;
    if (!inserido || inserido.length === 0) return null;

    const { data: achievement, error: achError } = await db
      .from("achievements")
      .select("*")
      .eq("chave", chave)
      .single();
    if (achError) throw achError;
    return achievement as Achievement;
  } catch (error) {
    console.error("[achievements] falha ao desbloquear:", chave, (error as Error).message);
    return null;
  }
}

export async function checkThresholds(db: Db, userId: string, metrica: Metrica): Promise<Achievement[]> {
  try {
    const contagem = await CONTADORES[metrica](db, userId);
    const { data: candidatos, error } = await db
      .from("achievements")
      .select("*")
      .eq("metrica", metrica)
      .lte("limite", contagem);
    if (error) throw error;

    const desbloqueados: Achievement[] = [];
    for (const candidato of candidatos ?? []) {
      const achievement = await unlockOnce(db, userId, candidato.chave);
      if (achievement) desbloqueados.push(achievement);
    }
    return desbloqueados;
  } catch (error) {
    console.error("[achievements] falha ao checar limites:", metrica, (error as Error).message);
    return [];
  }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- --run lib/achievements/unlock.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/achievements/unlock.ts lib/achievements/unlock.test.ts
git commit -m "feat(achievements): add unlockOnce and checkThresholds"
```

---

### Task 4: Ligar `checkThresholds` ao funil único de progresso

**Files:**
- Modify: `lib/progress/record-response.ts`
- Create: `lib/progress/record-response.test.ts`

**Interfaces:**
- Consumes: `checkThresholds` de `lib/achievements/unlock.ts` (Task 3); `Achievement` de `lib/achievements/types.ts` (Task 2).
- Produces: `RecordPracticeResponseResult` ganha o campo `newlyUnlocked: Achievement[]`.

- [ ] **Step 1: Escrever o teste (falhando)**

```ts
// lib/progress/record-response.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabaseAdmin } from "@/lib/supabase/server";
import { recordPracticeResponse } from "./record-response";
import type { Domain } from "@/lib/assessment/adaptive";

const db = supabaseAdmin();
const TEST_USER = "test-record-response-achievements";

describe("recordPracticeResponse — integracao com selos", () => {
  let skillItemIds: string[];

  beforeAll(async () => {
    await db.from("profiles").delete().eq("user_id", TEST_USER);
    await db.from("profiles").insert({ user_id: TEST_USER });

    const { data: itens } = await db.from("skill_items").select("id").limit(10);
    skillItemIds = itens!.map((i) => i.id);

    // 9 ja dominados de antemao, faltando so 1 pro selo vocab_10
    await db.from("user_item_status").upsert(
      skillItemIds.slice(0, 9).map((id) => ({ user_id: TEST_USER, skill_item_id: id, status: "conhecido" })),
    );
  });

  afterAll(async () => {
    await db.from("user_achievements").delete().eq("user_id", TEST_USER);
    await db.from("user_item_status").delete().eq("user_id", TEST_USER);
    await db.from("profiles").delete().eq("user_id", TEST_USER);
  });

  describe("dado um usuario a 1 item de distancia do selo vocab_10", () => {
    it("quando o decimo item e marcado conhecido, entao o resultado inclui vocab_10 em newlyUnlocked", async () => {
      const { data: item } = await db
        .from("skill_items")
        .select("id, tipo")
        .eq("id", skillItemIds[9])
        .single();

      const resultado = await recordPracticeResponse(db, {
        userId: TEST_USER,
        skillItemId: item!.id,
        domain: item!.tipo as Domain,
        resultado: "conhecido",
      });

      expect(resultado.newlyUnlocked.map((a) => a.chave)).toContain("vocab_10");
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- --run lib/progress/record-response.test.ts`
Expected: FAIL — `resultado.newlyUnlocked is undefined`

- [ ] **Step 3: Implementar**

Em `lib/progress/record-response.ts`, adicionar o import e o campo no retorno:

```ts
// no topo do arquivo, junto aos outros imports
import { checkThresholds } from "@/lib/achievements/unlock";
import type { Achievement } from "@/lib/achievements/types";
```

```ts
export interface RecordPracticeResponseResult {
  itemStatus: "conhecido" | "aprendendo" | "desconhecido";
  nivelPraticaAtualizado: Cefr;
  newlyUnlocked: Achievement[];
}
```

Substituir o `return` final (depois do `if (statusError) fail(statusError);`, linha 101 atual):

```ts
  const newlyUnlocked = await checkThresholds(db, userId, "vocabulario_dominado");

  return {
    itemStatus,
    nivelPraticaAtualizado: numberToCefr(novoEstado[domain].nivel),
    newlyUnlocked,
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- --run lib/progress/record-response.test.ts`
Expected: PASS

- [ ] **Step 5: Rodar a suite inteira (outros chamadores de recordPracticeResponse não devem quebrar)**

Run: `npm test -- --run`
Expected: todos os testes passam (o campo novo é aditivo — `lib/mcp/coaching.ts` descarta o retorno, `lib/mcp/scenarios.ts` e as duas rotas de API vão ser ajustados nas próximas tasks).

- [ ] **Step 6: Commit**

```bash
git add lib/progress/record-response.ts lib/progress/record-response.test.ts
git commit -m "feat(achievements): surface newlyUnlocked from recordPracticeResponse"
```

---

### Task 5: Selos de evento — primeira conversa, primeira avaliação, primeiro plano

**Files:**
- Modify: `lib/mcp/scenarios.ts:81-135` (`start_conversation_session`)
- Modify: `lib/mcp/tools.ts:348-391` (`finish_assessment_session`)
- Modify: `lib/mcp/study-plan.ts:23-108` (`generate_study_plan`)
- Modify: `lib/mcp/scenarios.test.ts`, `lib/mcp/tools.test.ts`, `lib/mcp/study-plan.test.ts`

**Interfaces:**
- Consumes: `unlockOnce` de `lib/achievements/unlock.ts` (Task 3).

- [ ] **Step 1: Escrever as asserções (falhando)**

Em `lib/mcp/scenarios.test.ts`, no teste `"cria um cenario proprio, encontra-o na listagem filtrada e inicia uma conversa nele"` (depois do `expect(briefing).toContain(...)`), adicionar:

```ts
    const { data: unlocked } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "primeira_conversa")
      .maybeSingle();
    expect(unlocked?.achievement_chave).toBe("primeira_conversa");
```

Em `lib/mcp/tools.test.ts`, no teste `"percorre o fluxo completo de onboarding + avaliacao"`, logo depois do bloco que chama `finish_assessment_session` (depois da linha `expect(Object.keys(finalizado.nivel_estimado).sort()).toEqual(...)`, antes de `const resumo = ...`), adicionar:

```ts
    const { data: unlockedAvaliacao } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "primeira_avaliacao")
      .maybeSingle();
    expect(unlockedAvaliacao?.achievement_chave).toBe("primeira_avaliacao");
```

Em `lib/mcp/study-plan.test.ts`, no teste `"gera um plano com metas ordenadas a partir do objetivo e nivel mais fraco"`, logo depois de obter o resultado de `generate_study_plan` (mesma variável já usada nas asserções seguintes daquele teste), adicionar:

```ts
    const { data: unlockedPlano } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "primeiro_plano")
      .maybeSingle();
    expect(unlockedPlano?.achievement_chave).toBe("primeiro_plano");
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- --run lib/mcp/scenarios.test.ts lib/mcp/tools.test.ts lib/mcp/study-plan.test.ts`
Expected: as 3 novas asserções falham com `unlocked` sendo `undefined`/`null`.

- [ ] **Step 3: Implementar — `start_conversation_session`**

Em `lib/mcp/scenarios.ts`, adicionar `import { unlockOnce } from "@/lib/achievements/unlock";` no topo, e logo antes do `return json({ session_id: session.id, briefing });` (linha 133):

```ts
      await unlockOnce(db, getLocalUserId(), "primeira_conversa");

      return json({ session_id: session.id, briefing });
```

- [ ] **Step 4: Implementar — `finish_assessment_session`**

Em `lib/mcp/tools.ts`, adicionar o import de `unlockOnce` (`import { unlockOnce } from "@/lib/achievements/unlock";`), e logo antes do `return json({ nivel_estimado: nivelEstimado });` (linha 389):

```ts
      await unlockOnce(db, getLocalUserId(), "primeira_avaliacao");

      return json({ nivel_estimado: nivelEstimado });
```

- [ ] **Step 5: Implementar — `generate_study_plan`**

Em `lib/mcp/study-plan.ts`, adicionar `import { unlockOnce } from "@/lib/achievements/unlock";` no topo, e logo antes do `return json({ plan_id: plan.id, milestones });` (linha 106):

```ts
      await unlockOnce(db, getLocalUserId(), "primeiro_plano");

      return json({ plan_id: plan.id, milestones });
```

- [ ] **Step 6: Rodar e confirmar que passam**

Run: `npm test -- --run lib/mcp/scenarios.test.ts lib/mcp/tools.test.ts lib/mcp/study-plan.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/mcp/scenarios.ts lib/mcp/scenarios.test.ts lib/mcp/tools.ts lib/mcp/tools.test.ts lib/mcp/study-plan.ts lib/mcp/study-plan.test.ts
git commit -m "feat(achievements): unlock event-based badges (first conversation, assessment, plan)"
```

---

### Task 6: Selos restantes — conversas concluídas e plano completo

**Files:**
- Modify: `lib/mcp/scenarios.ts` (`finish_conversation_session` — linhas exatas mudaram após a Task 5 inserir código em `start_conversation_session` acima; localize pelo texto do `return json({ ok: true });`, único nesse arquivo)
- Modify: `lib/mcp/study-plan.ts` (`advance_study_plan_milestone` — idem, mudou após a Task 5; localize pelo corpo da função mostrado no Step 4 abaixo)
- Modify: `lib/mcp/scenarios.test.ts`, `lib/mcp/study-plan.test.ts`

**Interfaces:**
- Consumes: `unlockOnce`, `checkThresholds` de `lib/achievements/unlock.ts` (Task 3).

- [ ] **Step 1: Escrever os testes (falhando)**

Em `lib/mcp/scenarios.test.ts`, novo `describe` isolado, reaproveitando o `TEST_USER_ID` já mockado no topo do arquivo (o mock de `getLocalUserId` é estático por arquivo, então todo teste deste arquivo opera sob o mesmo `TEST_USER_ID`):

```ts
describe("finish_conversation_session desbloqueia selo de consistencia", () => {
  const { server, handlers } = createTestMcpServer();
  registerScenarioTools(server);

  afterAll(async () => {
    await db.from("conversation_sessions").delete().eq("user_id", TEST_USER_ID);
    await db.from("user_achievements").delete().eq("user_id", TEST_USER_ID);
  });

  it("dado 4 conversas ja concluidas, quando a quinta e finalizada, entao desbloqueia conversas_5", async () => {
    await db.from("conversation_sessions").insert(
      Array.from({ length: 4 }, () => ({ user_id: TEST_USER_ID, finalizado_em: new Date().toISOString() })),
    );

    const { data: quinta } = await db
      .from("conversation_sessions")
      .insert({ user_id: TEST_USER_ID })
      .select("id")
      .single();

    await handlers.get("finish_conversation_session")!({ session_id: quinta!.id });

    const { data: unlocked } = await db
      .from("user_achievements")
      .select("achievement_chave")
      .eq("user_id", TEST_USER_ID)
      .eq("achievement_chave", "conversas_5")
      .maybeSingle();
    expect(unlocked?.achievement_chave).toBe("conversas_5");
  });
});
```

Em `lib/mcp/study-plan.test.ts`, novo teste no describe principal (reaproveitando `TEST_USER_ID` e `db` já existentes no arquivo):

```ts
it("dado um plano com todas as metas concluidas, quando a ultima e avancada, entao desbloqueia plano_completo", async () => {
  const gerado = parseToolResult<{ plan_id: string; milestones: { id: string }[] }>(
    await handlers.get("generate_study_plan")!({}),
  );
  const { data: itens } = await db
    .from("study_plan_items")
    .select("id")
    .eq("study_plan_id", gerado.plan_id);

  for (const item of itens!) {
    await handlers.get("advance_study_plan_milestone")!({ study_plan_item_id: item.id });
  }

  const { data: unlocked } = await db
    .from("user_achievements")
    .select("achievement_chave")
    .eq("user_id", TEST_USER_ID)
    .eq("achievement_chave", "plano_completo")
    .maybeSingle();
  expect(unlocked?.achievement_chave).toBe("plano_completo");
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm test -- --run lib/mcp/scenarios.test.ts lib/mcp/study-plan.test.ts`
Expected: as duas novas asserções falham (`unlocked` undefined).

- [ ] **Step 3: Implementar — `finish_conversation_session`**

Em `lib/mcp/scenarios.ts`, trocar o import de `unlockOnce` (adicionado na Task 5) para incluir `checkThresholds`: `import { unlockOnce, checkThresholds } from "@/lib/achievements/unlock";`. Logo antes do `return json({ ok: true });` (linha 213):

```ts
      await checkThresholds(db, getLocalUserId(), "conversas_concluidas");

      return json({ ok: true });
```

- [ ] **Step 4: Implementar — `advance_study_plan_milestone`**

Em `lib/mcp/study-plan.ts`, o import já é `import { unlockOnce } from "@/lib/achievements/unlock";` (Task 5) — mantenha assim (`checkThresholds` não é usado aqui). Substituir o corpo do handler (linhas 152-159):

```ts
    async (args) => {
      const db = supabaseAdmin();
      const { data: item, error } = await db
        .from("study_plan_items")
        .update({ status: "concluido", concluido_em: new Date().toISOString() })
        .eq("id", args.study_plan_item_id)
        .select("study_plan_id")
        .single();
      if (error) dbFail(error);

      const { count: pendentes } = await db
        .from("study_plan_items")
        .select("id", { count: "exact", head: true })
        .eq("study_plan_id", item.study_plan_id)
        .neq("status", "concluido");

      if ((pendentes ?? 0) === 0) {
        await unlockOnce(db, getLocalUserId(), "plano_completo");
      }

      return json({ ok: true });
    },
```

- [ ] **Step 5: Rodar e confirmar que passam**

Run: `npm test -- --run lib/mcp/scenarios.test.ts lib/mcp/study-plan.test.ts`
Expected: PASS

- [ ] **Step 6: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add lib/mcp/scenarios.ts lib/mcp/scenarios.test.ts lib/mcp/study-plan.ts lib/mcp/study-plan.test.ts
git commit -m "feat(achievements): unlock conversas_5/20 and plano_completo badges"
```

---

### Task 7: Selo de "primeiro flashcard" na rota de review

**Files:**
- Modify: `app/api/flashcards/review/route.ts`
- Modify: `app/api/flashcards/review/route.test.ts`

**Interfaces:**
- Consumes: `unlockOnce` de `lib/achievements/unlock.ts` (Task 3); `RecordPracticeResponseResult.newlyUnlocked` (Task 4).
- Produces: resposta JSON da rota ganha `newlyUnlocked: Achievement[]`.

- [ ] **Step 1: Escrever o teste (falhando)**

Em `app/api/flashcards/review/route.test.ts`, adicionar (antes do teste existente `"registra a resposta e retorna o novo status do item"`, já que o selo só desbloqueia na primeira chamada pro `skillItemId`/`TEST_USER_ID` compartilhados no arquivo):

```ts
  it("dado o primeiro flashcard revisado por este usuario, entao a resposta inclui o selo primeiro_flashcard", async () => {
    const res = await POST(req({ skill_item_id: skillItemId, resultado: "conhecido" }));
    const body = await res.json();
    expect(body.newlyUnlocked.some((a: { chave: string }) => a.chave === "primeiro_flashcard")).toBe(true);
  });
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- --run app/api/flashcards/review/route.test.ts`
Expected: FAIL — `body.newlyUnlocked` é `undefined`.

- [ ] **Step 3: Implementar**

Em `app/api/flashcards/review/route.ts`, adicionar `import { unlockOnce } from "@/lib/achievements/unlock";`, e substituir:

```ts
  const resultado = await recordPracticeResponse(db, {
    userId: getLocalUserId(),
    skillItemId: parsed.data.skill_item_id,
    domain: item.tipo as Domain,
    resultado: parsed.data.resultado,
  });

  return NextResponse.json(resultado);
```

por:

```ts
  const resultado = await recordPracticeResponse(db, {
    userId: getLocalUserId(),
    skillItemId: parsed.data.skill_item_id,
    domain: item.tipo as Domain,
    resultado: parsed.data.resultado,
  });

  const primeiroFlashcard = await unlockOnce(db, getLocalUserId(), "primeiro_flashcard");
  const newlyUnlocked = primeiroFlashcard
    ? [...resultado.newlyUnlocked, primeiroFlashcard]
    : resultado.newlyUnlocked;

  return NextResponse.json({ ...resultado, newlyUnlocked });
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- --run app/api/flashcards/review/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/flashcards/review/route.ts app/api/flashcards/review/route.test.ts
git commit -m "feat(achievements): unlock primeiro_flashcard and surface it in review response"
```

---

### Task 8: Selos de atividades respondidas na rota de resposta

**Files:**
- Modify: `app/api/activities/[id]/respond/route.ts`
- Modify: `app/api/activities/[id]/respond/route.test.ts`

**Interfaces:**
- Consumes: `checkThresholds` de `lib/achievements/unlock.ts` (Task 3); `RecordPracticeResponseResult.newlyUnlocked` (Task 4); `Achievement` de `lib/achievements/types.ts` (Task 2).
- Produces: resposta JSON da rota ganha `newlyUnlocked: Achievement[]`.

- [ ] **Step 1: Escrever o teste (falhando)**

Em `app/api/activities/[id]/respond/route.test.ts`, o `beforeEach` já existente cria uma atividade pendente nova (`activityId`) antes de cada teste — basta inserir 9 atividades `concluida` direto no banco antes de responder essa décima. Adicionar como novo teste no `describe` existente:

```ts
  it("dado 9 atividades ja concluidas, quando a decima e respondida, entao a resposta inclui o selo atividades_10", async () => {
    await db.from("activities").insert(
      Array.from({ length: 9 }, () => ({
        user_id: TEST_USER_ID,
        tipo: "multiple_choice",
        dominio,
        nivel_cefr: nivelCefr,
        payload: {},
        status: "concluida",
      })),
    );

    const res = await POST(req({ resposta: 1 }), params(activityId));
    const body = await res.json();
    expect(body.newlyUnlocked.some((a: { chave: string }) => a.chave === "atividades_10")).toBe(true);
  });
```

(As 9 atividades extras são limpas junto com o resto via `on delete cascade` de `profiles` no `afterAll` já existente do arquivo — não precisa de limpeza própria.)

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- --run app/api/activities/[id]/respond/route.test.ts`
Expected: FAIL — `body.newlyUnlocked` é `undefined`.

- [ ] **Step 3: Implementar**

Em `app/api/activities/[id]/respond/route.ts`, adicionar `import { checkThresholds } from "@/lib/achievements/unlock";` e `import type { Achievement } from "@/lib/achievements/types";`, e substituir (linhas 61-73):

```ts
  // ponytail: assume que todos os itens de origem pertencem ao dominio da
  // atividade — vale enquanto so houver geradores de 1 item por atividade
  // (adaptar quando um gerador cobrir mais de um dominio por vez).
  for (const skillItemId of activity.fonte_skill_item_ids ?? []) {
    await recordPracticeResponse(db, {
      userId: getLocalUserId(),
      skillItemId,
      domain: activity.dominio as Domain,
      resultado: resultado.correta ? "conhecido" : "desconhecido",
    });
  }

  return NextResponse.json(resultado);
```

por:

```ts
  const newlyUnlocked: Achievement[] = [];
  // ponytail: assume que todos os itens de origem pertencem ao dominio da
  // atividade — vale enquanto so houver geradores de 1 item por atividade
  // (adaptar quando um gerador cobrir mais de um dominio por vez).
  for (const skillItemId of activity.fonte_skill_item_ids ?? []) {
    const registro = await recordPracticeResponse(db, {
      userId: getLocalUserId(),
      skillItemId,
      domain: activity.dominio as Domain,
      resultado: resultado.correta ? "conhecido" : "desconhecido",
    });
    newlyUnlocked.push(...registro.newlyUnlocked);
  }
  newlyUnlocked.push(...(await checkThresholds(db, getLocalUserId(), "atividades_respondidas")));

  return NextResponse.json({ ...resultado, newlyUnlocked });
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- --run app/api/activities/[id]/respond/route.test.ts`
Expected: PASS

- [ ] **Step 5: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add app/api/activities/[id]/respond/route.ts app/api/activities/[id]/respond/route.test.ts
git commit -m "feat(achievements): unlock atividades_10/50 and surface newlyUnlocked in respond route"
```

---

### Task 9: Mapa de ícones e animação do toast

**Files:**
- Create: `lib/achievements/icons.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `ACHIEVEMENT_ICONS: Record<string, LucideIcon>`.

- [ ] **Step 1: Criar o mapa de ícones**

```tsx
// lib/achievements/icons.tsx
import {
  Sparkles,
  BookOpen,
  Award,
  Trophy,
  CheckCircle2,
  MessageCircle,
  ClipboardCheck,
  Map,
  Hammer,
  Zap,
  Users,
  Flag,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  BookOpen,
  Award,
  Trophy,
  CheckCircle2,
  MessageCircle,
  ClipboardCheck,
  Map,
  Hammer,
  Zap,
  Users,
  Flag,
  PartyPopper,
};
```

- [ ] **Step 2: Adicionar a animação do toast em `app/globals.css`**

Adicionar depois do bloco `.postmark-in` existente (por volta da linha 144):

```css
/* Toast de selo desbloqueado: aparece no canto ao completar um flashcard ou
   atividade que cruza um marco — uma vez por selo, nao decoracao continua. */
@keyframes achievement-toast-in {
  from {
    transform: translateY(12px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.achievement-toast {
  animation: achievement-toast-in 260ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .achievement-toast {
    animation: none;
  }
}
```

- [ ] **Step 3: Verificar que o projeto builda**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/achievements/icons.tsx app/globals.css
git commit -m "feat(achievements): add icon map and toast animation"
```

---

### Task 10: Componente de celebração (`AchievementToast`)

**Files:**
- Create: `app/dashboard/_components/achievement-toast.tsx`

**Interfaces:**
- Consumes: `ACHIEVEMENT_ICONS` de `lib/achievements/icons.tsx` (Task 9).
- Produces: `AchievementToast({ achievements, onDone })`, `ToastAchievement` (type).

- [ ] **Step 1: Implementar**

```tsx
// app/dashboard/_components/achievement-toast.tsx
"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { ACHIEVEMENT_ICONS } from "@/lib/achievements/icons";

export interface ToastAchievement {
  chave: string;
  titulo: string;
  icone: string;
}

export function AchievementToast({
  achievements,
  onDone,
}: {
  achievements: ToastAchievement[];
  onDone: () => void;
}) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    setIndice(0);
  }, [achievements]);

  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = window.setTimeout(() => {
      if (indice + 1 < achievements.length) setIndice((i) => i + 1);
      else onDone();
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [achievements, indice, onDone]);

  if (achievements.length === 0) return null;
  const atual = achievements[indice];
  const Icone = ACHIEVEMENT_ICONS[atual.icone] ?? Lock;

  return (
    <div
      role="status"
      className="achievement-toast fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-line bg-paper px-4 py-3 shadow-[var(--shadow)]"
    >
      <div
        className="postmark stamp-pop"
        data-filled
        data-tone="stamp"
        style={{ "--size": "2.5rem" } as React.CSSProperties}
      >
        <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div>
        <p className="text-[0.65rem] uppercase tracking-wide text-ink-soft">Selo desbloqueado</p>
        <p className="font-medium">{atual.titulo}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que o projeto builda**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/_components/achievement-toast.tsx
git commit -m "feat(achievements): add AchievementToast component"
```

---

### Task 11: Ligar o toast em FlashcardDeck e ActivityCard

**Files:**
- Modify: `app/dashboard/flashcards/flashcard-deck.tsx`
- Modify: `app/dashboard/atividades/activity-card.tsx`

**Interfaces:**
- Consumes: `AchievementToast`/`ToastAchievement` de `app/dashboard/_components/achievement-toast.tsx` (Task 10); campo `newlyUnlocked` das respostas das rotas (Tasks 7 e 8).

- [ ] **Step 1: `FlashcardDeck` — ler a resposta da rota e mostrar o toast**

Em `app/dashboard/flashcards/flashcard-deck.tsx`, adicionar o import:

```ts
import { AchievementToast, type ToastAchievement } from "../_components/achievement-toast";
```

Adicionar estado (junto aos outros `useState` do componente):

```ts
  const [newlyUnlocked, setNewlyUnlocked] = useState<ToastAchievement[]>([]);
```

Substituir a função `responder` (o fetch hoje é fire-and-forget — passa a aguardar a resposta pra ler `newlyUnlocked`; isso adia o início da animação de saída do cartão pelo tempo da requisição, que é local/rápida):

```ts
  async function responder(escolha: Resultado) {
    if (respondendo) return;
    setResultado(escolha);
    try {
      const res = await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill_item_id: atual.skillItemId, resultado: escolha }),
      });
      const data = await res.json();
      if (data.newlyUnlocked?.length > 0) {
        setNewlyUnlocked((prev) => [...prev, ...data.newlyUnlocked]);
      }
    } catch {
      // silencioso: a revisao em si ja foi tentada, um selo perdido aqui
      // nao deve travar a experiencia do flashcard.
    }

    window.setTimeout(() => setSaindo(true), 420);
    window.setTimeout(() => {
      setFila((prev) => prev.slice(1));
      setVirado(false);
      setResultado(null);
      setSaindo(false);
    }, 620);
  }
```

No final do JSX retornado pelo componente, substituir:

```tsx
        )}
      </div>
    </div>
  );
}
```

por:

```tsx
        )}
      </div>

      <AchievementToast achievements={newlyUnlocked} onDone={() => setNewlyUnlocked([])} />
    </div>
  );
}
```

- [ ] **Step 2: `ActivityCard` — mostrar o toast**

Em `app/dashboard/atividades/activity-card.tsx`, adicionar o import e o estado:

```ts
import { AchievementToast, type ToastAchievement } from "../_components/achievement-toast";
```

```ts
  const [newlyUnlocked, setNewlyUnlocked] = useState<ToastAchievement[]>([]);
```

Na função `responder`, depois de `const data = await res.json();`:

```ts
      const data = await res.json();
      setResultado(data.correta ? "correta" : "errada");
      if (data.newlyUnlocked?.length > 0) {
        setNewlyUnlocked((prev) => [...prev, ...data.newlyUnlocked]);
      }
```

No final do JSX retornado pelo componente, substituir:

```tsx
      {resultado && (
        <p
          className={`quiet-card mt-4 px-3 py-2 text-sm ${resultado === "correta" ? "text-correction" : "text-stamp"}`}
        >
          {resultado === "correta" ? "Certo!" : "Não foi dessa vez."}
        </p>
      )}
    </div>
  );
}
```

por:

```tsx
      {resultado && (
        <p
          className={`quiet-card mt-4 px-3 py-2 text-sm ${resultado === "correta" ? "text-correction" : "text-stamp"}`}
        >
          {resultado === "correta" ? "Certo!" : "Não foi dessa vez."}
        </p>
      )}

      <AchievementToast achievements={newlyUnlocked} onDone={() => setNewlyUnlocked([])} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar que o projeto builda**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 4: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam (nenhum teste destes dois componentes existe hoje — mudança validada por build + verificação manual na Task 12).

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/flashcards/flashcard-deck.tsx app/dashboard/atividades/activity-card.tsx
git commit -m "feat(achievements): show celebration toast on flashcard/activity unlock"
```

---

### Task 12: Página `/dashboard/conquistas` e item de menu

**Files:**
- Create: `app/dashboard/conquistas/page.tsx`
- Modify: `app/dashboard/_components/dashboard-header.tsx`

**Interfaces:**
- Consumes: `CONTADORES` (Task 2), `ACHIEVEMENT_ICONS` (Task 9), `Achievement`/`Metrica` (Task 2), `getHeaderData` (já existente).

- [ ] **Step 1: Adicionar o item de menu**

Em `app/dashboard/_components/dashboard-header.tsx`, adicionar `Medal` ao import de `lucide-react` (linha 3) e uma entrada em `NAV_ITEMS` (linha 9-17), depois de `"/dashboard/vocabulario"` e antes de `"/dashboard/plano"`:

```ts
  { href: "/dashboard/conquistas", label: "Conquistas", Icon: Medal },
```

- [ ] **Step 2: Criar a página**

```tsx
// app/dashboard/conquistas/page.tsx
import { Lock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getLocalUserId } from "@/lib/mcp/shared";
import { getHeaderData } from "@/lib/profile/header-data";
import { CONTADORES } from "@/lib/achievements/progress";
import { ACHIEVEMENT_ICONS } from "@/lib/achievements/icons";
import type { Achievement, Metrica } from "@/lib/achievements/types";
import { DashboardHeader } from "../_components/dashboard-header";
import { DashboardSection } from "../_components/dashboard-section";

export const dynamic = "force-dynamic";

const CATEGORIA_LABEL: Record<string, string> = {
  vocabulario: "Vocabulário",
  primeira_vez: "Primeiras vezes",
  consistencia: "Consistência",
};

const NOVO_LIMITE_MS = 48 * 60 * 60 * 1000;

export default async function ConquistasPage() {
  const db = supabaseAdmin();
  const userId = getLocalUserId();

  const [{ data: achievements }, { data: desbloqueadas }, headerData] = await Promise.all([
    db.from("achievements").select("*").order("categoria").order("ordem"),
    db.from("user_achievements").select("achievement_chave, desbloqueado_em").eq("user_id", userId),
    getHeaderData(db),
  ]);

  const desbloqueadaPorChave = new Map(
    (desbloqueadas ?? []).map((d) => [d.achievement_chave, d.desbloqueado_em as string]),
  );

  const metricas: Metrica[] = ["vocabulario_dominado", "atividades_respondidas", "conversas_concluidas"];
  const contagensPorMetrica = Object.fromEntries(
    await Promise.all(metricas.map(async (m) => [m, await CONTADORES[m](db, userId)] as const)),
  ) as Record<Metrica, number>;

  const porCategoria = new Map<string, Achievement[]>();
  for (const a of (achievements ?? []) as Achievement[]) {
    const lista = porCategoria.get(a.categoria) ?? [];
    lista.push(a);
    porCategoria.set(a.categoria, lista);
  }

  const agora = Date.now();

  return (
    <>
      <DashboardHeader current="/dashboard/conquistas" {...headerData} />

      <main className="mx-auto max-w-4xl flex-1 px-6 py-16">
        <p className="page-kicker">Marcos da sua jornada</p>
        <h1 className="font-display text-3xl">Conquistas</h1>
        <p className="mt-4 max-w-lg text-ink-soft">
          Selos desbloqueados conforme você estuda — cada idioma tem sua própria coleção.
        </p>

        {[...porCategoria.entries()].map(([categoria, lista]) => (
          <DashboardSection key={categoria} label={CATEGORIA_LABEL[categoria] ?? categoria} className="mt-10">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {lista.map((a) => {
                const desbloqueadoEm = desbloqueadaPorChave.get(a.chave);
                const desbloqueado = Boolean(desbloqueadoEm);
                const novo =
                  desbloqueado && agora - new Date(desbloqueadoEm!).getTime() < NOVO_LIMITE_MS;
                const Icone = ACHIEVEMENT_ICONS[a.icone] ?? Lock;
                const progresso =
                  a.limite !== null && a.metrica !== null ? contagensPorMetrica[a.metrica] : null;

                return (
                  <div key={a.chave} className="flex flex-col items-center gap-2 text-center">
                    <div className="relative">
                      <div
                        className="postmark"
                        data-filled={desbloqueado}
                        data-tone={desbloqueado ? "stamp" : undefined}
                        style={{ "--size": "3.5rem" } as React.CSSProperties}
                      >
                        {desbloqueado ? (
                          <Icone size={22} strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <Lock size={18} strokeWidth={1.75} aria-hidden="true" />
                        )}
                      </div>
                      {novo && (
                        <span className="envelope-tag absolute -right-2 -top-2 px-1.5 py-0.5 text-[0.6rem]">
                          novo
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{a.titulo}</p>
                    <p className="text-xs text-ink-soft">{a.descricao}</p>
                    {!desbloqueado && progresso !== null && (
                      <p className="font-mono text-xs text-ink-soft">
                        {progresso}/{a.limite}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </DashboardSection>
        ))}
      </main>
    </>
  );
}
```

- [ ] **Step 3: Verificar tipo/lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 4: Rodar a suite inteira**

Run: `npm test -- --run`
Expected: todos os testes passam.

- [ ] **Step 5: `npm run build`**

Run: `npm run build`
Expected: build passa, `/dashboard/conquistas` aparece na tabela de rotas como `ƒ` (dinâmica).

- [ ] **Step 6: Verificação manual no navegador**

Subir `npm run dev`, abrir `/dashboard/conquistas` — conferir que os 13 selos aparecem agrupados por categoria, os já desbloqueados (se houver, do uso real do app) aparecem carimbados, os bloqueados mostram cadeado e progresso quando aplicável. Abrir `/dashboard/flashcards`, revisar um cartão, conferir no console (`list_console_messages`) que não há erro e, se a revisão cruzar `primeiro_flashcard` ou um marco de vocabulário, o toast aparece no canto inferior direito.

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/conquistas/page.tsx app/dashboard/_components/dashboard-header.tsx
git commit -m "feat(achievements): add /dashboard/conquistas collection page and nav item"
```
