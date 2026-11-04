"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { rotuloEtapa, type Etapa, type LicaoEdicao, type StatusConteudo, type TipoExercicio } from "@/lib/curso";
import { EditorApresentacao } from "@/components/conteudo/EditorApresentacao";
import { EditorExercicio } from "@/components/conteudo/EditorExercicio";
import {
  ORDEM_ETAPAS,
  TIPOS,
  exercicioVazio,
  licaoParaForm,
  licaoParaPayload,
  ordenarPorEtapa,
  rotuloTipo,
  type ExercicioForm,
  type LicaoForm,
} from "@/components/conteudo/formulario";
import {
  Campo,
  StatusBadge,
  classeBotaoPrimario,
  classeBotaoSecundario,
  classeInput,
} from "@/components/conteudo/ui";

const MENSAGEM_SAIR = "Há alterações não salvas nesta lição. Sair mesmo assim?";

const descricaoEtapa: Record<Etapa, string> = {
  controlada: "Uma resposta certa, foco na forma (ex.: múltipla escolha, lacunas).",
  semicontrolada: "O aluno monta a frase com mais liberdade (ordenar, corrigir, associar).",
  producao: "O aluno produz frases (tradução, reescrita).",
  quiz: "Mini-quiz final: aprovação com 80% conclui a lição. Mínimo de 4 itens.",
};

function instantaneo(f: LicaoForm | null): string {
  return f ? JSON.stringify(licaoParaPayload(f)) : "";
}

export default function EditorLicaoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [licao, setLicao] = useState<LicaoEdicao | null>(null);
  const [form, setForm] = useState<LicaoForm | null>(null);
  const [salvo, setSalvo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState("");
  const [erroSalvar, setErroSalvar] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mudandoStatus, setMudandoStatus] = useState(false);
  const [novoTipo, setNovoTipo] = useState<Record<Etapa, TipoExercicio>>({
    controlada: "mcq",
    semicontrolada: "word_order",
    producao: "translate",
    quiz: "mcq",
  });

  const aplicarLicao = useCallback((data: LicaoEdicao) => {
    const f = licaoParaForm(data);
    setLicao(data);
    setForm(f);
    setSalvo(instantaneo(f));
  }, []);

  const carregar = useCallback(async () => {
    setErroCarregar("");
    const res = await apiFetch(`/conteudo/licoes/${id}`).catch(() => null);
    if (!res) {
      setErroCarregar("Sem conexão com o servidor.");
      setCarregando(false);
      return;
    }
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!res.ok) {
      setErroCarregar(res.status === 404 ? "Lição não encontrada." : "Não foi possível carregar a lição.");
      setCarregando(false);
      return;
    }
    aplicarLicao((await res.json()) as LicaoEdicao);
    setCarregando(false);
  }, [id, router, aplicarLicao]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregar();
    });
  }, [carregar]);

  const atual = useMemo(() => instantaneo(form), [form]);
  const alterado = !!form && atual !== salvo;

  // Aviso de alterações não salvas: fechar/recarregar a aba e clicar em links da página
  useEffect(() => {
    if (!alterado) return;
    const antesDeSair = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.getAttribute("href") || a.target === "_blank" || a.hasAttribute("download")) return;
      if (!window.confirm(MENSAGEM_SAIR)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", antesDeSair);
    document.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSair);
      document.removeEventListener("click", aoClicar, true);
    };
  }, [alterado]);

  const atualizar = (parcial: Partial<LicaoForm>) => {
    setMensagem("");
    setForm((f) => (f ? { ...f, ...parcial } : f));
  };

  const atualizarExercicios = (fn: (lista: ExercicioForm[]) => ExercicioForm[]) => {
    setMensagem("");
    setForm((f) => (f ? { ...f, exercicios: fn(f.exercicios) } : f));
  };

  /** Troca o exercício de lugar com o vizinho da mesma etapa. */
  function mover(chave: string, direcao: -1 | 1) {
    atualizarExercicios((lista) => {
      const i = lista.findIndex((e) => e.chave === chave);
      if (i < 0) return lista;
      const etapa = lista[i].etapa;
      let j = i + direcao;
      while (j >= 0 && j < lista.length && lista[j].etapa !== etapa) j += direcao;
      if (j < 0 || j >= lista.length) return lista;
      const nova = [...lista];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });
  }

  async function salvar() {
    if (!form) return;
    setErroSalvar("");
    setMensagem("");
    setSalvando(true);
    const ordenado = { ...form, exercicios: ordenarPorEtapa(form.exercicios) };
    const res = await apiFetch(`/conteudo/licoes/${id}`, {
      method: "PUT",
      body: JSON.stringify(licaoParaPayload(ordenado)),
    }).catch(() => null);
    setSalvando(false);
    if (!res) {
      setErroSalvar("Sem conexão com o servidor. Suas alterações continuam aqui; tente de novo.");
      return;
    }
    if (res.status === 401) {
      router.replace("/login?tipo=professor");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErroSalvar(data.error ?? "Não foi possível salvar a lição.");
      return;
    }
    const salva = data as LicaoEdicao;
    setLicao(salva);
    // Mantém o estado do editor (seções abertas), só recebendo os ids dos exercícios novos
    if (Array.isArray(salva.exercicios) && salva.exercicios.length === ordenado.exercicios.length) {
      const f: LicaoForm = {
        ...ordenado,
        exercicios: ordenado.exercicios.map((e, i) => ({ ...e, id: salva.exercicios[i].id ?? e.id })),
      };
      setForm(f);
      setSalvo(instantaneo(f));
    } else {
      aplicarLicao(salva);
    }
    setMensagem("Lição salva.");
  }

  async function mudarStatus(status: StatusConteudo) {
    setErroSalvar("");
    setMensagem("");
    setMudandoStatus(true);
    const res = await apiFetch(`/conteudo/licoes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch(() => null);
    setMudandoStatus(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setErroSalvar(data.error ?? "Não foi possível alterar o status.");
      return;
    }
    setLicao((l) => (l ? { ...l, status } : l));
    setMensagem(
      status === "publicado"
        ? "Lição publicada."
        : status === "revisao"
          ? "Lição enviada para revisão."
          : "Lição voltou para rascunho."
    );
  }

  if (carregando) {
    return <p className="max-w-5xl mx-auto p-8 rounded-xl bg-card border border-line text-ink-soft">Carregando lição…</p>;
  }

  if (!form || !licao) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link href="/professor/conteudo" className="text-sm text-ink-soft hover:text-ink">
          ← Voltar ao conteúdo
        </Link>
        <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">{erroCarregar || "Lição indisponível."}</p>
      </div>
    );
  }

  const ordenados = ordenarPorEtapa(form.exercicios);
  const numero = new Map(ordenados.map((e, i) => [e.chave, i + 1]));
  const totalQuiz = form.exercicios.filter((e) => e.etapa === "quiz").length;
  const totalPratica = form.exercicios.length - totalQuiz;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-28">
      <div className="space-y-2">
        <Link
          href="/professor/conteudo"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
        >
          ← Voltar ao conteúdo
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-ink-soft">
              {licao.modulo.titulo} · Lição {licao.ordem}
            </p>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink break-words">{form.titulo || licao.titulo}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge status={licao.status} />
              <span className="text-xs text-ink-soft">{licao.slug}</span>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="flex flex-wrap gap-2">
              {licao.status === "rascunho" && (
                <button
                  type="button"
                  disabled={alterado || mudandoStatus}
                  onClick={() => void mudarStatus("revisao")}
                  className={classeBotaoSecundario}
                >
                  Enviar para revisão
                </button>
              )}
              {licao.status !== "rascunho" && (
                <button
                  type="button"
                  disabled={alterado || mudandoStatus}
                  onClick={() => void mudarStatus("rascunho")}
                  className={classeBotaoSecundario}
                >
                  Voltar para rascunho
                </button>
              )}
              {licao.status !== "publicado" && (
                <button
                  type="button"
                  disabled={alterado || mudandoStatus}
                  onClick={() => void mudarStatus("publicado")}
                  className="inline-flex items-center justify-center font-medium rounded-lg bg-success text-white px-4 py-2 text-sm hover:bg-success-strong disabled:opacity-50 disabled:pointer-events-none"
                >
                  Publicar
                </button>
              )}
            </div>
            {alterado && (
              <p className="text-xs text-sun-ink">Salve as alterações antes de mudar o status.</p>
            )}
            {licao.status === "publicado" && (
              <p className="text-xs text-ink-soft">
                Publicada: alterações salvas aparecem imediatamente para os alunos (se o módulo estiver publicado).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-sun/40 bg-sun-soft px-4 py-3 text-sm text-sun-ink">
        Esta página mostra o <strong>gabarito</strong> (destacado em verde). Ele nunca é enviado aos alunos antes
        de eles responderem.
      </div>

      {erroCarregar && <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">{erroCarregar}</p>}

      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Dados da lição</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Campo rotulo="Título" htmlFor="licao-titulo">
            <input
              id="licao-titulo"
              value={form.titulo}
              onChange={(e) => atualizar({ titulo: e.target.value })}
              className={classeInput}
            />
          </Campo>
          <Campo rotulo="Minutos estimados" htmlFor="licao-minutos" dica="Entre 5 e 90.">
            <input
              id="licao-minutos"
              type="number"
              min={5}
              max={90}
              value={form.minutosEstimados}
              onChange={(e) => atualizar({ minutosEstimados: e.target.value })}
              className={classeInput}
            />
          </Campo>
        </div>
        <Campo rotulo="Objetivo" htmlFor="licao-objetivo" dica='Ex.: "Apresentar-se dizendo nome, idade e cidade."'>
          <textarea
            id="licao-objetivo"
            rows={2}
            value={form.objetivo}
            onChange={(e) => atualizar({ objetivo: e.target.value })}
            className={classeInput}
          />
        </Campo>
      </section>

      <section className="card p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Apresentação</h2>
          <p className="text-sm text-ink-soft">Explicação da gramática mostrada antes dos exercícios.</p>
        </div>
        <EditorApresentacao
          valor={form.apresentacao}
          onChange={(apresentacao) => atualizar({ apresentacao })}
        />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Exercícios</h2>
          <p className="text-sm text-ink-soft">
            {totalPratica} de prática (recomendado: 6 ou mais) · {totalQuiz} no mini-quiz (mínimo: 4)
          </p>
        </div>

        {ORDEM_ETAPAS.map((etapa) => {
          const daEtapa = form.exercicios.filter((e) => e.etapa === etapa);
          return (
            <div key={etapa} className="rounded-xl bg-gray-50 border border-line p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-ink">
                  {rotuloEtapa[etapa]} <span className="text-sm font-normal text-ink-soft">({daEtapa.length})</span>
                </h3>
                <p className="text-xs text-ink-soft">{descricaoEtapa[etapa]}</p>
              </div>
              {daEtapa.map((ex, i) => (
                <EditorExercicio
                  key={ex.chave}
                  numero={numero.get(ex.chave) ?? 0}
                  valor={ex}
                  onChange={(v) => atualizarExercicios((lista) => lista.map((e) => (e.chave === ex.chave ? v : e)))}
                  onRemover={() => atualizarExercicios((lista) => lista.filter((e) => e.chave !== ex.chave))}
                  onSubir={i > 0 ? () => mover(ex.chave, -1) : undefined}
                  onDescer={i < daEtapa.length - 1 ? () => mover(ex.chave, 1) : undefined}
                />
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Tipo do novo exercício (${rotuloEtapa[etapa]})`}
                  value={novoTipo[etapa]}
                  onChange={(e) => setNovoTipo((t) => ({ ...t, [etapa]: e.target.value as TipoExercicio }))}
                  className="px-3 py-2 rounded-xl border border-line-strong bg-card text-sm text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {rotuloTipo[t]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => atualizarExercicios((lista) => [...lista, exercicioVazio(etapa, novoTipo[etapa])])}
                  className={classeBotaoSecundario}
                >
                  + Adicionar exercício
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-card/90 backdrop-blur-md shadow-[0_-8px_24px_-16px_rgb(34_27_58/0.25)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0 text-sm">
            {erroSalvar ? (
              <p className="text-danger-ink bg-danger-soft border border-danger-bright/40 rounded-lg px-3 py-2 whitespace-pre-line break-words max-h-32 overflow-y-auto">
                <strong>Não foi salvo: </strong>
                {erroSalvar}
              </p>
            ) : alterado ? (
              <p className="text-sun-ink">Há alterações não salvas.</p>
            ) : mensagem ? (
              <p className="text-success-ink">{mensagem}</p>
            ) : (
              <p className="text-ink-soft">Tudo salvo.</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {alterado && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Descartar todas as alterações não salvas?")) {
                    setErroSalvar("");
                    aplicarLicao(licao);
                  }
                }}
                className={classeBotaoSecundario}
              >
                Descartar
              </button>
            )}
            <button
              type="button"
              disabled={!alterado || salvando}
              onClick={() => void salvar()}
              className={classeBotaoPrimario}
            >
              {salvando ? "Salvando…" : "Salvar lição"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
