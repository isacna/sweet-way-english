"use client";

import { CalendarClock, FileWarning, Inbox, Paperclip, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AssetPreview } from "@/components/AssetPreview";
import { BarraProgresso } from "@/components/curso/ui";
import {
  CaixaMarcar,
  Campo,
  Carregando,
  classeArquivo,
  classeBotao,
  erroDaApi,
  Mensagem,
  RegiaoAoVivo,
  Selo,
  Vazio,
} from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";
import { isoToDatetimeLocalValue } from "@/lib/timePt";
import {
  ACEITA_ANEXO,
  CamposAtividade,
  corpoAtividade,
  validarAtividade,
  type ValoresAtividade,
} from "./CamposAtividade";
import { CartaoEntrega } from "./CartaoEntrega";
import { prazo } from "./status";
import type { AtividadeBase, Entrega } from "./tipos";

type Aluno = { id: number; nome: string; email: string };

function valoresDe(a: AtividadeBase): ValoresAtividade {
  return {
    titulo: a.titulo,
    descricao: a.descricao,
    dataEntrega: isoToDatetimeLocalValue(a.dataEntrega),
    arquivoObrigatorio: Boolean(a.arquivoObrigatorio),
    link: a.link ?? "",
  };
}

/** Formulário de edição (PATCH /professor/atividades/:id), com troca ou remoção do anexo. */
function EditarAtividade({ atividade, onSalva }: { atividade: AtividadeBase; onSalva: () => Promise<void> }) {
  const [valores, setValores] = useState<ValoresAtividade>(() => valoresDe(atividade));
  const [anexo, setAnexo] = useState<File | null>(null);
  const [removerAnexo, setRemoverAnexo] = useState(false);
  const [chaveArquivo, setChaveArquivo] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tom: "erro" | "sucesso"; texto: string } | null>(null);
  const prefixo = `editar-${atividade.id}`;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const problema = validarAtividade(valores);
    if (problema) {
      setMsg({ tom: "erro", texto: problema });
      return;
    }
    setSalvando(true);
    const res = await apiFetch(`/professor/atividades/${atividade.id}`, {
      method: "PATCH",
      body: corpoAtividade(valores, anexo, !anexo && removerAnexo ? { removerArquivo: true } : {}),
    }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) {
      setMsg({ tom: "erro", texto: await erroDaApi(res, "Não foi possível salvar a atividade.") });
      return;
    }
    setAnexo(null);
    setRemoverAnexo(false);
    setChaveArquivo((k) => k + 1);
    setMsg({ tom: "sucesso", texto: "Alterações salvas." });
    await onSalva();
  }

  return (
    <form onSubmit={salvar} className="space-y-4" noValidate>
      <CamposAtividade valores={valores} onChange={setValores} prefixo={prefixo} />
      <fieldset className="space-y-3 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Anexo da atividade</legend>
        {atividade.arquivoUrl ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-ink">
              <Paperclip aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />
              <span className="truncate">{atividade.arquivo?.nomeOriginal ?? "Arquivo anexado"}</span>
            </p>
            <AssetPreview url={atividade.arquivoUrl} arquivo={atividade.arquivo} title={`Anexo — ${atividade.titulo}`} />
            {!anexo && (
              <CaixaMarcar id={`${prefixo}-remover`} checked={removerAnexo} onChange={setRemoverAnexo}>
                Remover o anexo ao salvar
              </CaixaMarcar>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Nenhum anexo.</p>
        )}
        <Campo id={`${prefixo}-anexo`} rotulo={atividade.arquivoUrl ? "Substituir por outro arquivo" : "Anexar arquivo"} opcional>
          <input
            key={chaveArquivo}
            id={`${prefixo}-anexo`}
            type="file"
            accept={ACEITA_ANEXO}
            onChange={(e) => setAnexo(e.target.files?.[0] ?? null)}
            className={classeArquivo}
          />
        </Campo>
      </fieldset>
      <RegiaoAoVivo mensagem={msg} />
      <button type="submit" disabled={salvando} className={classeBotao("primario", "w-full sm:w-auto")}>
        {salvando ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}

/**
 * Detalhe de uma atividade na turma da professora: prazo, quem entregou, entregas para corrigir
 * (agrupadas por aluno, a mais recente em destaque) e edição.
 */
export function PainelAtividade({
  atividade,
  alunos,
  onAtividadeMudou,
}: {
  atividade: AtividadeBase;
  alunos: Aluno[];
  /** Recarrega a turma (depois de editar a atividade ou corrigir uma entrega). */
  onAtividadeMudou: () => Promise<void>;
}) {
  const [entregas, setEntregas] = useState<Entrega[] | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState<{ tom: "sucesso"; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setErro("");
    const res = await apiFetch(`/atividades/${atividade.id}/submissoes`).catch(() => null);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível carregar as entregas."));
      setEntregas([]);
      return;
    }
    setEntregas(await res.json());
  }, [atividade.id]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  // Agrupa por aluno: a entrega mais recente de cada um + as anteriores (a API já manda da mais nova à mais antiga)
  const grupos = useMemo(() => {
    const mapa = new Map<string, Entrega[]>();
    for (const e of entregas ?? []) {
      const chave = String(e.aluno.id ?? e.aluno.nome);
      mapa.set(chave, [...(mapa.get(chave) ?? []), e]);
    }
    const lista = Array.from(mapa.values()).map(([atual, ...anteriores]) => ({ atual, anteriores }));
    // Para corrigir primeiro, depois as mais recentes
    return lista.sort((a, b) => {
      const pa = a.atual.status === "pendente" ? 0 : 1;
      const pb = b.atual.status === "pendente" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return new Date(b.atual.dataEnvio).getTime() - new Date(a.atual.dataEnvio).getTime();
    });
  }, [entregas]);

  const idsQueEntregaram = new Set(grupos.map((g) => g.atual.aluno.id));
  const faltam = alunos.filter((a) => !idsQueEntregaram.has(a.id));
  const entregaram = alunos.length - faltam.length;
  const paraCorrigir = grupos.filter((g) => g.atual.status === "pendente").length;
  const p = prazo(atividade.dataEntrega);

  async function aposMudanca(texto: string) {
    setAviso({ tom: "sucesso", texto });
    await Promise.all([carregar(), onAtividadeMudou()]);
  }

  return (
    <section
      id="atividade-detalhe"
      aria-labelledby="atividade-detalhe-titulo"
      className="card scroll-mt-28 overflow-hidden"
    >
      <div className="border-b border-line bg-gradient-to-br from-accent-soft/70 to-card px-4 py-4 sm:px-6">
        <p className="eyebrow text-accent">Atividade</p>
        <h2 id="atividade-detalhe-titulo" className="mt-1 break-words text-xl font-semibold tracking-[-0.01em] text-ink">
          {atividade.titulo}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock aria-hidden className="h-4 w-4" />
            Entrega até {p.texto}
          </span>
          <Selo tom={p.vencido ? "neutro" : p.proximo ? "chama" : "accent"}>{p.relativo}</Selo>
          {atividade.arquivoObrigatorio && (
            <Selo tom="sol">
              <FileWarning aria-hidden className="h-3.5 w-3.5" />
              Arquivo obrigatório
            </Selo>
          )}
        </div>
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-ink-soft">{atividade.descricao}</p>
      </div>

      <div className="space-y-6 px-4 py-5 sm:px-6">
        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold text-ink">Entregas</h3>
            <p className="text-sm text-ink-soft">
              <strong className="text-ink">{entregaram}</strong> de {alunos.length}{" "}
              {alunos.length === 1 ? "aluno entregou" : "alunos entregaram"}
              {paraCorrigir > 0 && (
                <>
                  {" "}
                  · <strong className="text-sun-ink">{paraCorrigir} para corrigir</strong>
                </>
              )}
            </p>
          </div>
          <BarraProgresso
            valor={alunos.length ? (entregaram / alunos.length) * 100 : 0}
            rotulo="Alunos que entregaram"
            cor="bg-accent"
          />
          {faltam.length > 0 && entregas && (
            <p className="mt-3 text-sm text-ink-soft">
              <span className="font-semibold text-ink">Ainda não entregaram:</span>{" "}
              {faltam.map((a) => a.nome).join(", ")}
            </p>
          )}
        </div>

        <RegiaoAoVivo mensagem={aviso} />
        {erro && <Mensagem tom="erro">{erro}</Mensagem>}

        {entregas === null ? (
          <Carregando texto="Carregando entregas…" />
        ) : grupos.length === 0 ? (
          <Vazio
            compacto
            icone={<Inbox />}
            titulo="Nenhuma entrega ainda"
            texto="As entregas dos alunos aparecem aqui para você corrigir."
          />
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <CartaoEntrega key={g.atual.id} entrega={g.atual} anteriores={g.anteriores} onMudou={aposMudanca} />
            ))}
          </div>
        )}

        <details className="group rounded-2xl border border-line">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-2 px-4 font-semibold text-ink hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
            <Pencil aria-hidden className="h-4 w-4 text-ink-faint" />
            Editar atividade
            <span className="ml-auto text-ink-faint transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
          </summary>
          <div className="border-t border-line p-4">
            <EditarAtividade key={atividade.id} atividade={atividade} onSalva={onAtividadeMudou} />
          </div>
        </details>
      </div>
    </section>
  );
}
