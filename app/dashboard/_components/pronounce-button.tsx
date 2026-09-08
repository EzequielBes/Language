"use client";

import { useState, useSyncExternalStore } from "react";
import { Volume2 } from "lucide-react";
import { localeParaIdioma } from "@/lib/speech/locale";

// Web Speech API (speechSynthesis), nativa do navegador — sem API paga, sem
// dependencia nova. So renderiza se o navegador suportar (feature detection;
// Safari/Firefox antigos e alguns navegadores mobile nao tem). O suporte
// nao muda em runtime, entao a "subscription" e um no-op — useSyncExternalStore
// aqui e so o jeito correto de ler uma capability do navegador sem descasar
// a hidratacao (server sempre "nao suporta", client le o valor real).
const semInscricao = () => () => {};
const temSpeechSynthesis = () => typeof window !== "undefined" && "speechSynthesis" in window;
const semSuporteNoServer = () => false;

export function PronounceButton({ texto, idioma }: { texto: string; idioma: string }) {
  const suportado = useSyncExternalStore(semInscricao, temSpeechSynthesis, semSuporteNoServer);
  const [falando, setFalando] = useState(false);

  if (!suportado) return null;

  function falar() {
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = localeParaIdioma(idioma);
    utterance.onstart = () => setFalando(true);
    utterance.onend = () => setFalando(false);
    utterance.onerror = () => setFalando(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button
      type="button"
      onClick={falar}
      aria-label={`Ouvir pronúncia: ${texto}`}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
    >
      <Volume2 size={15} strokeWidth={1.75} aria-hidden="true" className={falando ? "animate-pulse" : ""} />
    </button>
  );
}
