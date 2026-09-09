"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";
import { INTERVALOS_DIAS } from "@/lib/assessment/spaced-repetition";
import { PronounceButton } from "../_components/pronounce-button";
import { AchievementToast, type ToastAchievement } from "../_components/achievement-toast";

export interface Flashcard {
  skillItemId: string;
  texto: string;
  dominio: string;
  nivel: string;
  definicao: string | null;
  status: "aprendendo" | "desconhecido";
  streak: number;
}

type Resultado = "conhecido" | "parcial" | "desconhecido";

const DOMINIO_LABEL: Record<string, string> = {
  vocabulario: "Vocabulário",
  gramatica: "Gramática",
  expressao: "Expressão",
};

const RESULTADO_LABEL: Record<Resultado, string> = {
  conhecido: "Sei",
  parcial: "Mais ou menos",
  desconhecido: "Não sei",
};

const RESULTADO_TONE: Record<Resultado, string> = {
  conhecido: "correction",
  parcial: "",
  desconhecido: "stamp",
};

function legendaHistorico(card: Flashcard): string {
  if (card.status === "desconhecido" && card.streak === 0) {
    return "Primeira vez revisando este item.";
  }
  if (card.streak > 0) {
    return `Você acertou ${card.streak}x seguida${card.streak > 1 ? "s" : ""} — mais um acerto e sobe de nível.`;
  }
  return "Você já viu isso antes, mas ainda não firmou.";
}

export function FlashcardDeck({ cards, idioma }: { cards: Flashcard[]; idioma: string }) {
  const [total] = useState(cards.length);
  const [fila, setFila] = useState(cards);
  const [virado, setVirado] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<ToastAchievement[]>([]);

  if (fila.length === 0) {
    return (
      <div className="paper-card mt-8 flex flex-col items-center gap-3 px-8 py-12 text-center">
        <PartyPopper size={28} strokeWidth={1.5} className="text-stamp" aria-hidden="true" />
        <p className="text-ink-soft">
          Nenhum cartão pendente agora. Eles aparecem aqui depois que você
          conversa com o Claude ou faz uma avaliação de nível.
        </p>
      </div>
    );
  }

  const atual = fila[0];
  const respondendo = resultado !== null;

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

  const feitos = total - fila.length;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>{fila.length} restantes</span>
        <span className="font-mono">
          {feitos}/{total}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-airmail transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${total > 0 ? (feitos / total) * 100 : 0}%` }}
        />
      </div>

      <div
        className={`mt-4 transition-[opacity,transform] duration-200 ease-in motion-reduce:transition-none ${
          saindo ? "-translate-x-6 opacity-0" : "translate-x-0 opacity-100"
        }`}
      >
        <div className="relative [perspective:1200px]">
          <div className="absolute right-3 top-3 z-10">
            <PronounceButton texto={atual.texto} idioma={idioma} />
          </div>
          <button
            type="button"
            onClick={() => !respondendo && setVirado((v) => !v)}
            disabled={respondendo}
            className="relative h-56 w-full rounded-2xl text-left [transform-style:preserve-3d] transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: virado ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* frente: o item a lembrar */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-paper-shade p-8 text-center shadow-[var(--shadow)] [backface-visibility:hidden]">
              <p className="font-display text-2xl">{atual.texto}</p>
              <p className="text-xs text-ink-soft">lembrou? toque para avaliar</p>
            </div>

            {/* verso: avaliação */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-paper-shade p-8 text-center shadow-[var(--shadow)] [backface-visibility:hidden]"
              style={{ transform: "rotateY(180deg)" }}
            >
              <div className="flex items-center gap-3">
                <span className="envelope-tag">{DOMINIO_LABEL[atual.dominio] ?? atual.dominio}</span>
                <div
                  className={`postmark ${resultado ? "stamp-pop" : ""}`}
                  data-filled={Boolean(resultado)}
                  data-tone={resultado ? RESULTADO_TONE[resultado] : undefined}
                >
                  {atual.nivel}
                </div>
              </div>
              {atual.definicao && (
                <p className="max-w-xs text-sm italic text-ink">{atual.definicao}</p>
              )}
              <div className="flex gap-1" aria-hidden="true">
                {INTERVALOS_DIAS.map((_, indice) => (
                  <span
                    key={indice}
                    className={`h-1.5 w-4 ${indice < atual.streak ? "bg-correction" : "bg-line"}`}
                  />
                ))}
              </div>
              <p className="max-w-xs text-xs text-ink-soft">{legendaHistorico(atual)}</p>
            </div>
          </button>
        </div>

        {virado && (
          <div className="mt-4 flex gap-3">
            {(["conhecido", "parcial", "desconhecido"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                disabled={respondendo}
                onClick={() => responder(opcao)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
                  opcao === "conhecido"
                    ? "border-correction text-correction hover:bg-correction hover:text-paper"
                    : opcao === "desconhecido"
                      ? "border-stamp text-stamp hover:bg-stamp hover:text-paper"
                      : "border-line text-ink-soft hover:border-ink hover:text-ink"
                } ${resultado === opcao ? "bg-ink text-paper" : ""}`}
              >
                {RESULTADO_LABEL[opcao]}
              </button>
            ))}
          </div>
        )}
      </div>

      <AchievementToast achievements={newlyUnlocked} onDone={() => setNewlyUnlocked([])} />
    </div>
  );
}
