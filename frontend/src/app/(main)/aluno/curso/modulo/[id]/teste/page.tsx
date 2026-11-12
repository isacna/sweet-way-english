"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Exercicio } from "@/components/curso/Exercicio";
import { FeedbackResultado } from "@/components/curso/FeedbackResultado";
import { ArrowLeft, FastForward, Hourglass, Lock, PenLine, Repeat2, Target } from "lucide-react";
import { Aviso, BarraAcao, BarraProgresso, Carregando, classeBotao } from "@/components/curso/ui";
import { apiFetch } from "@/lib/api";
import {
  LIMIAR_TESTE_HABILIDADE,
  LIMIAR_TESTE_TOTAL,
  formatarDataHora,
  formatarResposta,
  lerErroApi,
  ordemHabilidades,
  respostaEmIngles,
  respostaParaEnvio,
  respostaPreenchida,
  rotuloHabilidade,
  type Habilidade,
  type ItemTestePublico,
  type ModuloTrilha,
  type Resposta,
  type ResultadoTeste,
  type Trilha,
} from "@/lib/curso";

type Tentativa = { tentativaId: number; forma: number; itens: ItemTestePublico[] };

type Fase =
  | { tipo: "intro" }
  | { tipo: "prova"; tentativa: Tentativa }
  | { tipo: "resultado"; tentativa: Tentativa; resultado: ResultadoTeste; respostas: Record<number, Resposta> };

function agrupar(itens: ItemTestePublico[]) {
  const grupos = new Map<Habilidade, ItemTestePublico[]>();
  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem);
  for (const h of ordemHabilidades) {
    const lista = ordenados.filter((i) => i.habilidade === h);
    if (lista.length) grupos.set(h, lista);
  }
  // Habilidades desconhecidas (não devem existir) vão no fim
  for (const it of ordenados) {
    if (!ordemHabilidades.includes(it.habilidade)) {
      grupos.set(it.habilidade, [...(grupos.get(it.habilidade) ?? []), it]);
    }
  }
  return [...grupos.entries()];
}

/** Número de cada item na ordem em que aparece (agrupado por habilidade). */
function numerar(grupos: [Habilidade, ItemTestePublico[]][]) {
  return new Map(grupos.flatMap(([, itens]) => itens).map((it, i) => [it.id, i + 1]));
}

function rotulo(h: string) {
  return rotuloHabilidade[h as Habilidade] ?? h;
}

// ─── Prova ──────────────────────────────────────────────────────────────────

function Prova({
  tentativa,
  onResultado,
}: {
  tentativa: Tentativa;
  onResultado: (r: ResultadoTeste, respostas: Record<number, Resposta>) => void;
}) {
  const [respostas, setRespostas] = useState<Record<number, Resposta>>({});
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const grupos = agrupar(tentativa.itens);
  const faltando = tentativa.itens.filter((it) => !respostaPreenchida(it, respostas[it.id])).length;
  const numeros = numerar(grupos);

  async function enviar() {
    if (enviando) return;
    if (faltando > 0 && !confirmar) {
      setConfirmar(true);
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      const corpo: Record<number, Resposta> = {};
      for (const it of tentativa.itens) corpo[it.id] = respostaParaEnvio(it, respostas[it.id]);
      const res = await apiFetch(`/curso/tentativas/${tentativa.tentativaId}`, {
        method: "POST",
        body: JSON.stringify({ respostas: corpo }),
      });
      if (!res.ok) {
        setErro(
          await lerErroApi(
            res,
            res.status === 409 ? "Esta tentativa já foi finalizada." : "Não foi possível enviar o teste."
          )
        );
        return;
      }
      onResultado(await res.json(), respostas);
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      {grupos.map(([habilidade, itens]) => (
        <section key={habilidade} aria-labelledby={`hab-${habilidade}`} className="space-y-3">
          <h2 id={`hab-${habilidade}`} className="flex items-center gap-2 text-xl font-semibold text-ink">
            <span className="h-6 w-1.5 rounded-full bg-grape" aria-hidden />
            {rotulo(habilidade)}
          </h2>
          <ol className="space-y-4">
            {itens.map((it) => {
              const numero = numeros.get(it.id);
              return (
                <li key={it.id} className="card p-5 sm:p-6">
                  <Exercicio
                    item={it}
                    numero={`${numero}.`}
                    value={respostas[it.id]}
                    onChange={(v) => {
                      setConfirmar(false);
                      setRespostas((r) => ({ ...r, [it.id]: v }));
                    }}
                    disabled={enviando}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      {erro && (
        <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium" role="alert">
          {erro}
        </p>
      )}
      <BarraAcao>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
        <p className={`flex-1 text-sm font-medium ${confirmar ? "text-danger-ink" : "text-ink-soft"}`} aria-live="polite">
          {confirmar
            ? `Ainda faltam ${faltando} ${faltando === 1 ? "questão" : "questões"} — elas contam como erradas. Enviar mesmo assim?`
            : `${tentativa.itens.length - faltando} de ${tentativa.itens.length} respondidas`}
        </p>
        <button type="button" onClick={() => void enviar()} disabled={enviando} className={`${classeBotao("primario")} sm:min-w-48`}>
          {enviando ? "Enviando…" : confirmar ? "Enviar mesmo assim" : "Finalizar teste"}
        </button>
      </div>
      </BarraAcao>
    </div>
  );
}

// ─── Resultado ──────────────────────────────────────────────────────────────

function Resultado({
  modulo,
  tentativa,
  resultado,
  respostas,
}: {
  modulo: ModuloTrilha | null;
  tentativa: Tentativa;
  resultado: ResultadoTeste;
  respostas: Record<number, Resposta>;
}) {
  const porId = new Map(resultado.resultados.map((r) => [r.itemId, r]));
  const grupos = agrupar(tentativa.itens);
  const habilidades = Object.keys(resultado.porHabilidade).sort(
    (a, b) => ordemHabilidades.indexOf(a as Habilidade) - ordemHabilidades.indexOf(b as Habilidade)
  );
  const numeros = numerar(grupos);

  return (
    <div className="space-y-6">
      <div
        className={`animate-pop-in rounded-[1.75rem] border-2 p-6 text-center sm:p-8 ${
          resultado.aprovado
            ? "border-success-bright/30 bg-gradient-to-b from-success-soft to-card"
            : "border-sun/40 bg-gradient-to-b from-sun-soft to-card"
        }`}
      >
        <p className="text-5xl mb-2" aria-hidden>
          {resultado.aprovado ? "🏆" : "📚"}
        </p>
        <p className={`font-display text-5xl font-semibold ${resultado.aprovado ? "text-success-ink" : "text-sun-ink"}`}>
          {Math.round(resultado.percentual)}%
        </p>
        <p className="mt-2 font-display text-2xl font-semibold text-ink">
          {resultado.aprovado ? "Aprovado! Módulo concluído." : "Ainda não foi dessa vez"}
        </p>
        {resultado.aprovado ? (
          <p className="text-sm text-ink-soft">
            {resultado.proximoModuloId !== null ? "O próximo módulo foi liberado." : "Parabéns pelo esforço!"}
            {modulo && modulo.licoesConcluidas < modulo.totalLicoes &&
              " As lições deste módulo continuam abertas para você estudar quando quiser."}
          </p>
        ) : (
          <p className="text-sm text-ink-soft">
            Revise as lições do módulo e as respostas abaixo.
            {resultado.bloqueadoAte && ` Você pode tentar de novo a partir de ${formatarDataHora(resultado.bloqueadoAte)}.`}
          </p>
        )}
        {resultado.xpGanho > 0 && (
          <p className="mt-4 inline-block rounded-full bg-sun px-4 py-1.5 font-display text-lg font-semibold text-gray-950 shadow-[0_3px_0_0_var(--color-sun-ink)]">
            +{resultado.xpGanho} XP
          </p>
        )}

        <div className="mx-auto mt-6 max-w-md space-y-3 rounded-2xl bg-card/80 p-4 text-left ring-1 ring-line">
          {habilidades.map((h) => {
            const v = resultado.porHabilidade[h];
            const ok = v >= LIMIAR_TESTE_HABILIDADE;
            return (
              <div key={h}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-ink">{rotulo(h)}</span>
                  <span className={ok ? "font-semibold text-success-ink" : "font-semibold text-danger-ink"}>
                    {Math.round(v)}% {ok ? "✓" : "✗"}
                  </span>
                </div>
                <BarraProgresso
                  valor={v}
                  rotulo={`${rotulo(h)}: ${Math.round(v)}%`}
                  cor={ok ? "bg-success-bright" : "bg-danger-bright"}
                  marca={LIMIAR_TESTE_HABILIDADE}
                />
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-6 flex max-w-sm flex-col justify-center gap-2.5 sm:max-w-none sm:flex-row sm:gap-3">
          {resultado.aprovado && resultado.proximoModuloId !== null && (
            <Link href={`/aluno/curso#modulo-${resultado.proximoModuloId}`} className={classeBotao("primario")}>
              Ir para o próximo módulo →
            </Link>
          )}
          {!resultado.aprovado && modulo && (
            <Link href={`/aluno/curso#modulo-${modulo.id}`} className={classeBotao("primario")}>
              Revisar as lições
            </Link>
          )}
          <Link href="/aluno/curso" className={classeBotao("secundario")}>
            Voltar para a trilha
          </Link>
        </div>
      </div>

      <section aria-labelledby="revisao-teste" className="space-y-4">
        <h2 id="revisao-teste" className="text-xl font-semibold text-ink">
          Suas respostas
        </h2>
        {grupos.map(([habilidade, itens]) => (
          <div key={habilidade} className="space-y-3">
            <h3 className="font-semibold text-grape">{rotulo(habilidade)}</h3>
            <ol className="space-y-3">
              {itens.map((it) => {
                const numero = numeros.get(it.id);
                const r = porId.get(it.id);
                return (
                  <li key={it.id} className="card p-4 space-y-3">
                    <p className="font-semibold text-ink break-words">
                      <span className="mr-1 text-grape">{numero}.</span>
                      {it.enunciado}
                    </p>
                    {it.tipo === "mcq" && it.conteudo.texto && (
                      <details className="text-sm text-ink-soft">
                        <summary className="cursor-pointer">Ver o texto</summary>
                        <p className="mt-2 whitespace-pre-line" lang="en">
                          {it.conteudo.texto}
                        </p>
                      </details>
                    )}
                    {r ? (
                      <FeedbackResultado resultado={r} suaResposta={formatarResposta(it, respostas[it.id])} compacto ouvir={respostaEmIngles(it)} />
                    ) : (
                      <p className="text-sm text-ink-soft">Sem correção para este item.</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

function TesteModulo({ id }: { id: string }) {
  const router = useRouter();
  // `?adiantar=1` (vindo da trilha): fazer o teste sem ter concluído as lições (nivelamento)
  const pediuAdiantar = useSearchParams()?.get("adiantar") === "1";
  const [carregando, setCarregando] = useState(true);
  const [modulo, setModulo] = useState<ModuloTrilha | null>(null);
  const [fase, setFase] = useState<Fase>({ tipo: "intro" });
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState("");
  const [bloqueadoAte, setBloqueadoAte] = useState<string | null>(null);

  // Carrega a trilha só para mostrar título e situação do teste na introdução
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/curso");
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/login?tipo=aluno");
          return;
        }
        if (res.ok) {
          const trilha: Trilha = await res.json();
          if (cancelled) return;
          const m = trilha.niveis.flatMap((n) => n.modulos).find((x) => String(x.id) === id) ?? null;
          setModulo(m);
          if (m?.teste.bloqueadoAte && new Date(m.teste.bloqueadoAte) > new Date()) {
            setBloqueadoAte(m.teste.bloqueadoAte);
          }
        }
      } catch {
        // Sem a trilha, a introdução mostra só as regras
      } finally {
        if (!cancelled) setCarregando(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function iniciar() {
    if (iniciando) return;
    setIniciando(true);
    setErro("");
    try {
      const res = await apiFetch(`/curso/modulos/${encodeURIComponent(id)}/teste`, {
        method: "POST",
        ...(adiantando && { body: JSON.stringify({ adiantar: true }) }),
      });
      if (res.status === 423) {
        const data = await res.json().catch(() => ({}));
        setBloqueadoAte(typeof data?.bloqueadoAte === "string" ? data.bloqueadoAte : null);
        setErro(typeof data?.error === "string" ? data.error : "O teste está em espera.");
        return;
      }
      if (res.status === 409) {
        setErro(await lerErroApi(res, "Conclua todas as lições do módulo antes de fazer o teste."));
        return;
      }
      if (res.status === 403) {
        setErro(await lerErroApi(res, "Este módulo ainda está bloqueado."));
        return;
      }
      if (res.status === 404) {
        setErro("Módulo não encontrado.");
        return;
      }
      if (!res.ok) {
        setErro(await lerErroApi(res, "Não foi possível iniciar o teste."));
        return;
      }
      const tentativa: Tentativa = await res.json();
      setFase({ tipo: "prova", tentativa });
      window.scrollTo({ top: 0 });
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setIniciando(false);
    }
  }

  if (carregando) return <Carregando />;

  const titulo = modulo ? `Teste do módulo ${modulo.ordem}: ${modulo.titulo}` : "Teste do módulo";
  const emEspera = !!bloqueadoAte && new Date(bloqueadoAte) > new Date();
  // Faltam lições e o módulo ainda não foi aprovado (aprovado pode refazer para treinar, mesmo sem as lições)
  const licoesIncompletas = modulo ? modulo.licoesConcluidas < modulo.totalLicoes && !modulo.teste.aprovado : false;
  // Só adianta quem pediu e pode; em espera, a mensagem de espera basta
  const adiantando = pediuAdiantar && licoesIncompletas && !!modulo?.teste.podeAdiantar;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/aluno/curso" className="-ml-1 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-1 text-sm font-medium text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Trilha
        </Link>
        <h1 className="mt-1 break-words text-[1.75rem] font-semibold leading-tight text-ink sm:text-3xl">{titulo}</h1>
      </div>

      {fase.tipo === "intro" &&
        (modulo && !modulo.desbloqueado ? (
          <Aviso icone="🔒" titulo="Módulo bloqueado" texto="Passe no teste do módulo anterior para liberar este." />
        ) : (
          <div className="card space-y-5 p-5 sm:p-7">
            {modulo?.teste.aprovado && (
              <p className="p-3 rounded-2xl bg-success-soft text-success-ink text-sm font-medium">
                ✓ Você já foi aprovado neste teste
                {modulo.teste.melhorPercentual !== null && ` (melhor nota: ${Math.round(modulo.teste.melhorPercentual)}%)`}.
                Pode refazer para treinar.
              </p>
            )}
            <div>
              <h2 className="mb-3 text-xl font-semibold text-ink">Como funciona</h2>
              <ul className="space-y-3 text-ink">
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-grape-soft text-grape" aria-hidden>
                    <PenLine className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    Questões de {ordemHabilidades.map((h) => rotuloHabilidade[h].toLowerCase()).join(", ")}. A correção
                    aparece só no final.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-candy-soft text-candy" aria-hidden>
                    <Target className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    Para passar: pelo menos <strong>{LIMIAR_TESTE_TOTAL}% no total</strong> e{" "}
                    <strong>{LIMIAR_TESTE_HABILIDADE}% em cada habilidade</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sun-soft text-sun-ink" aria-hidden>
                    <Hourglass className="h-[18px] w-[18px]" />
                  </span>
                  <span>
                    Se não passar, você pode tentar de novo depois de <strong>24 horas</strong> — use esse tempo para
                    revisar.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-grape-soft text-grape" aria-hidden>
                    <Repeat2 className="h-[18px] w-[18px]" />
                  </span>
                  <span>Tentativas ilimitadas; cada uma pode trazer questões diferentes.</span>
                </li>
              </ul>
            </div>

            {modulo?.teste.tentativas ? (
              <p className="text-sm text-ink-soft">
                Tentativas até agora: {modulo.teste.tentativas}
                {modulo.teste.melhorPercentual !== null && ` · melhor nota ${Math.round(modulo.teste.melhorPercentual)}%`}
              </p>
            ) : null}

            {emEspera && (
              <p className="flex items-center gap-2 rounded-2xl bg-sun-soft p-3 text-sm font-semibold text-sun-ink" role="status">
                <Hourglass className="h-4 w-4 shrink-0" aria-hidden /> Nova tentativa a partir de {formatarDataHora(bloqueadoAte!)}.
              </p>
            )}
            {adiantando && !emEspera && (
              <div className="space-y-2 rounded-2xl bg-grape-mist p-4 text-sm text-ink ring-1 ring-grape/30" role="status">
                <p className="flex items-center gap-2 font-semibold">
                  <FastForward className="h-4 w-4 shrink-0 text-grape" aria-hidden />
                  Você vai fazer o teste sem ter concluído as lições ({modulo!.licoesConcluidas}/{modulo!.totalLicoes})
                </p>
                <ul className="list-disc space-y-1 pl-5 text-ink-soft">
                  <li>
                    <strong className="text-ink">Se passar:</strong> o módulo fica concluído e o próximo é liberado. As
                    lições deste módulo continuam abertas para estudar quando quiser.
                  </li>
                  <li>
                    <strong className="text-ink">Se não passar:</strong> só dá para tentar de novo depois de 24 horas.
                    Enquanto isso, as lições seguem disponíveis.
                  </li>
                </ul>
                <p className="text-ink-soft">Vale a pena só se você já conhece bem este conteúdo.</p>
              </div>
            )}
            {licoesIncompletas && !adiantando && !emEspera && (
              <p className="flex items-start gap-2 rounded-2xl bg-gray-50 p-3 text-sm text-ink-soft ring-1 ring-line" role="status">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>Conclua todas as lições do módulo ({modulo!.licoesConcluidas}/{modulo!.totalLicoes}) para liberar o
                teste.</span>
              </p>
            )}
            {erro && !emEspera && (
              <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium" role="alert">
                {erro}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Link href="/aluno/curso" className={classeBotao("secundario")}>
                Voltar
              </Link>
              <button
                type="button"
                onClick={() => void iniciar()}
                disabled={iniciando || emEspera || (licoesIncompletas && !adiantando)}
                className={classeBotao("primario")}
              >
                {iniciando ? "Preparando…" : "Começar o teste"}
              </button>
            </div>
          </div>
        ))}

      {fase.tipo === "prova" && (
        <Prova
          tentativa={fase.tentativa}
          onResultado={(resultado, respostas) => {
            setFase({ tipo: "resultado", tentativa: fase.tentativa, resultado, respostas });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {fase.tipo === "resultado" && (
        <Resultado modulo={modulo} tentativa={fase.tentativa} resultado={fase.resultado} respostas={fase.respostas} />
      )}
    </div>
  );
}

export default function TesteModuloPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  // Suspense: TesteModulo lê a query (`?adiantar=1`) com useSearchParams
  return (
    <Suspense fallback={<Carregando />}>
      <TesteModulo key={id} id={id} />
    </Suspense>
  );
}
