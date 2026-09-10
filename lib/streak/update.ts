import type { supabaseAdmin } from "@/lib/supabase/server";

type Db = ReturnType<typeof supabaseAdmin>;

const FREEZE_MAXIMO = 2;
const DIAS_POR_FREEZE = 7;

function hojeISO(): string {
  return new Date().toLocaleDateString("en-CA");
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
