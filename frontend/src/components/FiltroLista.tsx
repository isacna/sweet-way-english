type OpcaoFiltro = { valor: string; rotulo: string };

export type ConfigFiltro = {
  id: string;
  label: string;
  opcoes: OpcaoFiltro[];
  valor: string;
  onChange: (v: string) => void;
  /** Texto da opção "sem filtro". Default: "Todas" */
  placeholder?: string;
};

type FiltroListaProps = {
  busca: string;
  onBuscaChange: (v: string) => void;
  /** Placeholder do campo de busca. Default: "Buscar…" */
  placeholderBusca?: string;
  /** Dropdowns de filtro adicionais */
  filtros?: ConfigFiltro[];
  /** Quantidade total de itens (sem filtro) */
  total?: number;
  /** Quantidade de itens depois do filtro */
  totalFiltrado?: number;
};

export function FiltroLista({
  busca,
  onBuscaChange,
  placeholderBusca = "Buscar…",
  filtros = [],
  total,
  totalFiltrado,
}: FiltroListaProps) {
  const temFiltroAtivo =
    busca.trim() !== "" || filtros.some((f) => f.valor !== "");

  function limparTudo() {
    onBuscaChange("");
    filtros.forEach((f) => f.onChange(""));
  }

  const mostrarContagem =
    total !== undefined &&
    totalFiltrado !== undefined &&
    temFiltroAtivo &&
    totalFiltrado !== total;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Campo de busca */}
      <div className="relative flex-1 min-w-48">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          placeholder={placeholderBusca}
          aria-label={placeholderBusca}
          className="min-h-[44px] w-full pl-9 pr-4 py-2.5 rounded-xl border border-line-strong bg-card text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
        />
      </div>

      {/* Dropdowns de filtro */}
      {filtros.map((f) => (
        <select
          key={f.id}
          id={f.id}
          value={f.valor}
          onChange={(e) => f.onChange(e.target.value)}
          aria-label={f.label}
          className="min-h-[44px] py-2.5 pl-3 pr-8 rounded-xl border border-line-strong bg-card text-sm text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent "
        >
          <option value="">{f.placeholder ?? `Todas as ${f.label.toLowerCase()}`}</option>
          {f.opcoes.map((op) => (
            <option key={op.valor} value={op.valor}>
              {op.rotulo}
            </option>
          ))}
        </select>
      ))}

      {/* Contagem + limpar */}
      {temFiltroAtivo && (
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          {mostrarContagem && (
            <span>
              {totalFiltrado} de {total}
            </span>
          )}
          <button
            type="button"
            onClick={limparTudo}
            className="min-h-[44px] rounded-lg px-2 text-accent hover:bg-accent-soft font-semibold whitespace-nowrap"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}
