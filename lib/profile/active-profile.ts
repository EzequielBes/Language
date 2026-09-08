import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// MCP (processo stdio, iniciado pelo Claude Desktop) e o dashboard (processo
// Next.js) sao processos separados sem estado em comum — trocar de idioma
// ativo precisa valer pros dois sem reiniciar nenhum, daí a persistencia num
// arquivo local simples em vez de uma variavel em memoria.
// join() em vez de `new URL(relativo, import.meta.url)`: o Turbopack trata
// esse segundo padrao como referencia de import estatico e falha o build
// tentando resolver ".local-profile.json" como modulo.
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_PATH = join(projectRoot, ".local-profile.json");

export const DEFAULT_LANGUAGE = "en";
export const IDIOMA_RE = /^[a-z]{2,3}$/;

function readState(): { activeLanguage: string } {
  if (!existsSync(STATE_PATH)) return { activeLanguage: DEFAULT_LANGUAGE };
  try {
    const parsed = JSON.parse(readFileSync(STATE_PATH, "utf-8"));
    return { activeLanguage: parsed.activeLanguage ?? DEFAULT_LANGUAGE };
  } catch {
    return { activeLanguage: DEFAULT_LANGUAGE };
  }
}

export function getActiveLanguage(): string {
  return readState().activeLanguage;
}

export function setActiveLanguage(idioma: string): void {
  writeFileSync(STATE_PATH, JSON.stringify({ activeLanguage: idioma }));
}

// "local" (sem sufixo) e mantido como alias do perfil em ingles, pra nao
// orfanizar o profile real que ja existe no Supabase de antes do multi-idioma.
export function userIdForLanguage(idioma: string): string {
  return idioma === DEFAULT_LANGUAGE ? "local" : `local:${idioma}`;
}

export function getLocalUserId(): string {
  return userIdForLanguage(getActiveLanguage());
}
