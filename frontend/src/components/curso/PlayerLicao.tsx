"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookA,
  BookOpen,
  Check,
  Clock,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { apagarRascunho, lerRascunho, salvarRascunho, type RascunhoLicao } from "@/lib/rascunhoLicao";
import {
  LIMIAR_QUIZ,
  formatarResposta,
  lerErroApi,
  ordemEtapas,
  respostaParaEnvio,
  respostaEmIngles,
  respostaPreenchida,
  rotuloEtapa,
  type ExercicioPublico,
  type LicaoDetalhe,
  type Resposta,
  type Resultado,
  type ResultadoQuiz,
} from "@/lib/curso";
import { MidiaLicao } from "./MidiaLicao";
import { MissaoLicao } from "./MissaoLicao";
import { BotaoOuvir } from "./BotaoOuvir";
import { Exercicio } from "./Exercicio";
import { FeedbackResultado } from "./FeedbackResultado";
import { NOTA_MAX, PainelNotas, useNotaLicao } from "./PainelNotas";
import { TextoDestacado, Termo, termosDaLicao } from "./TextoDestacado";
import { BarraAcao, BarraProgresso, classeBotao } from "./ui";

type Fase = "apresentacao" | "pratica" | "quiz" | "resultado";

const etapasPratica = ["controlada", "semicontrolada", "producao"] as const;

function rolarParaTopo() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
}

function CartaoSecao({
  icone,
  titulo,
  tom = "grape",
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  tom?: "grape" | "sky" | "candy";
  children: React.ReactNode;
}) {
  const cor = { grape: "bg-grape-soft text-grape", sky: "bg-sky-soft text-sky-ink", candy: "bg-candy-soft text-candy" }[tom];
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2.5 text-lg font-semibold text-ink">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${cor}`} aria-hidden>
          {icone}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

// ─── Apresentação ───────────────────────────────────────────────────────────

function BotaoAnotar({ texto, onAnotar }: { texto: string; onAnotar: (t: string) => void }) {
  const [feito, setFeito] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        onAnotar(texto);
        setFeito(true);
        setTimeout(() => setFeito(false), 1600);
      }}
      title="Anotar"
      aria-label={`Anotar: ${texto}`}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30 ${
        feito ? "bg-success-soft text-success-ink" : "text-ink-faint hover:bg-sun-soft hover:text-sun-ink"
      }`}
    >
      {feito ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : <NotebookPen className="h-4 w-4" aria-hidden />}
    </button>
  );
}

/** "I'm Ana = I am Ana = Eu sou a Ana" → inglês (destacado) e, por último, a tradução. */
function Regra({ regra }: { regra: string }) {
  const lados = regra.split("=").map((t) => t.trim()).filter(Boolean);
  if (lados.length < 2) return <span className="leading-relaxed text-ink">{regra}</span>;
  const pt = lados[lados.length - 1];
  return (
    <span className="min-w-0 leading-relaxed">
      <span className="block">
        {lados.slice(0, -1).map((lado, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="px-1 text-ink-faint">=</span>}
            {lado.split("/").map((en, j) => (
              <Fragment key={j}>
                {j > 0 && <span className="px-0.5 text-ink-faint">/</span>}
                <Termo texto={en.trim()} />
              </Fragment>
            ))}
          </Fragment>
        ))}
      </span>
      <span className="mt-1 block text-sm text-ink-soft">{pt}</span>
    </span>
  );
}

function Apresentacao({
  licao,
  onComecar,
  onAnotar,
}: {
  licao: LicaoDetalhe;
  onComecar: () => void;
  onAnotar: (texto: string) => void;
}) {
  const ap = licao.apresentacao;
  const termos = useMemo(() => termosDaLicao(ap), [ap]);
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="card overflow-hidden" aria-labelledby="titulo-explicacao">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-5 py-4 sm:px-7">
          <h2 id="titulo-explicacao" className="flex items-center gap-2.5 text-lg font-semibold text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-grape-soft text-grape" aria-hidden>
              <BookOpen className="h-5 w-5" />
            </span>
            Entenda
          </h2>
          {termos.length > 0 && (
            <p className="text-xs text-ink-faint sm:ml-auto">
              Toque nos termos em <span className="rounded bg-grape-soft px-1 font-semibold text-grape">destaque</span> para
              ouvir
            </p>
          )}
        </div>
        <ol className="divide-y divide-line">
          {ap.explicacao.map((p, i) => (
            <li key={i} className="flex gap-3.5 px-5 py-4 sm:gap-5 sm:px-7 sm:py-5">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-grape/30 text-xs font-bold tabular-nums text-grape"
                aria-hidden
              >
                {i + 1}
              </span>
              <p className={`max-w-[68ch] text-pretty text-ink ${i === 0 ? "text-[1.12rem] leading-8" : "text-[1.05rem] leading-7"}`}>
                <TextoDestacado texto={p} termos={termos} />
              </p>
            </li>
          ))}
        </ol>
      </section>

      {ap.recursos?.map((midia, i) => <MidiaLicao key={i} midia={midia} />)}

      {ap.regras && ap.regras.length > 0 && (
        <CartaoSecao icone={<ListChecks className="h-5 w-5" />} titulo="Resumo da regra">
          <ul className="grid gap-2.5 md:grid-cols-2">
            {ap.regras.map((r, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-2 rounded-2xl border border-line bg-gray-50 py-3 pr-2 pl-4"
              >
                <Regra regra={r} />
                <BotaoAnotar texto={r} onAnotar={onAnotar} />
              </li>
            ))}
          </ul>
        </CartaoSecao>
      )}

      {ap.notaContrastiva && (
        <div className="rounded-[var(--radius-card)] border-2 border-sun/50 bg-sun-soft p-5 sm:p-6" role="note">
          <p className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-sun-ink">
            <Lightbulb className="h-5 w-5" aria-hidden />
            Atenção, falante de português!
          </p>
          <p className="max-w-[68ch] text-pretty leading-7 text-ink">
            <TextoDestacado texto={ap.notaContrastiva} termos={[]} />
          </p>
        </div>
      )}

      {ap.exemplos.length > 0 && (
        <CartaoSecao icone={<MessagesSquare className="h-5 w-5" />} titulo="Exemplos">
          <ul className="space-y-2.5">
            {ap.exemplos.map((ex, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-gray-50 p-3 pl-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[1.05rem] font-semibold text-ink" lang="en">
                    {ex.en}
                  </p>
                  <p className="text-sm text-ink-soft">{ex.pt}</p>
                </div>
                <BotaoOuvir texto={ex.en} comLento />
                <BotaoAnotar texto={`${ex.en} = ${ex.pt}`} onAnotar={onAnotar} />
              </li>
            ))}
          </ul>
        </CartaoSecao>
      )}

      {ap.vocabulario && ap.vocabulario.length > 0 && (
        <CartaoSecao icone={<BookA className="h-5 w-5" />} titulo="Vocabulário" tom="candy">
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ap.vocabulario.map((v, i) => (
              <li key={i} className="flex items-center gap-3 rounded-2xl border border-line p-2.5 pr-3">
                <BotaoOuvir texto={v.en} />
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink" lang="en">
                    {v.en}
                  </p>
                  <p className="break-words text-sm text-ink-soft">{v.pt}</p>
                </div>
              </li>
            ))}
          </ul>
        </CartaoSecao>
      )}

      <BarraAcao>
        <div className="flex sm:justify-end">
          <button type="button" onClick={onComecar} className={`${classeBotao("primario")} w-full sm:w-auto sm:min-w-56`}>
            Começar a praticar →
          </button>
        </div>
      </BarraAcao>
    </div>
  );
}

// ─── Prática ────────────────────────────────────────────────────────────────

function Pratica({
  exercicios,
  inicial,
  onMudar,
  onConcluir,
}: {
  exercicios: ExercicioPublico[];
  inicial: RascunhoLicao["pratica"];
  onMudar: (estado: RascunhoLicao["pratica"]) => void;
  onConcluir: () => void;
}) {
  const [indice, setIndice] = useState(inicial.indice);
  const [respostas, setRespostas] = useState<Record<number, Resposta>>(inicial.respostas);
  const [feedbacks, setFeedbacks] = useState<Record<number, Resultado>>(inicial.feedbacks);

  useEffect(() => {
    onMudar({ indice, respostas, feedbacks });
  }, [indice, respostas, feedbacks, onMudar]);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState("");

  const atual = exercicios[indice];
  const feedback = feedbacks[atual.id];
  const preenchida = respostaPreenchida(atual, respostas[atual.id]);
  const ultimo = indice === exercicios.length - 1;

  const doEtapa = exercicios.filter((e) => e.etapa === atual.etapa);
  const posicaoNaEtapa = doEtapa.findIndex((e) => e.id === atual.id) + 1;

  async function verificar() {
    if (verificando || feedback || !preenchida) return;
    setVerificando(true);
    setErro("");
    try {
      const res = await apiFetch(`/curso/exercicios/${atual.id}/verificar`, {
        method: "POST",
        body: JSON.stringify({ resposta: respostas[atual.id] }),
      });
      if (!res.ok) {
        setErro(
          await lerErroApi(
            res,
            res.status === 403 ? "Esta lição está bloqueada." : "Não foi possível verificar a resposta."
          )
        );
        return;
      }
      const r: Resultado = await res.json();
      setFeedbacks((f) => ({ ...f, [atual.id]: r }));
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setVerificando(false);
    }
  }

  function tentarDeNovo() {
    setFeedbacks((f) => {
      const novo = { ...f };
      delete novo[atual.id];
      return novo;
    });
    setRespostas((r) => {
      const novo = { ...r };
      delete novo[atual.id];
      return novo;
    });
  }

  function avancar() {
    setErro("");
    if (ultimo) onConcluir();
    else {
      setIndice((i) => i + 1);
      rolarParaTopo();
    }
  }

  return (
    <div className="space-y-4">
      {/* Progresso por etapa */}
      <div className="grid grid-cols-3 gap-2" aria-label="Progresso da prática">
        {etapasPratica.map((etapa) => {
          const lista = exercicios.filter((e) => e.etapa === etapa);
          if (lista.length === 0) return <div key={etapa} />;
          const feitos = lista.filter((e) => feedbacks[e.id]).length;
          const ativa = etapa === atual.etapa;
          return (
            <div key={etapa} className="min-w-0">
              <p
                className={`mb-1.5 truncate text-[11px] font-semibold sm:text-xs ${
                  ativa ? "text-grape" : "text-ink-faint"
                }`}
              >
                {rotuloEtapa[etapa]}
              </p>
              <BarraProgresso
                valor={(feitos / lista.length) * 100}
                rotulo={`${rotuloEtapa[etapa]}: ${feitos} de ${lista.length}`}
                cor={ativa ? undefined : "bg-grape/50"}
              />
            </div>
          );
        })}
      </div>

      <div className="card space-y-5 p-5 sm:p-7">
        <p className="eyebrow inline-flex items-center gap-1.5 rounded-full bg-grape-soft px-2.5 py-1 text-grape">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {rotuloEtapa[atual.etapa]} · {posicaoNaEtapa} de {doEtapa.length}
        </p>
        <Exercicio
          key={atual.id}
          item={atual}
          value={respostas[atual.id]}
          onChange={(v) => setRespostas((r) => ({ ...r, [atual.id]: v }))}
          disabled={!!feedback || verificando}
          feedback={feedback}
          onSubmit={() => {
            if (feedback) avancar();
            else void verificar();
          }}
        />

        {feedback && <FeedbackResultado resultado={feedback} ouvir={respostaEmIngles(atual)} />}
        {erro && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink" role="alert">
            {erro}
          </p>
        )}
      </div>

      <BarraAcao tom={feedback ? (feedback.correto ? "certo" : "errado") : "neutro"}>
        <div className="flex gap-2.5 sm:justify-end sm:gap-3">
          {feedback ? (
            <>
              {!feedback.correto && (
                <button type="button" onClick={tentarDeNovo} className={`${classeBotao("secundario")} px-4`}>
                  <RotateCcw className="h-[18px] w-[18px]" aria-hidden />
                  Tentar de novo
                </button>
              )}
              <button
                type="button"
                onClick={avancar}
                className={`${classeBotao(feedback.correto ? "sucesso" : "erro")} flex-1 sm:flex-none sm:min-w-48`}
                autoFocus
              >
                {ultimo ? "Ir para o mini-quiz →" : "Continuar →"}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={avancar} className={classeBotao("fantasma")}>
                Pular
              </button>
              <button
                type="button"
                onClick={() => void verificar()}
                disabled={!preenchida || verificando}
                className={`${classeBotao("primario")} flex-1 sm:flex-none sm:min-w-48`}
              >
                {verificando ? "Verificando…" : "Verificar"}
              </button>
            </>
          )}
        </div>
      </BarraAcao>
    </div>
  );
}

// ─── Mini-quiz ──────────────────────────────────────────────────────────────

function Quiz({
  licaoId,
  itens,
  inicial,
  onMudar,
  onResultado,
}: {
  licaoId: number;
  itens: ExercicioPublico[];
  inicial: Record<number, Resposta>;
  onMudar: (respostas: Record<number, Resposta>) => void;
  onResultado: (r: ResultadoQuiz, respostas: Record<number, Resposta>) => void;
}) {
  const [respostas, setRespostas] = useState<Record<number, Resposta>>(inicial);

  useEffect(() => {
    onMudar(respostas);
  }, [respostas, onMudar]);
  const [enviando, setEnviando] = useState(false);
  const [confirmarIncompleto, setConfirmarIncompleto] = useState(false);
  const [erro, setErro] = useState("");

  const faltando = itens.filter((it) => !respostaPreenchida(it, respostas[it.id])).length;

  async function enviar() {
    if (enviando) return;
    if (faltando > 0 && !confirmarIncompleto) {
      setConfirmarIncompleto(true);
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const corpo: Record<number, Resposta> = {};
      for (const it of itens) corpo[it.id] = respostaParaEnvio(it, respostas[it.id]);
      const res = await apiFetch(`/curso/licoes/${licaoId}/quiz`, {
        method: "POST",
        body: JSON.stringify({ respostas: corpo }),
      });
      if (!res.ok) {
        setErro(await lerErroApi(res, "Não foi possível enviar o quiz."));
        return;
      }
      const r: ResultadoQuiz = await res.json();
      onResultado(r, respostas);
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  }

  const respondidas = itens.length - faltando;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-[var(--radius-card)] border border-grape/15 bg-grape-mist p-4 text-sm leading-relaxed text-ink">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-grape text-white" aria-hidden>
          <ListChecks className="h-5 w-5" />
        </span>
        <p>
          Responda todas as questões e envie no final. Você precisa de <strong>{LIMIAR_QUIZ}%</strong> para concluir a
          lição. A correção aparece só depois do envio.
        </p>
      </div>
      <ol className="space-y-4">
        {itens.map((it, i) => (
          <li key={it.id} className="card p-5 sm:p-6">
            <Exercicio
              item={it}
              numero={`${i + 1}.`}
              value={respostas[it.id]}
              onChange={(v) => {
                setConfirmarIncompleto(false);
                setRespostas((r) => ({ ...r, [it.id]: v }));
              }}
              disabled={enviando}
            />
          </li>
        ))}
      </ol>
      {erro && (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink" role="alert">
          {erro}
        </p>
      )}
      <BarraAcao>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <p
              className={`text-sm font-medium ${confirmarIncompleto ? "text-danger-ink" : "text-ink-soft"}`}
              aria-live="polite"
            >
              {confirmarIncompleto
                ? `Ainda faltam ${faltando} ${faltando === 1 ? "questão" : "questões"} — elas contam como erradas. Enviar mesmo assim?`
                : faltando > 0
                  ? `${respondidas} de ${itens.length} respondidas`
                  : "Tudo respondido!"}
            </p>
            {!confirmarIncompleto && (
              <div className="mt-1.5" aria-hidden>
                <BarraProgresso valor={(respondidas / itens.length) * 100} rotulo="Questões respondidas" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={enviando}
            className={`${classeBotao("primario")} sm:min-w-48`}
          >
            {enviando ? "Enviando…" : confirmarIncompleto ? "Enviar mesmo assim" : "Enviar respostas"}
          </button>
        </div>
      </BarraAcao>
    </div>
  );
}

// ─── Resultado do quiz ──────────────────────────────────────────────────────

function AnelPercentual({ pct, aprovado }: { pct: number; aprovado: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-gray-100" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, pct)) / 100)}
          className={`transition-[stroke-dashoffset] duration-1000 ease-out ${aprovado ? "stroke-success-bright" : "stroke-sun"}`}
        />
      </svg>
      <p
        className={`absolute inset-0 flex items-center justify-center font-display text-4xl font-semibold ${
          aprovado ? "text-success-ink" : "text-sun-ink"
        }`}
      >
        {pct}%
      </p>
    </div>
  );
}

function ResultadoQuizTela({
  licao,
  itens,
  resultado,
  respostas,
  onRefazer,
  onRever,
}: {
  licao: LicaoDetalhe;
  itens: ExercicioPublico[];
  resultado: ResultadoQuiz;
  respostas: Record<number, Resposta>;
  onRefazer: () => void;
  onRever: () => void;
}) {
  const porId = new Map(resultado.resultados.map((r) => [r.exercicioId, r]));
  const pct = Math.round(resultado.percentual);
  return (
    <div className="space-y-6">
      <div
        className={`relative animate-pop-in overflow-hidden rounded-[1.75rem] border-2 p-6 text-center sm:p-8 ${
          resultado.aprovado
            ? "border-success-bright/30 bg-gradient-to-b from-success-soft to-card"
            : "border-sun/40 bg-gradient-to-b from-sun-soft to-card"
        }`}
      >
        <p className="mb-2 text-4xl" aria-hidden>
          {resultado.aprovado ? "🎉" : "💪"}
        </p>
        <AnelPercentual pct={pct} aprovado={resultado.aprovado} />
        <p className="mt-3 font-display text-2xl font-semibold text-ink">
          {resultado.aprovado ? "Lição concluída!" : "Tente de novo"}
        </p>
        <p className="mx-auto mt-1 max-w-md text-ink-soft">
          {resultado.aprovado
            ? "Muito bem! Você atingiu a nota para avançar."
            : `Você precisa de ${LIMIAR_QUIZ}% para concluir. Revise as respostas abaixo e tente outra vez.`}
        </p>
        {resultado.xpGanho > 0 && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sun px-4 py-1.5 font-display text-lg font-semibold text-gray-950 shadow-[0_3px_0_0_var(--color-sun-ink)]">
            <Zap className="h-5 w-5 fill-current" aria-hidden />+{resultado.xpGanho} XP
          </p>
        )}
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
          {resultado.licaoConcluida && resultado.proximaLicaoId !== null && (
            <Link href={`/aluno/curso/licao/${resultado.proximaLicaoId}`} className={classeBotao("primario")}>
              Próxima lição →
            </Link>
          )}
          {resultado.licaoConcluida && resultado.proximaLicaoId === null && (
            <Link href={`/aluno/curso#modulo-${licao.modulo.id}`} className={classeBotao("primario")}>
              Ver o teste do módulo →
            </Link>
          )}
          {!resultado.aprovado && (
            <button type="button" onClick={onRever} className={classeBotao("secundario")}>
              Rever a explicação
            </button>
          )}
          <button
            type="button"
            onClick={onRefazer}
            className={classeBotao(resultado.licaoConcluida ? "secundario" : "primario")}
          >
            Refazer o quiz
          </button>
          <Link href="/aluno/curso" className={classeBotao("fantasma")}>
            Voltar para a trilha
          </Link>
        </div>
      </div>

      <section aria-labelledby="revisao-quiz" className="space-y-3">
        <h2 id="revisao-quiz" className="text-xl font-semibold text-ink">
          Suas respostas
        </h2>
        <ol className="space-y-3">
          {itens.map((it, i) => {
            const r = porId.get(it.id);
            return (
              <li key={it.id} className="card space-y-3 p-4 sm:p-5">
                <p className="break-words font-semibold text-ink">
                  <span className="mr-1.5 text-grape">{i + 1}.</span>
                  {it.enunciado}
                </p>
                {r ? (
                  <FeedbackResultado
                    resultado={r}
                    suaResposta={formatarResposta(it, respostas[it.id])}
                    compacto
                    ouvir={respostaEmIngles(it)}
                  />
                ) : (
                  <p className="text-sm text-ink-soft">Sem correção para este item.</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

// ─── Player ─────────────────────────────────────────────────────────────────

const passos: { fase: Fase; rotulo: string }[] = [
  { fase: "apresentacao", rotulo: "Apresentação" },
  { fase: "pratica", rotulo: "Prática" },
  { fase: "quiz", rotulo: "Mini-quiz" },
];

/** Player de lição no método PPP: apresentação → prática (controlada, semicontrolada, produção) → mini-quiz. */
export function PlayerLicao({ licao }: { licao: LicaoDetalhe }) {
  const [tentativaQuiz, setTentativaQuiz] = useState(0);
  const [resultado, setResultado] = useState<{ r: ResultadoQuiz; respostas: Record<number, Resposta> } | null>(
    null
  );
  const notas = useNotaLicao(licao.id, licao.nota);
  const [notasAbertas, setNotasAbertas] = useState(false);

  // Folha de notas no celular: Esc fecha e a página de trás não rola
  useEffect(() => {
    if (!notasAbertas) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setNotasAbertas(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", fechar);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", fechar);
    };
  }, [notasAbertas]);

  const praticas = useMemo(
    () =>
      licao.exercicios
        .filter((e) => e.etapa !== "quiz")
        .sort((a, b) => ordemEtapas.indexOf(a.etapa) - ordemEtapas.indexOf(b.etapa) || a.ordem - b.ordem),
    [licao.exercicios]
  );
  const quiz = useMemo(
    () => licao.exercicios.filter((e) => e.etapa === "quiz").sort((a, b) => a.ordem - b.ordem),
    [licao.exercicios]
  );

  // Retoma de onde parou (atualizar a página ou sair no meio não zera a lição)
  const [rascunho, setRascunho] = useState(() => lerRascunho(licao.id, praticas, quiz));
  const [fase, setFase] = useState<Fase>(() =>
    rascunho.fase === "pratica" && praticas.length === 0 ? "quiz" : rascunho.fase
  );
  const [alcancada, setAlcancada] = useState(rascunho.alcancada);

  useEffect(() => {
    if (fase === "resultado") apagarRascunho(licao.id);
    else salvarRascunho(licao.id, { ...rascunho, fase, alcancada });
  }, [licao.id, rascunho, fase, alcancada]);

  const mudarPratica = useCallback((pratica: RascunhoLicao["pratica"]) => setRascunho((r) => ({ ...r, pratica })), []);
  const mudarQuiz = useCallback(
    (respostas: Record<number, Resposta>) => setRascunho((r) => ({ ...r, quiz: { respostas } })),
    []
  );

  function irPara(nova: Fase) {
    // Sem exercícios de prática, vai direto ao quiz
    const destino = nova === "pratica" && praticas.length === 0 ? "quiz" : nova;
    setFase(destino);
    const idx = passos.findIndex((p) => p.fase === (destino === "resultado" ? "quiz" : destino));
    setAlcancada((a) => Math.max(a, idx));
    rolarParaTopo();
  }

  const indiceAtual = passos.findIndex((p) => p.fase === (fase === "resultado" ? "quiz" : fase));

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <Link
          href="/aluno/curso"
          className="-ml-1 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-1 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <span className="line-clamp-1">
            Trilha · Módulo {licao.modulo.ordem}: {licao.modulo.titulo}
          </span>
        </Link>
        <h1 className="mt-1 break-words text-[1.75rem] font-semibold leading-tight text-ink sm:text-3xl">
          <span className="block font-sans text-sm font-bold uppercase tracking-[0.12em] text-grape">
            Lição {licao.ordem}<span className="sr-only">:</span>
          </span>{" "}
          {licao.titulo}
        </h1>
        <p className="mt-1.5 text-ink-soft">{licao.objetivo}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-ink-soft ring-1 ring-line">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span>
              <span className="sr-only">· </span>
              {licao.minutosEstimados} min
            </span>
          </span>
          {licao.progresso.concluida && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-success-ink">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              Concluída · {Math.round(licao.progresso.melhorPercentual)}%
            </span>
          )}
          <button
            type="button"
            onClick={() => setNotasAbertas(true)}
            aria-haspopup="dialog"
            className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-sun-soft px-3.5 text-sun-ink ring-1 ring-sun/40 hover:ring-sun focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30 lg:hidden"
          >
            <NotebookPen className="h-4 w-4" aria-hidden />
            Minhas notas
            {notas.texto.trim() !== "" && (
              <>
                <span className="h-2 w-2 rounded-full bg-sun-ink" aria-hidden />
                <span className="sr-only">(com anotações)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">

      <nav aria-label="Etapas da lição">
        <ol className="grid grid-cols-3 gap-1.5 rounded-2xl bg-card p-1.5 ring-1 ring-line">
          {passos.map((p, i) => {
            const atual = i === indiceAtual;
            const liberado = i <= alcancada || licao.progresso.concluida;
            const feito = i < indiceAtual;
            return (
              <li key={p.fase}>
                <button
                  type="button"
                  disabled={!liberado || atual}
                  onClick={() => irPara(p.fase)}
                  aria-current={atual ? "step" : undefined}
                  className={`flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30 sm:text-sm ${
                    atual
                      ? "bg-grape text-white shadow-[0_3px_0_0_var(--color-grape-strong)]"
                      : liberado
                        ? "text-grape hover:bg-grape-mist"
                        : "cursor-not-allowed text-gray-400"
                  }`}
                >
                  <span
                    className={`hidden h-5 w-5 items-center justify-center rounded-full text-[11px] sm:flex ${
                      atual ? "bg-white/25" : feito ? "bg-grape-soft" : "bg-gray-100"
                    }`}
                  >
                    {feito ? <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden /> : i + 1}
                  </span>
                  <span className="sr-only sm:hidden">{i + 1}. </span>
                  {p.rotulo}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {fase === "apresentacao" && (
        <Apresentacao licao={licao} onComecar={() => irPara("pratica")} onAnotar={notas.anotar} />
      )}

      {fase === "pratica" && praticas.length > 0 && (
        <Pratica
          exercicios={praticas}
          inicial={rascunho.pratica}
          onMudar={mudarPratica}
          onConcluir={() => irPara("quiz")}
        />
      )}

      {licao.apresentacao.missao && (
        <div hidden={fase !== "pratica" && fase !== "resultado"}>
          <MissaoLicao key={licao.id} missao={licao.apresentacao.missao} onAnotar={notas.anotar} espacoNotas={NOTA_MAX - notas.texto.trimEnd().length - (notas.texto.trim() ? 1 : 0)} />
        </div>
      )}

      {fase === "quiz" &&
        (quiz.length === 0 ? (
          <div className="card p-6 text-ink-soft">Esta lição ainda não tem mini-quiz. Avise a professora.</div>
        ) : (
          <Quiz
            key={tentativaQuiz}
            licaoId={licao.id}
            itens={quiz}
            inicial={rascunho.quiz.respostas}
            onMudar={mudarQuiz}
            onResultado={(r, respostas) => {
              setRascunho((d) => ({ ...d, quiz: { respostas: {} } }));
              setResultado({ r, respostas });
              setFase("resultado");
              rolarParaTopo();
            }}
          />
        ))}

      {fase === "resultado" && resultado && (
        <ResultadoQuizTela
          licao={licao}
          itens={quiz}
          resultado={resultado.r}
          respostas={resultado.respostas}
          onRefazer={() => {
            setRascunho((r) => ({ ...r, quiz: { respostas: {} } }));
            setTentativaQuiz((t) => t + 1);
            setResultado(null);
            irPara("quiz");
          }}
          onRever={() => irPara("apresentacao")}
        />
      )}
      </div>

      {/* Desktop: caderno sempre à mão, preso ao lado da lição */}
      <aside className="card sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto p-5 lg:block">
        <PainelNotas notas={notas} idCampo="notas-lateral" />
      </aside>
      </div>

      {/* Celular/tablet: as mesmas notas numa folha que sobe de baixo */}
      {notasAbertas && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-labelledby="notas-folha-titulo">
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default bg-gray-950/50 backdrop-blur-[2px]"
            onClick={() => setNotasAbertas(false)}
            aria-label="Fechar notas"
            tabIndex={-1}
          />
          <div className="pb-safe absolute inset-x-0 bottom-0 flex h-[min(85dvh,40rem)] animate-rise flex-col rounded-t-[1.75rem] border-t border-line bg-card px-5 pt-3">
            <span className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
            <PainelNotas notas={notas} idCampo="notas-folha" onFechar={() => setNotasAbertas(false)} linhas={8} />
          </div>
        </div>
      )}
    </div>
  );
}
