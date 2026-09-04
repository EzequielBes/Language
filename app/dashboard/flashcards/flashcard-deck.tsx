"use client";

import { useState } from "react";

export interface Flashcard {
  skillItemId: string;
  texto: string;
  dominio: string;
  nivel: string;
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

export function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [fila, setFila] = useState(cards);
  const [virado, setVirado] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [saindo, setSaindo] = useState(false);

  if (fila.length === 0) {
    return (
      <p className="mt-8 text-ink-soft">
        Nenhum cartão pendente agora. Eles aparecem aqui depois que você
        conversa com o Claude ou faz uma avaliação de nível.
      </p>
    );
  }

  const atual = fila[0];
  const respondendo = resultado !== null;

  async function responder(escolha: Resultado) {
    if (respondendo) return;
    setResultado(escolha);
    fetch("/api/flashcards/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill_item_id: atual.skillItemId, resultado: escolha }),
    }).catch(() => {});

    window.setTimeout(() => setSaindo(true), 420);
    window.setTimeout(() => {
      setFila((prev) => prev.slice(1));
      setVirado(false);
      setResultado(null);
      setSaindo(false);
    }, 620);
  }

  return (
    <div className="mt-8">
      <p className="text-xs text-ink-soft">{fila.length} restantes</p>

      <div
        className={`mt-4 transition-opacity duration-200 motion-reduce:transition-none ${
          saindo ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="[perspective:1200px]">
          <button
            type="button"
            onClick={() => !respondendo && setVirado((v) => !v)}
            disabled={respondendo}
            className="relative h-56 w-full text-left [transform-style:preserve-3d] transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: virado ? "rotateY(180deg)" : "rotateY(0deg)" }}
          >
            {/* frente: o item a lembrar */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 border border-line bg-paper-shade p-8 text-center [backface-visibility:hidden]">
              <p className="font-display text-2xl">{atual.texto}</p>
              <p className="text-xs text-ink-soft">lembrou? toque para avaliar</p>
            </div>

            {/* verso: avaliação */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-line bg-paper-shade p-8 text-center [backface-visibility:hidden]"
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
                className={`flex-1 border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
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
    </div>
  );
}
