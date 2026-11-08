"use client";

import { Check, Paperclip, Star, X } from "lucide-react";
import { useState } from "react";
import { AssetPreview } from "@/components/AssetPreview";
import { ConfirmarDialogo } from "@/components/painel/Dialogo";
import { Avatar, Campo, classeBotao, classeCampo, erroDaApi, Mensagem, Selo } from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";
import { dataHoraCurta, seloEntregaProfessora } from "./status";
import type { Entrega } from "./tipos";

type Decisao = "aprovado" | "reprovado";

/** Conteúdo de uma entrega (texto + anexo), usado na visão da professora e do aluno. */
export function ConteudoEntrega({ entrega, rotuloAnexo }: { entrega: Entrega; rotuloAnexo: string }) {
  return (
    <div className="space-y-3">
      {entrega.conteudo?.trim() ? (
        <p className="whitespace-pre-wrap break-words rounded-xl bg-gray-50 px-3.5 py-3 text-sm text-ink">{entrega.conteudo}</p>
      ) : (
        <p className="text-sm italic text-ink-faint">Sem texto na entrega.</p>
      )}
      {entrega.arquivoUrl && (
        <div className="space-y-2">
          <p className="flex min-w-0 items-center gap-2 text-sm text-ink">
            <Paperclip aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />
            <span className="truncate">{entrega.arquivo?.nomeOriginal ?? rotuloAnexo}</span>
          </p>
          <AssetPreview url={entrega.arquivoUrl} arquivo={entrega.arquivo} title={rotuloAnexo} />
        </div>
      )}
    </div>
  );
}

export function CaixaFeedback({ nota, comentario, autor, data }: { nota: number; comentario: string; autor?: string; data?: string }) {
  return (
    <div className="rounded-xl border border-success-bright/40 bg-success-soft px-3.5 py-3 text-sm">
      <p className="inline-flex items-center gap-1.5 font-semibold text-success-ink">
        <Star aria-hidden className="h-4 w-4 fill-current" />
        Nota {String(nota).replace(".", ",")}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-ink">{comentario}</p>
      {(autor || data) && (
        <p className="mt-2 text-xs text-ink-soft">
          {autor}
          {autor && data ? " · " : ""}
          {data ? dataHoraCurta(data) : ""}
        </p>
      )}
    </div>
  );
}

/**
 * Entrega na visão da professora: conteúdo, anexo e as ações de correção que o backend permite.
 * - pendente → nota + comentário, ou Aprovar / Reprovar (com confirmação: não dá para desfazer);
 * - corrigido → só Reprovar (apaga a nota e libera nova entrega);
 * - aprovado / reprovado → final.
 */
export function CartaoEntrega({
  entrega,
  anteriores = [],
  onMudou,
}: {
  entrega: Entrega;
  /** Entregas mais antigas do mesmo aluno (histórico). */
  anteriores?: Entrega[];
  onMudou: (mensagem: string) => void | Promise<void>;
}) {
  const [nota, setNota] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [decisao, setDecisao] = useState<Decisao | null>(null);
  const [ocupadoDecisao, setOcupadoDecisao] = useState(false);
  const [erroDecisao, setErroDecisao] = useState("");

  const selo = seloEntregaProfessora(entrega.status);
  const prefixo = `entrega-${entrega.id}`;
  const nomeAluno = entrega.aluno.nome;

  async function enviarNota(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const n = Number(nota.replace(",", "."));
    if (!nota.trim() || !Number.isFinite(n) || n < 0) {
      setErro("Informe uma nota válida (número maior ou igual a zero).");
      return;
    }
    if (!comentario.trim()) {
      setErro("Escreva um comentário para o aluno.");
      return;
    }
    setEnviando(true);
    const res = await apiFetch(`/submissoes/${entrega.id}/feedback`, {
      method: "POST",
      body: JSON.stringify({ comentario: comentario.trim(), nota: n }),
    }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível enviar a nota."));
      return;
    }
    await onMudou(`Nota enviada para ${nomeAluno}.`);
  }

  async function decidir() {
    if (!decisao) return;
    setErroDecisao("");
    setOcupadoDecisao(true);
    const res = await apiFetch(`/professor/submissoes/${entrega.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: decisao }),
    }).catch(() => null);
    setOcupadoDecisao(false);
    if (!res?.ok) {
      setErroDecisao(await erroDaApi(res, "Não foi possível atualizar a entrega."));
      return;
    }
    setDecisao(null);
    await onMudou(decisao === "aprovado" ? `Entrega de ${nomeAluno} aprovada.` : `Entrega de ${nomeAluno} reprovada.`);
  }

  return (
    <article aria-labelledby={`${prefixo}-aluno`} className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar nome={nomeAluno} />
        <div className="min-w-0 flex-1">
          <h4 id={`${prefixo}-aluno`} className="truncate font-semibold text-ink">
            {nomeAluno}
          </h4>
          <p className="text-xs text-ink-soft">
            <time dateTime={entrega.dataEnvio} title={new Date(entrega.dataEnvio).toLocaleString("pt-BR")}>
              Enviada {tempoRelativoPt(entrega.dataEnvio).toLowerCase()}
            </time>
            {anteriores.length > 0 && ` · ${anteriores.length + 1}ª tentativa`}
          </p>
        </div>
        <Selo tom={selo.tom}>{selo.rotulo}</Selo>
      </header>

      <ConteudoEntrega entrega={entrega} rotuloAnexo={`Anexo de ${nomeAluno}`} />

      {entrega.feedback && (
        <div className="mt-3">
          <CaixaFeedback nota={entrega.feedback.nota} comentario={entrega.feedback.comentario} />
        </div>
      )}

      {entrega.status === "pendente" && (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <form onSubmit={enviarNota} className="space-y-3" noValidate>
            <p className="text-sm font-semibold text-ink">Corrigir com nota</p>
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Campo id={`${prefixo}-nota`} rotulo="Nota">
                <input
                  id={`${prefixo}-nota`}
                  inputMode="decimal"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ex.: 8,5"
                  className={classeCampo}
                />
              </Campo>
              <Campo id={`${prefixo}-comentario`} rotulo="Comentário para o aluno">
                <textarea
                  id={`${prefixo}-comentario`}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={2}
                  className={`${classeCampo} resize-y`}
                />
              </Campo>
            </div>
            {erro && <Mensagem tom="erro">{erro}</Mensagem>}
            <button type="submit" disabled={enviando} className={classeBotao("primario", "w-full sm:w-auto")}>
              {enviando ? "Enviando…" : "Enviar nota e comentário"}
            </button>
          </form>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="text-xs text-ink-soft sm:mr-auto">Ou decida sem nota:</p>
            <button
              type="button"
              onClick={() => {
                setErroDecisao("");
                setDecisao("aprovado");
              }}
              className={classeBotao("secundario")}
            >
              <Check aria-hidden className="h-4 w-4 text-success" />
              Aprovar
            </button>
            <button
              type="button"
              onClick={() => {
                setErroDecisao("");
                setDecisao("reprovado");
              }}
              className={classeBotao("perigoContorno")}
            >
              <X aria-hidden className="h-4 w-4" />
              Pedir nova entrega
            </button>
          </div>
        </div>
      )}

      {entrega.status === "corrigido" && (
        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-soft">A nota não pode ser editada. Para corrigir, peça uma nova entrega.</p>
          <button
            type="button"
            onClick={() => {
              setErroDecisao("");
              setDecisao("reprovado");
            }}
            className={classeBotao("perigoContorno")}
          >
            Reprovar e pedir nova entrega
          </button>
        </div>
      )}

      {anteriores.length > 0 && (
        <details className="group mt-4 rounded-xl border border-line">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center px-3.5 text-sm font-semibold text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
            <span className="mr-2 transition-transform group-open:rotate-90" aria-hidden>
              ›
            </span>
            Entregas anteriores ({anteriores.length})
          </summary>
          <ul className="space-y-3 border-t border-line p-3.5">
            {anteriores.map((a) => {
              const s = seloEntregaProfessora(a.status);
              return (
                <li key={a.id} className="space-y-2">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    {dataHoraCurta(a.dataEnvio)} <Selo tom={s.tom}>{s.rotulo}</Selo>
                  </p>
                  <ConteudoEntrega entrega={a} rotuloAnexo={`Anexo anterior de ${nomeAluno}`} />
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {decisao && (
        <ConfirmarDialogo
          titulo={decisao === "aprovado" ? "Aprovar entrega?" : "Pedir nova entrega?"}
          rotuloConfirmar={decisao === "aprovado" ? "Aprovar" : "Reprovar entrega"}
          perigo={decisao === "reprovado"}
          ocupado={ocupadoDecisao}
          erro={erroDecisao}
          onConfirmar={() => void decidir()}
          onFechar={() => setDecisao(null)}
        >
          {decisao === "aprovado" ? (
            <p>
              A entrega de <strong className="text-ink">{nomeAluno}</strong> fica aprovada, sem nota. Depois disso não dá
              para mudar a decisão nem dar nota.
            </p>
          ) : (
            <p>
              A entrega de <strong className="text-ink">{nomeAluno}</strong> fica reprovada
              {entrega.feedback ? " e a nota é apagada" : ""}. O aluno poderá enviar uma nova versão.
            </p>
          )}
        </ConfirmarDialogo>
      )}
    </article>
  );
}
