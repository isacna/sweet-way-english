"use client";

import { FileUp, Link2 } from "lucide-react";
import { useState } from "react";
import { AcoesDialogo, Dialogo } from "@/components/painel/Dialogo";
import { Campo, classeArquivo, classeBotao, classeCampo, erroDaApi, Mensagem } from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";
import { TIPOS_MATERIAL } from "./Materiais";

/** Tipo sugerido pelo MIME do arquivo escolhido. */
function tipoPeloArquivo(f: File): string {
  if (f.type.startsWith("audio/")) return "audio";
  if (f.type.startsWith("video/")) return "video";
  return "pdf";
}

/** Novo material da turma: upload (privado, só a turma abre) ou link externo. */
export function DialogoNovoMaterial({
  turmaId,
  turmaNome,
  onFechar,
  onCriado,
}: {
  turmaId: string;
  turmaNome: string;
  onFechar: () => void;
  onCriado: (titulo: string) => void;
}) {
  const [modo, setModo] = useState<"arquivo" | "link">("arquivo");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("pdf");
  const [url, setUrl] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  function trocarModo(m: "arquivo" | "link") {
    setModo(m);
    setErro("");
    setTipo(m === "link" ? "link" : arquivo ? tipoPeloArquivo(arquivo) : "pdf");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!titulo.trim()) return setErro("Informe o título do material.");
    if (modo === "arquivo" && !arquivo) return setErro("Escolha o arquivo.");
    if (modo === "link" && !/^https?:\/\/\S+/i.test(url.trim())) return setErro("Informe um link que comece com http:// ou https://");

    const fd = new FormData();
    fd.append("titulo", titulo.trim());
    fd.append("tipo", tipo);
    if (modo === "link") fd.append("url", url.trim());
    else if (arquivo) fd.append("arquivo", arquivo);

    setEnviando(true);
    const res = await apiFetch(`/turmas/${turmaId}/materiais`, { method: "POST", body: fd }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível adicionar o material."));
      return;
    }
    onCriado(titulo.trim());
  }

  const tiposDoModo = modo === "link" ? TIPOS_MATERIAL : TIPOS_MATERIAL.filter((t) => t.valor !== "link");

  return (
    <Dialogo titulo="Adicionar material" descricao={`Turma ${turmaNome}`} onFechar={onFechar} bloquearFechar={enviando}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <div role="group" aria-label="O que você vai adicionar" className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
          {(
            [
              { v: "arquivo", rotulo: "Arquivo", Icone: FileUp },
              { v: "link", rotulo: "Link", Icone: Link2 },
            ] as const
          ).map(({ v, rotulo, Icone }) => (
            <button
              key={v}
              type="button"

              aria-pressed={modo === v}
              onClick={() => trocarModo(v)}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
                modo === v ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Icone aria-hidden className="h-4 w-4" />
              {rotulo}
            </button>
          ))}
        </div>

        <Campo id="mat-titulo" rotulo="Título" obrigatorio>
          <input id="mat-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={200} className={classeCampo} />
        </Campo>

        {modo === "arquivo" ? (
          <Campo id="mat-arquivo" rotulo="Arquivo" obrigatorio dica="Fica privado: só você e os alunos da turma conseguem abrir.">
            <input
              id="mat-arquivo"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*,audio/*,video/*"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setArquivo(f);
                if (f) setTipo(tipoPeloArquivo(f));
              }}
              className={classeArquivo}
            />
          </Campo>
        ) : (
          <Campo id="mat-url" rotulo="Link" obrigatorio dica="YouTube, site, Google Drive…">
            <input
              id="mat-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              className={classeCampo}
            />
          </Campo>
        )}

        <Campo id="mat-tipo" rotulo="Tipo" dica="Usado nos filtros da lista.">
          <select id="mat-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={classeCampo}>
            {tiposDoModo.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        {erro && <Mensagem tom="erro">{erro}</Mensagem>}
        <AcoesDialogo>
          <button type="button" onClick={onFechar} disabled={enviando} className={classeBotao("secundario")}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={classeBotao("primario")}>
            {enviando ? "Enviando…" : "Adicionar material"}
          </button>
        </AcoesDialogo>
      </form>
    </Dialogo>
  );
}
