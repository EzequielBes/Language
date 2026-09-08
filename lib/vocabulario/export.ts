export interface VocabularioItem {
  texto: string;
  dominio: string;
  nivel: string;
  definicao: string | null;
}

const CABECALHO = ["Texto", "Domínio", "Nível", "Definição"];

function campoCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function itensParaCsv(itens: VocabularioItem[]): string {
  const linhas = [CABECALHO.join(",")];
  for (const item of itens) {
    linhas.push(
      [item.texto, item.dominio, item.nivel, item.definicao ?? ""].map(campoCsv).join(","),
    );
  }
  return linhas.join("\n");
}
