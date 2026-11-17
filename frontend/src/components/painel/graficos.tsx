"use client";

/**
 * Gráficos pequenos do painel da professora, sem biblioteca: colunas de entregas por semana e
 * barras horizontais por situação. Só usam tokens, então valem no tema claro e no escuro.
 * Os números ficam sempre visíveis (nada depende de passar o mouse) e o leitor de tela recebe
 * uma tabela ou a própria lista. A animação de entrada some com "reduzir movimento" (globals.css).
 */

import { useEffect, useState } from "react";
import { Secao } from "@/components/painel/ui";
import type { StatusEntrega } from "@/components/turmas/tipos";

export type SemanaEntregas = {
  /** Segunda-feira da semana, "dd/mm". */
  rotulo: string;
  /** "dd/mm a dd/mm" (segunda a domingo). */
  periodo: string;
  total: number;
  atual: boolean;
};

export type ResumoEntregas = {
  /** Todas as entregas recebidas, de qualquer data. */
  total: number;
  /** Da semana mais antiga para a atual. */
  semanas: SemanaEntregas[];
  situacao: Record<StatusEntrega, number>;
};

const diaMes = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Segunda-feira, 00:00, no horário do navegador. */
function inicioDaSemana(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
}

const plural = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "entrega" : "entregas"}`;

/**
 * Conta as entregas por semana (as últimas `quantas`, começando na segunda-feira, horário local)
 * e por situação. Função pura: quem chama passa o `agora`.
 */
export function resumirEntregas(
  entregas: { dataEnvio: string; status: string }[],
  agora: Date,
  quantas = 8,
): ResumoEntregas {
  const base = inicioDaSemana(agora);
  const indice = new Map<number, number>();
  const semanas: SemanaEntregas[] = [];
  for (let i = quantas - 1; i >= 0; i--) {
    // Por dia do calendário (e não por 7 × 24h) para não escorregar na troca de horário de verão
    const inicio = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 7 * i);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
    indice.set(inicio.getTime(), semanas.length);
    semanas.push({ rotulo: diaMes(inicio), periodo: `${diaMes(inicio)} a ${diaMes(fim)}`, total: 0, atual: i === 0 });
  }

  const situacao: Record<StatusEntrega, number> = { pendente: 0, corrigido: 0, aprovado: 0, reprovado: 0 };
  for (const e of entregas) {
    if (e.status in situacao) situacao[e.status as StatusEntrega]++;
    const data = new Date(e.dataEnvio);
    if (Number.isNaN(data.getTime())) continue;
    const i = indice.get(inicioDaSemana(data).getTime());
    if (i !== undefined) semanas[i].total++;
  }
  return { total: entregas.length, semanas, situacao };
}

/** Liga as barras um quadro depois de montar, para elas crescerem a partir da base. */
function useEntrada() {
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const quadro = requestAnimationFrame(() => setPronto(true));
    return () => cancelAnimationFrame(quadro);
  }, []);
  return pronto;
}

// ─── Entregas por semana ─────────────────────────────────────────────────────

const ALTURA_COLUNA = 96; // px da coluna mais alta; o resto da área fica para o número em cima

export function GraficoEntregasSemana({ semanas, id = "entregas-semana" }: { semanas: SemanaEntregas[]; id?: string }) {
  const pronto = useEntrada();
  const [foco, setFoco] = useState<number | null>(null);
  const maior = Math.max(...semanas.map((s) => s.total), 0);
  const soma = semanas.reduce((acc, s) => acc + s.total, 0);
  const atual = semanas[semanas.length - 1];
  const anterior = semanas[semanas.length - 2];
  const emFoco = foco === null ? null : semanas[foco];

  return (
    <Secao id={id} titulo="Entregas por semana" descricao={`Recebidas nas últimas ${semanas.length} semanas, em todas as turmas.`}>
      {soma === 0 ? (
        <p className="text-sm text-ink-soft">Nenhuma entrega nas últimas {semanas.length} semanas.</p>
      ) : (
        <>
          {/* Leitura da semana atual; ao passar o mouse (ou tocar) em uma coluna, mostra o período dela */}
          <p className="mb-3 min-h-[1.25rem] text-sm text-ink-soft">
            {emFoco ? (
              <>
                <span className="font-semibold text-ink">{plural(emFoco.total)}</span> de {emFoco.periodo}
                {emFoco.atual && " (semana atual)"}
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">{plural(atual.total)}</span> na semana atual
                {anterior && <>, {anterior.total.toLocaleString("pt-BR")} na anterior</>}
              </>
            )}
          </p>

          <div aria-hidden className="flex" onPointerLeave={() => setFoco(null)}>
            {semanas.map((s, i) => {
              const altura = s.total === 0 ? 0 : Math.max(4, Math.round((s.total / maior) * ALTURA_COLUNA));
              return (
                <div key={s.rotulo} className="group flex min-w-0 flex-1 flex-col items-center" onPointerEnter={() => setFoco(i)}>
                  <div className="flex h-32 w-full flex-col items-center justify-end border-b border-line-strong px-0.5">
                    <span
                      className={`mb-1 text-xs leading-none ${
                        s.atual ? "font-semibold text-ink" : s.total === 0 ? "text-ink-faint" : "text-ink-soft"
                      }`}
                    >
                      {s.total.toLocaleString("pt-BR")}
                    </span>
                    <span
                      className={`block w-full max-w-6 rounded-t-[4px] transition-[height,background-color] duration-500 ease-out ${
                        s.atual ? "bg-accent" : "bg-gray-300 group-hover:bg-gray-400"
                      }`}
                      style={{ height: pronto ? altura : 0 }}
                    />
                  </div>
                  <span
                    className={`mt-1.5 whitespace-nowrap text-[11px] leading-none ${
                      s.atual ? "font-semibold text-ink" : "text-ink-faint"
                    }`}
                  >
                    {s.atual ? "atual" : s.rotulo}
                  </span>
                </div>
              );
            })}
          </div>

          <table className="sr-only">
            <caption>Entregas recebidas por semana (semanas começando na segunda-feira)</caption>
            <thead>
              <tr>
                <th scope="col">Semana</th>
                <th scope="col">Entregas</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => (
                <tr key={s.rotulo}>
                  <th scope="row">
                    {s.periodo}
                    {s.atual && " (semana atual)"}
                  </th>
                  <td>{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Secao>
  );
}

// ─── Situação das entregas ───────────────────────────────────────────────────

/**
 * Mesmas cores dos selos de entrega (status.ts). O verde é o `success-bright`: com o `success`
 * escuro, aprovada e reprovada ficam parecidas demais para quem tem daltonismo.
 */
const SITUACOES: { status: StatusEntrega; rotulo: string; cor: string }[] = [
  { status: "pendente", rotulo: "Aguardando correção", cor: "bg-sun" },
  { status: "corrigido", rotulo: "Corrigidas com nota", cor: "bg-accent" },
  { status: "aprovado", rotulo: "Aprovadas", cor: "bg-success-bright" },
  { status: "reprovado", rotulo: "Reprovadas", cor: "bg-danger" },
];

export function GraficoSituacaoEntregas({
  situacao,
  id = "situacao-entregas",
}: {
  situacao: Record<StatusEntrega, number>;
  id?: string;
}) {
  const pronto = useEntrada();
  const soma = SITUACOES.reduce((acc, s) => acc + situacao[s.status], 0);
  const maior = Math.max(...SITUACOES.map((s) => situacao[s.status]), 1);

  return (
    <Secao id={id} titulo="Situação das entregas" descricao={`${plural(soma)} até hoje, em todas as turmas.`}>
      <ul className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] gap-x-3 gap-y-4">
        {SITUACOES.map((s) => {
          const n = situacao[s.status];
          return (
            <li key={s.status} className="col-span-3 grid grid-cols-subgrid items-center">
              <span className="text-sm text-ink">{s.rotulo}</span>
              <span aria-hidden className="block h-2.5">
                {n > 0 && (
                  <span
                    className={`block h-full min-w-1 rounded-r-[4px] transition-[width] duration-500 ease-out ${s.cor}`}
                    style={{ width: pronto ? `${(n / maior) * 100}%` : 0 }}
                  />
                )}
              </span>
              <span className="text-right text-sm font-semibold tabular-nums text-ink">
                {n.toLocaleString("pt-BR")}
                <span className="ml-1.5 inline-block w-9 text-xs font-normal text-ink-faint">
                  {soma > 0 ? Math.round((n / soma) * 100) : 0}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Secao>
  );
}
