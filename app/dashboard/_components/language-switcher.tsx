"use client";

import { useRef } from "react";

const IDIOMA_LABEL: Record<string, string> = {
  en: "Inglês",
  ja: "Japonês",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
  it: "Italiano",
};

function rotulo(idioma: string): string {
  return IDIOMA_LABEL[idioma] ?? idioma.toUpperCase();
}

export function LanguageSwitcher({
  idiomas,
  ativo,
  switchAction,
  criarAction,
}: {
  idiomas: string[];
  ativo: string;
  switchAction: (formData: FormData) => void;
  criarAction: (formData: FormData) => void;
}) {
  const switchFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex items-center gap-2 text-sm">
      <form ref={switchFormRef} action={switchAction}>
        <select
          name="idioma"
          defaultValue={ativo}
          onChange={() => switchFormRef.current?.requestSubmit()}
          aria-label="Idioma ativo"
          className="field-control py-1 text-xs text-ink-soft"
        >
          {idiomas.map((idioma) => (
            <option key={idioma} value={idioma}>
              {rotulo(idioma)}
            </option>
          ))}
        </select>
      </form>

      <form action={criarAction} className="flex items-center gap-1">
        <input
          type="text"
          name="novo_idioma"
          aria-label="Código do novo idioma"
          placeholder="novo (ex: ja)"
          maxLength={3}
          className="field-control w-24 py-1 text-xs text-ink-soft placeholder:text-ink-soft/60"
        />
        <button
          type="submit"
          aria-label="Adicionar idioma"
          className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:border-ink hover:text-ink"
        >
          +
        </button>
      </form>
    </div>
  );
}
