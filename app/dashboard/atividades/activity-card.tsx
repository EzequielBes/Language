"use client";

import { useState } from "react";

type Payload =
  | { pergunta: string; opcoes: string[] }
  | { antes: string; depois: string };

export interface Atividade {
  id: string;
  tipo: string;
  dominio: string | null;
  nivel: string | null;
  payload: Payload;
}

const DOMINIO_LABEL: Record<string, string> = {
  vocabulario: "Vocabulário",
  gramatica: "Gramática",
  expressao: "Expressão",
};

export function ActivityCard({ atividade }: { atividade: Atividade }) {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<"correta" | "errada" | null>(null);
  const [texto, setTexto] = useState("");

  async function responder(resposta: number | string) {
    if (resultado || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`/api/activities/${atividade.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resposta }),
      });
      const data = await res.json();
      setResultado(data.correta ? "correta" : "errada");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="paper-card p-5 sm:p-6">
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

      {"opcoes" in atividade.payload ? (
        <>
          <p className="mt-4 font-display text-lg">{atividade.payload.pergunta}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {atividade.payload.opcoes.map((opcao, indice) => (
              <button
                key={opcao}
                type="button"
                disabled={enviando || resultado !== null}
                onClick={() => responder(indice)}
                className="w-full rounded-lg border border-line bg-paper px-4 py-2.5 text-left text-sm transition-colors hover:border-ink hover:bg-paper-shade disabled:opacity-60"
              >
                {opcao}
              </button>
            ))}
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            responder(texto);
          }}
        >
          <p className="mt-4 font-display text-lg">
            {atividade.payload.antes}
            <span className="mx-1 border-b border-ink px-2">___</span>
            {atividade.payload.depois}
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              id={`cloze-resposta-${atividade.id}`}
              name="resposta"
              aria-label="Sua resposta"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={enviando || resultado !== null}
              autoComplete="off"
              className="field-control flex-1 disabled:opacity-60"
              placeholder="complete a lacuna"
            />
            <button
              type="submit"
              disabled={enviando || resultado !== null || texto.trim() === ""}
              className="button-primary px-4 py-2 disabled:opacity-50"
            >
              Responder
            </button>
          </div>
        </form>
      )}

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
