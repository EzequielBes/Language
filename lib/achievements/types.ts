export type Categoria = "vocabulario" | "primeira_vez" | "consistencia";
export type Metrica = "vocabulario_dominado" | "atividades_respondidas" | "conversas_concluidas";

export interface Achievement {
  chave: string;
  categoria: Categoria;
  metrica: Metrica | null;
  limite: number | null;
  titulo: string;
  descricao: string;
  icone: string;
  ordem: number;
}
