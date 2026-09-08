"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

export function CopyPrompt({ prompt }: { prompt: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      // clipboard indisponivel (ex: contexto nao-seguro) — o texto ja fica
      // visivel abaixo pra copiar manualmente.
    }
  }

  return (
    <div className="quiet-card mt-2 flex items-start gap-2 px-3 py-2.5 text-xs text-ink-soft">
      <Mail size={13} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" />
      <p className="flex-1">
        Precisa do Claude Desktop aberto — cole: <span className="text-ink">&ldquo;{prompt}&rdquo;</span>
      </p>
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-md border border-line bg-paper px-2 py-0.5 text-ink-soft hover:border-ink hover:text-ink"
      >
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
