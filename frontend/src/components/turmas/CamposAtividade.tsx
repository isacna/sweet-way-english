"use client";

import { AssetPreview } from "@/components/AssetPreview";
import { CaixaMarcar, Campo, classeCampo } from "@/components/painel/ui";

export type ValoresAtividade = {
  titulo: string;
  descricao: string;
  /** valor de <input type="datetime-local"> (fuso local) */
  dataEntrega: string;
  arquivoObrigatorio: boolean;
  link: string;
};

export const atividadeVazia: ValoresAtividade = {
  titulo: "",
  descricao: "",
  dataEntrega: "",
  arquivoObrigatorio: false,
  link: "",
};

/** Mensagem de erro de validação local, ou "" se está tudo certo. */
export function validarAtividade(v: ValoresAtividade): string {
  if (!v.titulo.trim()) return "Informe o título da atividade.";
  if (!v.descricao.trim()) return "Escreva as instruções da atividade.";
  if (!v.dataEntrega || Number.isNaN(new Date(v.dataEntrega).getTime())) return "Informe a data e a hora de entrega.";
  if (v.link.trim() && !/^https?:\/\//i.test(v.link.trim())) return "O link precisa começar com http:// ou https://";
  return "";
}

/**
 * Corpo do POST/PATCH: JSON sem arquivo; multipart com o anexo (`arquivo`).
 * `extra` vai junto (ex.: `removerArquivo`).
 */
export function corpoAtividade(v: ValoresAtividade, anexo: File | null, extra: Record<string, string | boolean> = {}): BodyInit {
  const campos: Record<string, string | boolean | null> = {
    titulo: v.titulo.trim(),
    descricao: v.descricao.trim(),
    dataEntrega: new Date(v.dataEntrega).toISOString(),
    arquivoObrigatorio: v.arquivoObrigatorio,
    link: v.link.trim() || null,
    ...extra,
  };
  if (!anexo) return JSON.stringify(campos);
  const fd = new FormData();
  for (const [k, valor] of Object.entries(campos)) fd.append(k, valor === null ? "" : String(valor));
  fd.append("arquivo", anexo);
  return fd;
}

export const ACEITA_ANEXO =
  ".pdf,.doc,.docx,.ppt,.pptx,.txt,image/png,image/jpeg,image/gif,image/webp,audio/*,video/*";

/** Campos comuns de criar/editar atividade. */
export function CamposAtividade({
  valores,
  onChange,
  prefixo,
}: {
  valores: ValoresAtividade;
  onChange: (v: ValoresAtividade) => void;
  prefixo: string;
}) {
  const set = <K extends keyof ValoresAtividade>(k: K, valor: ValoresAtividade[K]) => onChange({ ...valores, [k]: valor });
  const linkValido = /^https?:\/\/\S+\.\S+/i.test(valores.link.trim());
  return (
    <>
      <Campo id={`${prefixo}-titulo`} rotulo="Título" obrigatorio>
        <input
          id={`${prefixo}-titulo`}
          value={valores.titulo}
          onChange={(e) => set("titulo", e.target.value)}
          required
          maxLength={200}
          placeholder="Ex.: Writing — My daily routine"
          className={classeCampo}
        />
      </Campo>
      <Campo id={`${prefixo}-descricao`} rotulo="Instruções" obrigatorio>
        <textarea
          id={`${prefixo}-descricao`}
          value={valores.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          required
          rows={5}
          placeholder="O que o aluno deve fazer e como entregar."
          className={`${classeCampo} resize-y`}
        />
      </Campo>
      <Campo id={`${prefixo}-data`} rotulo="Data e hora de entrega" obrigatorio>
        <input
          id={`${prefixo}-data`}
          type="datetime-local"
          value={valores.dataEntrega}
          onChange={(e) => set("dataEntrega", e.target.value)}
          required
          className={classeCampo}
        />
      </Campo>
      <CaixaMarcar
        id={`${prefixo}-obrigatorio`}
        checked={valores.arquivoObrigatorio}
        onChange={(v) => set("arquivoObrigatorio", v)}
      >
        <span className="font-semibold">Exigir arquivo na entrega</span>
        <span className="block text-ink-soft">Sem anexo, o aluno não consegue enviar.</span>
      </CaixaMarcar>
      <Campo id={`${prefixo}-link`} rotulo="Link de apoio" opcional dica="Vídeo do YouTube, site ou documento online.">
        <input
          id={`${prefixo}-link`}
          type="url"
          inputMode="url"
          value={valores.link}
          onChange={(e) => set("link", e.target.value)}
          placeholder="https://"
          className={classeCampo}
        />
      </Campo>
      {linkValido && <AssetPreview url={valores.link.trim()} tipo="link" title={valores.titulo || "Link da atividade"} />}
    </>
  );
}
