"use client";

import { ExternalLink, Megaphone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";
import { AcoesDialogo, ConfirmarDialogo, Dialogo } from "@/components/painel/Dialogo";
import { Campo, classeBotao, classeCampo, erroDaApi, Mensagem, Secao, Vazio } from "@/components/painel/ui";
import type { Aviso } from "./tipos";

/** Link do aviso só vira <a> se for http(s): evita `javascript:` vindo do banco. */
function linkSeguro(link: string | null): string | null {
  if (!link) return null;
  return /^https?:\/\//i.test(link.trim()) ? link.trim() : null;
}

function ItemAviso({ aviso, onRemover }: { aviso: Aviso; onRemover?: () => void }) {
  const href = linkSeguro(aviso.link);
  return (
    <li className="relative rounded-2xl border border-line bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="break-words font-semibold leading-snug text-ink">{aviso.titulo}</p>
          {aviso.conteudo && (
            <p className="whitespace-pre-wrap break-words text-sm text-ink-soft">{aviso.conteudo}</p>
          )}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] max-w-full items-center gap-1.5 text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-current"
            >
              <ExternalLink aria-hidden className="h-4 w-4 shrink-0" />
              <span className="truncate">{href.replace(/^https?:\/\//, "")}</span>
            </a>
          ) : aviso.link ? (
            <p className="break-all text-sm text-ink-soft">{aviso.link}</p>
          ) : null}
          <p className="text-xs text-ink-faint">
            <time dateTime={aviso.criadoEm} title={new Date(aviso.criadoEm).toLocaleString("pt-BR")}>
              {tempoRelativoPt(aviso.criadoEm)}
            </time>
          </p>
        </div>
        {onRemover && (
          <button
            type="button"
            onClick={onRemover}
            aria-label={`Remover o aviso "${aviso.titulo}"`}
            className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-faint hover:bg-danger-soft hover:text-danger-ink"
          >
            <Trash2 aria-hidden className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Mural de avisos da turma. Com `editavel` (professora): botão "Novo aviso", criação em diálogo
 * e remoção com confirmação. Sem `editavel` (aluno): só leitura.
 */
export function MuralAvisos({
  turmaId,
  avisos,
  editavel,
  onMudou,
  abrirNovo,
  onFecharNovo,
}: {
  turmaId: number | string;
  avisos: Aviso[];
  editavel?: boolean;
  onMudou?: () => void | Promise<void>;
  /** Controle externo do diálogo de novo aviso (o botão do cabeçalho da página também abre). */
  abrirNovo?: boolean;
  onFecharNovo?: () => void;
}) {
  const [novoLocal, setNovoLocal] = useState(false);
  const novoAberto = novoLocal || !!abrirNovo;
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [link, setLink] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [removendo, setRemovendo] = useState<Aviso | null>(null);
  const [ocupadoRemover, setOcupadoRemover] = useState(false);
  const [erroRemover, setErroRemover] = useState("");
  const [feito, setFeito] = useState("");

  function fecharNovo() {
    setNovoLocal(false);
    onFecharNovo?.();
    setErro("");
  }

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const l = link.trim();
    if (l && !/^https?:\/\//i.test(l)) {
      setErro("O link precisa começar com http:// ou https://");
      return;
    }
    setSalvando(true);
    const res = await apiFetch(`/turmas/${turmaId}/avisos`, {
      method: "POST",
      body: JSON.stringify({ titulo: titulo.trim(), conteudo: conteudo.trim() || null, link: l || null }),
    }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível publicar o aviso."));
      return;
    }
    setTitulo("");
    setConteudo("");
    setLink("");
    fecharNovo();
    setFeito("Aviso publicado. Os alunos já podem ver.");
    await onMudou?.();
  }

  async function remover() {
    if (!removendo) return;
    setErroRemover("");
    setOcupadoRemover(true);
    const res = await apiFetch(`/turmas/${turmaId}/avisos/${removendo.id}`, { method: "DELETE" }).catch(() => null);
    setOcupadoRemover(false);
    if (!res?.ok) {
      setErroRemover(await erroDaApi(res, "Não foi possível remover o aviso."));
      return;
    }
    setRemovendo(null);
    setFeito("Aviso removido.");
    await onMudou?.();
  }

  return (
    <Secao
      id="mural"
      titulo={
        <span className="inline-flex items-center gap-2">
          <Megaphone aria-hidden className="h-5 w-5 text-candy" />
          Mural de avisos
        </span>
      }
      acao={
        editavel ? (
          <button type="button" onClick={() => setNovoLocal(true)} className={classeBotao("secundario")}>
            <Plus aria-hidden className="h-4 w-4" />
            Novo aviso
          </button>
        ) : undefined
      }
    >
      <div aria-live="polite" className="sr-only">
        {feito}
      </div>
      {avisos.length === 0 ? (
        <Vazio
          compacto
          titulo="Nenhum aviso por aqui"
          texto={
            editavel
              ? "Use o mural para lembretes, links de aula ao vivo e recados para a turma."
              : "Quando o professor publicar um recado, ele aparece aqui."
          }
        />
      ) : (
        <ul className="space-y-3">
          {avisos.map((a) => (
            <ItemAviso
              key={a.id}
              aviso={a}
              onRemover={
                editavel
                  ? () => {
                      setErroRemover("");
                      setRemovendo(a);
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      {editavel && novoAberto && (
        <Dialogo titulo="Novo aviso" descricao="Aparece no topo da turma para todos os alunos." onFechar={fecharNovo} bloquearFechar={salvando}>
          <form onSubmit={publicar} className="space-y-4" noValidate>
            <Campo id="aviso-titulo" rotulo="Título" obrigatorio>
              <input
                id="aviso-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Aula ao vivo hoje às 19h"
                required
                maxLength={200}
                className={classeCampo}
              />
            </Campo>
            <Campo id="aviso-conteudo" rotulo="Mensagem" opcional>
              <textarea
                id="aviso-conteudo"
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={4}
                className={`${classeCampo} resize-y`}
              />
            </Campo>
            <Campo id="aviso-link" rotulo="Link" opcional dica="Ex.: link do Meet ou de um vídeo.">
              <input
                id="aviso-link"
                type="url"
                inputMode="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://"
                className={classeCampo}
              />
            </Campo>
            {erro && <Mensagem tom="erro">{erro}</Mensagem>}
            <AcoesDialogo>
              <button type="button" onClick={fecharNovo} disabled={salvando} className={classeBotao("secundario")}>
                Cancelar
              </button>
              <button type="submit" disabled={salvando || !titulo.trim()} className={classeBotao("primario")}>
                {salvando ? "Publicando…" : "Publicar aviso"}
              </button>
            </AcoesDialogo>
          </form>
        </Dialogo>
      )}

      {removendo && (
        <ConfirmarDialogo
          titulo="Remover aviso?"
          rotuloConfirmar="Remover aviso"
          ocupado={ocupadoRemover}
          erro={erroRemover}
          onConfirmar={() => void remover()}
          onFechar={() => setRemovendo(null)}
        >
          <p>
            O aviso <strong className="text-ink">{removendo.titulo}</strong> sai do mural da turma. Esta ação não pode
            ser desfeita.
          </p>
        </ConfirmarDialogo>
      )}
    </Secao>
  );
}
