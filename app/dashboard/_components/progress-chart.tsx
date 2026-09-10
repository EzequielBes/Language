import { numberToCefr } from "@/lib/cefr";

export interface PontoProgressao {
  data: string;
  nivel_vocabulario: number;
  nivel_gramatica: number;
  nivel_expressao: number;
}

const LARGURA = 560;
const ALTURA = 180;
const PAD_ESQUERDA = 28;
const PAD_DIREITA = 8;
const PAD_TOPO = 8;
const PAD_BASE = 20;

const SERIES = [
  { chave: "nivel_vocabulario", cor: "var(--airmail)", rotulo: "Vocabulário" },
  { chave: "nivel_gramatica", cor: "var(--correction)", rotulo: "Gramática" },
  { chave: "nivel_expressao", cor: "var(--stamp)", rotulo: "Expressão" },
] as const;

function x(indice: number, total: number): number {
  if (total <= 1) return PAD_ESQUERDA;
  const larguraUtil = LARGURA - PAD_ESQUERDA - PAD_DIREITA;
  return PAD_ESQUERDA + (indice / (total - 1)) * larguraUtil;
}

function y(nivel: number): number {
  const alturaUtil = ALTURA - PAD_TOPO - PAD_BASE;
  return PAD_TOPO + (1 - (nivel - 1) / 5) * alturaUtil;
}

function formatarData(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export function ProgressChart({ historico }: { historico: PontoProgressao[] }) {
  if (historico.length < 2) {
    return <p className="text-ink-soft">Ainda sem histórico suficiente.</p>;
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        role="img"
        aria-label="Nível estimado por domínio ao longo do tempo"
      >
        {[1, 2, 3, 4, 5, 6].map((nivel) => (
          <g key={nivel}>
            <line
              x1={PAD_ESQUERDA}
              x2={LARGURA - PAD_DIREITA}
              y1={y(nivel)}
              y2={y(nivel)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text x={0} y={y(nivel) + 3} fontSize={9} fill="var(--ink-soft)">
              {numberToCefr(nivel)}
            </text>
          </g>
        ))}

        {SERIES.map((serie) => (
          <polyline
            key={serie.chave}
            fill="none"
            stroke={serie.cor}
            strokeWidth={2}
            points={historico
              .map((ponto, indice) => `${x(indice, historico.length)},${y(ponto[serie.chave])}`)
              .join(" ")}
          />
        ))}

        <text x={PAD_ESQUERDA} y={ALTURA - 4} fontSize={9} fill="var(--ink-soft)">
          {formatarData(historico[0].data)}
        </text>
        <text
          x={LARGURA - PAD_DIREITA}
          y={ALTURA - 4}
          fontSize={9}
          fill="var(--ink-soft)"
          textAnchor="end"
        >
          {formatarData(historico[historico.length - 1].data)}
        </text>
      </svg>

      <div className="mt-3 flex gap-4 text-xs text-ink-soft">
        {SERIES.map((serie) => (
          <span key={serie.chave} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: serie.cor }}
              aria-hidden="true"
            />
            {serie.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
