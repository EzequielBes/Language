export type Domain = "vocabulario" | "gramatica" | "expressao";
export type ItemStatus = "conhecido" | "desconhecido" | "parcial";

export interface DomainState {
  nivel: number;
  acertos_seguidos: number;
  erros_seguidos: number;
  respondidos: number;
  ultima_mudanca_em: number;
}

export type AdaptiveState = Record<Domain, DomainState>;

export const NIVEL_MIN = 1; // A1
export const NIVEL_MAX = 6; // C2
export const MIN_RESPOSTAS_POR_DOMINIO = 6;
export const TETO_ITENS_SESSAO = 24;

const DOMINIOS: Domain[] = ["vocabulario", "gramatica", "expressao"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function seedState(nivelAutodeclarado: number): AdaptiveState {
  const nivel = clamp(nivelAutodeclarado, NIVEL_MIN, NIVEL_MAX);
  return DOMINIOS.reduce((acc, domain) => {
    acc[domain] = {
      nivel,
      acertos_seguidos: 0,
      erros_seguidos: 0,
      respondidos: 0,
      ultima_mudanca_em: 0,
    };
    return acc;
  }, {} as AdaptiveState);
}

export function applyResponse(
  state: AdaptiveState,
  domain: Domain,
  status: ItemStatus,
): AdaptiveState {
  const atual = state[domain];
  const respondidos = atual.respondidos + 1;
  let nivel = atual.nivel;
  let acertos_seguidos = atual.acertos_seguidos;
  let erros_seguidos = atual.erros_seguidos;
  let mudou = false;

  if (status === "conhecido") {
    acertos_seguidos += 1;
    erros_seguidos = 0;
    if (acertos_seguidos >= 2 && nivel < NIVEL_MAX) {
      nivel += 1;
      acertos_seguidos = 0;
      mudou = true;
    }
  } else if (status === "desconhecido") {
    erros_seguidos += 1;
    acertos_seguidos = 0;
    if (erros_seguidos >= 2 && nivel > NIVEL_MIN) {
      nivel -= 1;
      erros_seguidos = 0;
      mudou = true;
    }
  } else {
    acertos_seguidos = 0;
    erros_seguidos = 0;
  }

  return {
    ...state,
    [domain]: {
      nivel,
      acertos_seguidos,
      erros_seguidos,
      respondidos,
      ultima_mudanca_em: mudou ? respondidos : atual.ultima_mudanca_em,
    },
  };
}

/** Domínio com menos respostas na sessão vai primeiro (round-robin). */
export function proximoDominio(state: AdaptiveState): Domain {
  return DOMINIOS.reduce((menor, d) =>
    state[d].respondidos < state[menor].respondidos ? d : menor,
  );
}

export function sessaoCompleta(
  state: AdaptiveState,
  totalRespondidos: number,
): boolean {
  if (totalRespondidos >= TETO_ITENS_SESSAO) return true;
  return DOMINIOS.every((d) => {
    const ds = state[d];
    return (
      ds.respondidos >= MIN_RESPOSTAS_POR_DOMINIO &&
      ds.respondidos - ds.ultima_mudanca_em >= 2
    );
  });
}
