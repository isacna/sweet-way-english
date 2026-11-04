"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookA,
  Check,
  Clock,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
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
import { BotaoOuvir } from "./BotaoOuvir";
import { Exercicio } from "./Exercicio";
import { FeedbackResultado } from "./FeedbackResultado";
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

function Apresentacao({ licao, onComecar }: { licao: LicaoDetalhe; onComecar: () => void }) {
  const ap = licao.apresentacao;
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="card relative overflow-hidden p-5 sm:p-6">
        <span
          className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-grape/25 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-3">
          {ap.explicacao.map((p, i) => (
            <p key={i} className="text-[1.05rem] leading-relaxed text-ink">
              {p}
            </p>
          ))}
        </div>
      </div>

      {ap.regras && ap.regras.length > 0 && (
        <CartaoSecao icone={<ListChecks className="h-5 w-5" />} titulo="Regras">
          <ul className="space-y-2.5">
            {ap.regras.map((r, i) => (
              <li key={i} className="flex gap-3 text-ink">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grape text-xs font-bold text-white"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </CartaoSecao>
      )}

      {ap.notaContrastiva && (
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border-2 border-sun/50 bg-sun-soft p-5" role="note">
          <p className="mb-1.5 flex items-center gap-2 font-display text-lg font-semibold text-sun-ink">
            <Lightbulb className="h-5 w-5" aria-hidden />
            <span>
              Atenção, falante de português!
            </span>
          </p>
          <p className="leading-relaxed text-ink">{ap.notaContrastiva}</p>
        </div>
      )}

      {ap.exemplos.length > 0 && (
        <CartaoSecao icone={<MessagesSquare className="h-5 w-5" />} titulo="Exemplos">
          <ul className="space-y-2.5">
            {ap.exemplos.map((ex, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-gray-50 p-3 pl-4"
              >
                <div className="min-w-0">
                  <p className="text-[1.05rem] font-semibold text-ink" lang="en">
                    {ex.en}
                  </p>
                  <p className="text-sm text-ink-soft">{ex.pt}</p>
                </div>
                <BotaoOuvir texto={ex.en} comLento />
              </li>
            ))}
          </ul>
        </CartaoSecao>
      )}

      {ap.vocabulario && ap.vocabulario.length > 0 && (
        <CartaoSecao icone={<BookA className="h-5 w-5" />} titulo="Vocabulário" tom="candy">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-faint">
                <th scope="col" className="py-2 pr-3 font-semibold">
                  Inglês
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Português
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ap.vocabulario.map((v, i) => (
                <tr key={i}>
                  <td className="break-words py-2 pr-3 font-semibold text-ink" lang="en">
                    <span className="inline-flex items-center gap-2.5">
                      <BotaoOuvir texto={v.en} />
                      {v.en}
                    </span>
                  </td>
                  <td className="break-words py-2 text-ink-soft">{v.pt}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
  onConcluir,
}: {
  exercicios: ExercicioPublico[];
  onConcluir: () => void;
}) {
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, Resposta>>({});
  const [feedbacks, setFeedbacks] = useState<Record<number, Resultado>>({});
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
  onResultado,
}: {
  licaoId: number;
  itens: ExercicioPublico[];
  onResultado: (r: ResultadoQuiz, respostas: Record<number, Resposta>) => void;
}) {
  const [respostas, setRespostas] = useState<Record<number, Resposta>>({});
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
  const [fase, setFase] = useState<Fase>("apresentacao");
  const [alcancada, setAlcancada] = useState(0);
  const [tentativaQuiz, setTentativaQuiz] = useState(0);
  const [resultado, setResultado] = useState<{ r: ResultadoQuiz; respostas: Record<number, Resposta> } | null>(
    null
  );

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
    <div className="mx-auto max-w-2xl space-y-5">
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
        </div>
      </div>

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

      {fase === "apresentacao" && <Apresentacao licao={licao} onComecar={() => irPara("pratica")} />}

      {fase === "pratica" && praticas.length > 0 && <Pratica exercicios={praticas} onConcluir={() => irPara("quiz")} />}

      {fase === "quiz" &&
        (quiz.length === 0 ? (
          <div className="card p-6 text-ink-soft">Esta lição ainda não tem mini-quiz. Avise a professora.</div>
        ) : (
          <Quiz
            key={tentativaQuiz}
            licaoId={licao.id}
            itens={quiz}
            onResultado={(r, respostas) => {
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
            setTentativaQuiz((t) => t + 1);
            setResultado(null);
            irPara("quiz");
          }}
          onRever={() => irPara("apresentacao")}
        />
      )}
    </div>
  );
}
