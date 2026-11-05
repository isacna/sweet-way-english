"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CloudOff, NotebookPen, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { lerErroApi, type NotaLicao } from "@/lib/curso";

export const NOTA_MAX = 5000;
const ATRASO_SALVAR_MS = 900;

type Status = { tipo: "ocioso" } | { tipo: "salvando" } | { tipo: "salvo"; em: Date } | { tipo: "erro"; mensagem: string };

/** Estado das anotações do aluno numa lição: salva sozinho no servidor alguns instantes depois de parar de digitar. */
export function useNotaLicao(licaoId: number, inicial: NotaLicao | null) {
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [status, setStatus] = useState<Status>(
    inicial ? { tipo: "salvo", em: new Date(inicial.atualizadoEm) } : { tipo: "ocioso" }
  );
  const [salvo, setSalvo] = useState(inicial?.texto ?? "");
  const salvoRef = useRef(salvo);
  const textoRef = useRef(texto);
  useEffect(() => {
    textoRef.current = texto;
  }, [texto]);

  const salvar = useCallback(async () => {
    const atual = textoRef.current;
    if (atual === salvoRef.current) return;
    setStatus({ tipo: "salvando" });
    try {
      const res = await apiFetch(`/curso/licoes/${licaoId}/nota`, {
        method: "PUT",
        body: JSON.stringify({ texto: atual }),
      });
      if (!res.ok) {
        setStatus({ tipo: "erro", mensagem: await lerErroApi(res, "Não foi possível salvar.") });
        return;
      }
      salvoRef.current = atual;
      setSalvo(atual);
      // Digitou mais enquanto salvava: o efeito abaixo agenda outro envio
      if (textoRef.current === atual) setStatus({ tipo: "salvo", em: new Date() });
    } catch {
      setStatus({ tipo: "erro", mensagem: "Sem conexão. Suas notas ficam aqui até voltar." });
    }
  }, [licaoId]);

  useEffect(() => {
    if (texto === salvo) return;
    const t = setTimeout(() => void salvar(), ATRASO_SALVAR_MS);
    return () => clearTimeout(t);
  }, [texto, salvo, salvar]);

  // Não perde o que foi digitado nos últimos instantes antes de sair da página
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (textoRef.current !== salvoRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => {
      window.removeEventListener("beforeunload", aviso);
      void salvar();
    };
  }, [salvar]);

  /** Acrescenta uma linha ao fim das notas (botões "anotar" da explicação). */
  const anotar = useCallback((linha: string) => {
    setTexto((t) => {
      const novo = t.trim() === "" ? linha : `${t.replace(/\s+$/, "")}\n${linha}`;
      return novo.slice(0, NOTA_MAX);
    });
  }, []);

  const pendente = texto !== salvo;
  return { texto, setTexto, status, pendente, anotar, salvar };
}

export type EstadoNotas = ReturnType<typeof useNotaLicao>;

function hora(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function LinhaStatus({ notas }: { notas: EstadoNotas }) {
  const { status, pendente } = notas;
  let conteudo: React.ReactNode = "Salva sozinha enquanto você escreve";
  let cor = "text-ink-faint";
  if (status.tipo === "erro") {
    cor = "text-danger-ink";
    conteudo = (
      <>
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        {status.mensagem}
        <button type="button" onClick={() => void notas.salvar()} className="font-semibold underline underline-offset-2">
          Tentar de novo
        </button>
      </>
    );
  } else if (status.tipo === "salvando" || pendente) {
    conteudo = "Salvando…";
  } else if (status.tipo === "salvo") {
    cor = "text-success-ink";
    conteudo = (
      <>
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        Salvo às {hora(status.em)}
      </>
    );
  }
  return (
    <p className={`flex min-h-5 flex-wrap items-center gap-1.5 text-xs font-medium ${cor}`} aria-live="polite">
      {conteudo}
    </p>
  );
}

/** Caderno de notas da lição. `onFechar` aparece só na versão em folha (celular). */
export function PainelNotas({
  notas,
  idCampo,
  onFechar,
  linhas = 12,
}: {
  notas: EstadoNotas;
  idCampo: string;
  onFechar?: () => void;
  linhas?: number;
}) {
  const restante = NOTA_MAX - notas.texto.length;
  return (
    <section aria-labelledby={`${idCampo}-titulo`} className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-soft text-sun-ink" aria-hidden>
          <NotebookPen className="h-5 w-5" />
        </span>
        <h2 id={`${idCampo}-titulo`} className="flex-1 text-lg font-semibold text-ink">
          Minhas notas
        </h2>
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft hover:bg-gray-100 hover:text-ink focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30"
            aria-label="Fechar notas"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>
      <label htmlFor={idCampo} className="sr-only">
        Suas anotações desta lição
      </label>
      <textarea
        id={idCampo}
        value={notas.texto}
        onChange={(e) => notas.setTexto(e.target.value.slice(0, NOTA_MAX))}
        onBlur={() => void notas.salvar()}
        rows={linhas}
        maxLength={NOTA_MAX}
        spellCheck
        placeholder={"Escreva o que quiser lembrar.\nEx.: Good night = só para ir embora"}
        className="min-h-40 w-full flex-1 resize-y rounded-2xl border-2 border-line bg-[linear-gradient(transparent_calc(1.75rem-1px),var(--color-line)_calc(1.75rem-1px),var(--color-line)_1.75rem,transparent_1.75rem)] bg-[length:100%_1.75rem] bg-local px-4 py-[0.3rem] text-[0.95rem] leading-7 text-ink placeholder:text-ink-faint focus:border-grape focus:outline-none focus:ring-4 focus:ring-grape/20"
      />
      <div className="mt-2 flex items-start justify-between gap-3">
        <LinhaStatus notas={notas} />
        {restante < 500 && <p className="shrink-0 text-xs text-ink-faint">{restante} restantes</p>}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        Só você vê. Use o botão <strong className="font-semibold text-ink-soft">Anotar</strong> nas regras e exemplos para
        copiar direto para cá.
      </p>
    </section>
  );
}
