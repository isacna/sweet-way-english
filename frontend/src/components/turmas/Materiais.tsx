"use client";

import { FileText, Headphones, Link2, Search, Trash2, Video, type LucideIcon } from "lucide-react";
import { AssetPreview } from "@/components/AssetPreview";
import { classeCampo } from "@/components/painel/ui";
import { ehArquivoPrivado } from "@/lib/arquivos";
import { tempoRelativoPt } from "@/lib/timePt";
import type { Material } from "./tipos";

export const TIPOS_MATERIAL: { valor: string; rotulo: string; Icone: LucideIcon; tom: string }[] = [
  { valor: "pdf", rotulo: "PDF / documento", Icone: FileText, tom: "bg-danger-soft text-danger-ink" },
  { valor: "audio", rotulo: "Áudio", Icone: Headphones, tom: "bg-sky-soft text-sky-ink" },
  { valor: "video", rotulo: "Vídeo", Icone: Video, tom: "bg-candy-soft text-candy" },
  { valor: "link", rotulo: "Link", Icone: Link2, tom: "bg-accent-soft text-accent" },
];

function infoTipo(tipo: string) {
  return TIPOS_MATERIAL.find((t) => t.valor === tipo) ?? TIPOS_MATERIAL[0];
}

function tamanhoLegivel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Busca + chips de tipo, usados nas duas listas de materiais. */
export function FiltrosMateriais({
  busca,
  onBusca,
  tipo,
  onTipo,
  idBusca,
}: {
  busca: string;
  onBusca: (v: string) => void;
  tipo: string;
  onTipo: (v: string) => void;
  idBusca: string;
}) {
  const opcoes = [{ valor: "", rotulo: "Todos" }, ...TIPOS_MATERIAL.map((t) => ({ valor: t.valor, rotulo: t.rotulo.split(" ")[0] }))];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <label htmlFor={idBusca} className="sr-only">
          Buscar materiais
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint" />
        <input
          id={idBusca}
          type="search"
          placeholder="Buscar pelo título…"
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          className={`${classeCampo} pl-10`}
        />
      </div>
      <div role="group" aria-label="Filtrar por tipo" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:pb-0 [scrollbar-width:none]">
        {opcoes.map((o) => {
          const ativo = tipo === o.valor;
          return (
            <button
              key={o.valor || "todos"}
              type="button"
              aria-pressed={ativo}
              onClick={() => onTipo(o.valor)}
              className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
                ativo ? "bg-accent text-white shadow-sm" : "border border-line-strong bg-card text-ink-soft hover:bg-gray-50 hover:text-ink"
              }`}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Um material: ícone do tipo, título, data, abrir/baixar, prévia e (professora) excluir. */
export function ItemMaterial({ material, onExcluir }: { material: Material; onExcluir?: () => void }) {
  const { Icone, tom, rotulo } = infoTipo(material.tipo);
  const privado = ehArquivoPrivado(material.urlArquivo);
  const detalhe = privado
    ? [material.arquivo?.nomeOriginal, material.arquivo ? tamanhoLegivel(material.arquivo.tamanho) : null].filter(Boolean).join(" · ")
    : material.urlArquivo.replace(/^https?:\/\//, "");
  return (
    <li id={`material-${material.id}`} className="card scroll-mt-28 p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tom}`} aria-hidden>
          <Icone className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-semibold leading-snug text-ink">{material.titulo}</p>
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            {rotulo} · {tempoRelativoPt(material.criadoEm)}
            {detalhe && ` · ${detalhe}`}
          </p>
        </div>
        {onExcluir && (
          <button
            type="button"
            onClick={onExcluir}
            aria-label={`Excluir o material "${material.titulo}"`}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-danger-soft hover:text-danger-ink"
          >
            <Trash2 aria-hidden className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
      <AssetPreview
        url={material.urlArquivo}
        arquivo={material.arquivo}
        tipo={material.tipo}
        title={material.titulo}
        className="mt-3"
      />
    </li>
  );
}
