// Mapa dos codigos curtos de idioma usados no app (ver
// app/dashboard/_components/language-switcher.tsx) pro locale BCP-47 que o
// SpeechSynthesisUtterance espera. Codigo sem entrada no mapa usa ele mesmo
// como locale — o navegador ainda tenta casar por prefixo (ex: "pt" acha
// alguma voz "pt-*" instalada), so nao ha garantia de qual variante.
const IDIOMA_PARA_LOCALE: Record<string, string> = {
  en: "en-US",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
};

export function localeParaIdioma(idioma: string): string {
  const normalizado = idioma.trim().toLowerCase();
  return IDIOMA_PARA_LOCALE[normalizado] ?? normalizado;
}
