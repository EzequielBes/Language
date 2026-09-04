"use client";

import { useState } from "react";

export interface Atividade {
  id: string;
  dominio: string | null;
  nivel: string | null;
  payload: { pergunta: string; opcoes: string[] };
}

const DOMINIO_LABEL: Record<string, string> = {
  vocabulario: "Vocabulário",
  gramatica: "Gramática",
  expressao: "Expressão",
};

export function ActivityCard({ atividade }: { atividade: Atividade }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<"correta" | "errada" | null>(null);

  async function responder(indice: number) {
    if (resultado || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/activities/${atividade.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resposta: indice }),
      });
      const data = await res.json();
      setResultado(data.correta ? "correta" : "errada");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="border border-line bg-paper-shade p-6">
      <div className="flex items-center gap-3">
        {atividade.dominio && (
          <span className="envelope-tag">
            {DOMINIO_LABEL[atividade.dominio] ?? atividade.dominio}
          </span>
        )}
        {atividade.nivel && (
          <div className="postmark" style={{ "--size": "2rem" } as React.CSSProperties}>
            {atividade.nivel}
          </div>
        )}
      </div>

      <p className="mt-4 font-display text-lg">{atividade.payload.pergunta}</p>

      <div className="mt-4 space-y-2">
        {atividade.payload.opcoes.map((opcao, indice) => (
          <button
            key={opcao}
            type="button"
            disabled={enviando || resultado !== null}
            onClick={() => responder(indice)}
            className="block w-full border border-line px-4 py-2 text-left text-sm hover:border-ink disabled:opacity-60"
          >
            {opcao}
          </button>
        ))}
      </div>

      {resultado && (
        <p
          className={`mt-4 text-sm ${resultado === "correta" ? "text-correction" : "text-stamp"}`}
        >
          {resultado === "correta" ? "Certo!" : "Não foi dessa vez."}
        </p>
      )}
    </div>
  );
}
