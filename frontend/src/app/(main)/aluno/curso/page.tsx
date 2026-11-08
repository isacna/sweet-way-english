"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Flame, Hourglass, Lock, Play, Repeat2, Trophy, Zap } from "lucide-react";
import { BarraProgresso, Carregando, Aviso, classeBotao } from "@/components/curso/ui";
import { apiFetch } from "@/lib/api";
import {
  formatarDataHora,
  lerErroApi,
  proximoPasso,
  type ModuloTrilha,
  type Trilha,
} from "@/lib/curso";

const metodologias = [
  {
    id: "gramatica",
    nome: "Gramática estruturada",
    descricao: "Explicação clara em português, prática guiada e produção. Ideal para quem gosta de entender as regras.",
  },
  {
    id: "comunicativa",
    nome: "Comunicativa (tarefas)",
    descricao: "Aprender usando o inglês para resolver situações reais.",
  },
  {
    id: "input",
    nome: "Input compreensível",
    descricao: "Muita leitura e escuta em nível adequado.",
  },
] as const;

function moduloEmEspera(m: ModuloTrilha) {
  return !!m.teste.bloqueadoAte && new Date(m.teste.bloqueadoAte) > new Date();
}

function BotaoTeste({ modulo }: { modulo: ModuloTrilha }) {
  const { teste } = modulo;
  const href = `/aluno/curso/modulo/${modulo.id}/teste`;
  if (teste.aprovado) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-sm font-semibold text-success-ink">
          <Trophy className="h-4 w-4" aria-hidden />
          <span>
            <span className="sr-only">✓ </span>Teste aprovado
            {teste.melhorPercentual !== null ? ` · ${Math.round(teste.melhorPercentual)}%` : ""}
          </span>
        </span>
        <Link href={href} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-grape hover:underline">
          Refazer teste
        </Link>
      </div>
    );
  }
  if (moduloEmEspera(modulo)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-3 py-1.5 text-sm font-semibold text-sun-ink">
        <Hourglass className="h-4 w-4" aria-hidden />
        Nova tentativa a partir de {formatarDataHora(teste.bloqueadoAte!)}
      </span>
    );
  }
  if (teste.disponivel) {
    return (
      <Link href={href} className={`${classeBotao("primario")} w-full sm:w-auto`}>
        <Trophy className="h-5 w-5" aria-hidden />
        Fazer o teste do módulo
        {teste.melhorPercentual !== null && (
          <span className="text-xs font-medium opacity-85">(melhor: {Math.round(teste.melhorPercentual)}%)</span>
        )}
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-ink-soft">
      <Lock className="h-4 w-4" aria-hidden />
      Teste do módulo: conclua todas as lições
    </span>
  );
}

function CartaoModulo({
  modulo,
  aberto,
  onToggle,
}: {
  modulo: ModuloTrilha;
  aberto: boolean;
  onToggle: () => void;
}) {
  const pct = modulo.totalLicoes > 0 ? (modulo.licoesConcluidas / modulo.totalLicoes) * 100 : 0;
  const bloqueado = !modulo.desbloqueado;
  const aprovado = modulo.teste.aprovado;
  const painelId = `modulo-painel-${modulo.id}`;
  // A lição "da vez": a primeira liberada e ainda não concluída
  const atualId = modulo.licoes.find((l) => l.desbloqueada && !l.concluida)?.id;

  return (
    <section
      id={`modulo-${modulo.id}`}
      className={`scroll-mt-24 overflow-hidden rounded-[var(--radius-card)] border-2 transition-colors ${
        bloqueado
          ? "border-line bg-card/50"
          : aberto
            ? "border-grape/40 bg-card"
            : "border-line bg-card hover:border-line-strong"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="flex w-full items-start gap-3.5 p-4 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-grape/30 sm:gap-4 sm:p-5"
      >
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-xl font-semibold ${
            bloqueado
              ? "bg-gray-100 text-gray-400"
              : aprovado
                ? "bg-success text-white shadow-[0_3px_0_0_var(--color-success-strong)]"
                : "bg-grape text-white shadow-[0_3px_0_0_var(--color-grape-strong)]"
          }`}
          aria-hidden
        >
          {bloqueado ? <Lock className="h-5 w-5" /> : aprovado ? <Check className="h-6 w-6" strokeWidth={3} /> : modulo.ordem}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`eyebrow ${bloqueado ? "text-ink-faint" : "text-grape"}`}>
            Módulo {modulo.ordem} · {modulo.tema}
          </p>
          <h3 className={`mt-0.5 break-words text-xl font-semibold ${bloqueado ? "text-ink-soft" : "text-ink"}`}>
            {modulo.titulo}
          </h3>
          <div className="mt-2.5 flex items-center gap-3">
            <BarraProgresso
              valor={pct}
              rotulo={`Progresso do módulo ${modulo.ordem}`}
              cor={aprovado ? "bg-success-bright" : undefined}
            />
            <span className="shrink-0 text-xs font-semibold text-ink-soft">
              {modulo.licoesConcluidas}/{modulo.totalLicoes} lições
            </span>
          </div>
          {bloqueado && (
            <p className="mt-2 text-xs text-ink-faint">Passe no teste do módulo anterior para liberar.</p>
          )}
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-ink-faint transition-transform ${aberto ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {aberto && (
        <div id={painelId} className="space-y-4 px-4 pb-5 sm:px-5">
          {modulo.descricao && <p className="text-sm leading-relaxed text-ink-soft">{modulo.descricao}</p>}
          {modulo.canDos.length > 0 && (
            <div className="rounded-2xl bg-grape-mist p-4">
              <p className="mb-2 text-sm font-semibold text-ink">Ao final, você vai conseguir:</p>
              <ul className="space-y-1.5 text-sm text-ink-soft">
                {modulo.canDos.map((c) => (
                  <li key={c} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-grape" strokeWidth={3} aria-hidden />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trilha de lições: nós ligados por uma linha */}
          <ol className="relative">
            {modulo.licoes.map((l, idx) => {
              const daVez = l.id === atualId;
              const ultimo = idx === modulo.licoes.length - 1;
              const conteudo = (
                <>
                  <span className="relative flex w-12 shrink-0 justify-center self-stretch" aria-hidden>
                    {!ultimo && (
                      <span
                        className={`absolute left-1/2 top-1/2 h-full w-1 -translate-x-1/2 rounded-full ${
                          l.concluida ? "bg-success-bright/60" : "bg-gray-200"
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 my-auto flex items-center justify-center rounded-full font-display font-semibold ${
                        l.concluida
                          ? "h-10 w-10 bg-success text-white shadow-[0_3px_0_0_var(--color-success-strong)]"
                          : daVez
                            ? "h-12 w-12 bg-grape text-lg text-white shadow-[0_4px_0_0_var(--color-grape-strong)] ring-4 ring-grape-soft"
                            : l.desbloqueada
                              ? "h-10 w-10 bg-grape-soft text-grape"
                              : "h-10 w-10 bg-gray-100 text-gray-400"
                      }`}
                    >
                      {l.concluida ? (
                        <Check className="h-5 w-5" strokeWidth={3} />
                      ) : l.desbloqueada ? (
                        l.ordem
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 py-3">
                    <span className={`block break-words font-semibold ${l.desbloqueada ? "text-ink" : "text-ink-soft"}`}>
                      {l.titulo}
                    </span>
                    <span className="block break-words text-xs leading-relaxed text-ink-faint">
                      {l.objetivo} · {l.minutosEstimados} min
                    </span>
                  </span>
                  <span className="shrink-0 pr-1 text-xs font-semibold">
                    {l.concluida ? (
                      <span className="rounded-full bg-success-soft px-2 py-1 text-success-ink">
                        {Math.round(l.melhorPercentual)}%
                      </span>
                    ) : l.desbloqueada ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 ${
                          daVez ? "bg-grape text-white" : "text-grape"
                        }`}
                      >
                        Começar →
                      </span>
                    ) : (
                      <span className="text-ink-faint">Bloqueada</span>
                    )}
                  </span>
                </>
              );
              return (
                <li key={l.id}>
                  {l.desbloqueada ? (
                    <Link
                      href={`/aluno/curso/licao/${l.id}`}
                      className={`flex min-h-[64px] items-center gap-3 rounded-2xl pr-2 transition-colors hover:bg-grape-mist focus:outline-none focus-visible:ring-4 focus-visible:ring-grape/30 ${
                        daVez ? "bg-grape-mist/70" : ""
                      }`}
                      aria-label={`Lição ${l.ordem}: ${l.titulo}${l.concluida ? " (concluída)" : ""}`}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <div
                      className="flex min-h-[64px] items-center gap-3 pr-2"
                      aria-label={`Lição ${l.ordem}: ${l.titulo} (bloqueada)`}
                    >
                      {conteudo}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {!bloqueado && (
            <div className="border-t border-line pt-4">
              <BotaoTeste modulo={modulo} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Estatistica({
  icone,
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  tom: "sun" | "flame" | "grape";
}) {
  const cor = {
    sun: "bg-sun text-gray-950",
    flame: "bg-flame text-white",
    grape: "bg-grape text-white",
  }[tom];
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-line bg-gray-50/80 p-3 sm:p-4">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cor}`} aria-hidden>
        {icone}
      </span>
      <p className="mt-2 font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">{valor}</p>
      <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft sm:text-xs">{rotulo}</p>
      {detalhe && <div className="mt-1 text-[11px] leading-snug text-ink-faint sm:text-xs">{detalhe}</div>}
    </div>
  );
}

export default function TrilhaCursoPage() {
  const router = useRouter();
  const [trilha, setTrilha] = useState<Trilha | null>(null);
  const [erro, setErro] = useState("");
  const [abertos, setAbertos] = useState<Set<number>>(new Set());

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
        if (!res.ok) {
          setErro(await lerErroApi(res, "Não foi possível carregar o curso."));
          return;
        }
        const data: Trilha = await res.json();
        if (cancelled) return;
        // Abre o módulo em andamento (ou o hash da URL, ex.: vindo do teste)
        const passo = proximoPasso(data);
        const inicial = new Set<number>();
        const hash = typeof window !== "undefined" ? window.location.hash.match(/^#modulo-(\d+)$/) : null;
        if (hash) inicial.add(Number(hash[1]));
        else if (passo.tipo === "licao" || passo.tipo === "teste" || passo.tipo === "espera") inicial.add(passo.modulo.id);
        setAbertos(inicial);
        setTrilha(data);
      } catch {
        if (!cancelled) setErro("Não foi possível conectar ao servidor.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (erro) return <Aviso titulo="Ops!" texto={erro} acao={<Link href="/aluno" className={classeBotao("secundario")}>Voltar ao painel</Link>} />;
  if (!trilha) return <Carregando texto="Carregando sua trilha…" />;

  const { perfil } = trilha;
  const passo = proximoPasso(trilha);
  const semConteudo = passo.tipo === "vazio";

  function alternar(id: number) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      {/* Cabeçalho com estatísticas e próximo passo */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-card p-4 pb-5 sm:p-6">
        <span
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-grape/30 blur-3xl"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-28 -left-12 h-56 w-56 rounded-full bg-candy-bright/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <h1 className="text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-3xl">Meu curso de inglês</h1>
          <p className="mt-1 text-ink-soft">Siga a trilha no seu ritmo: uma lição de cada vez.</p>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <Estatistica
              tom="sun"
              icone={<Zap className="h-4 w-4 fill-current" />}
              rotulo="Pontos"
              valor={<>{perfil.xp} XP</>}
            />
            <Estatistica
              tom="flame"
              icone={<Flame className="h-4 w-4 fill-current" />}
              rotulo="Ofensiva"
              valor={
                <>
                  {perfil.ofensivaAtual} {perfil.ofensivaAtual === 1 ? "dia" : "dias"}
                </>
              }
              detalhe={
                <>
                  {perfil.ofensivaAtual === 0 ? "Estude hoje para começar!" : "dias seguidos estudando"} · recorde{" "}
                  {perfil.ofensivaMaxima}
                </>
              }
            />
            <Estatistica
              tom="grape"
              icone={<Repeat2 className="h-4 w-4" />}
              rotulo="Revisões"
              valor={perfil.revisoesPendentes}
              detalhe={
                perfil.revisoesPendentes > 0 ? (
                  <Link
                    href="/aluno/curso/revisao"
                    className="mt-1 inline-flex min-h-[32px] items-center rounded-full bg-grape px-3 text-xs font-semibold text-white hover:bg-grape-strong"
                  >
                    Revisar agora
                  </Link>
                ) : (
                  "Nada para revisar hoje."
                )
              }
            />
          </div>

          {passo.tipo === "licao" && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-grape/30 bg-grape-mist p-4 text-ink sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-grape-soft text-grape"
                  aria-hidden
                >
                  <Play className="h-6 w-6 fill-current" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-soft">Próxima lição · Módulo {passo.modulo.ordem}</p>
                  <p className="break-words font-display text-lg font-semibold leading-snug">{passo.licao.titulo}</p>
                </div>
              </div>
              <Link href={`/aluno/curso/licao/${passo.licao.id}`} className={`${classeBotao("primario")} w-full sm:w-auto`}>
                Continuar
              </Link>
            </div>
          )}

          {passo.tipo === "teste" && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-grape/30 bg-grape-mist p-4 text-ink sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-soft text-sun-ink"
                  aria-hidden
                >
                  <Trophy className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-soft">
                    Todas as lições do módulo {passo.modulo.ordem} concluídas
                  </p>
                  <p className="break-words font-display text-lg font-semibold leading-snug">
                    Hora do teste: {passo.modulo.titulo}
                  </p>
                </div>
              </div>
              <Link
                href={`/aluno/curso/modulo/${passo.modulo.id}/teste`}
                className={`${classeBotao("primario")} w-full sm:w-auto`}
              >
                Fazer o teste
              </Link>
            </div>
          )}

          {passo.tipo === "fim" && (
            <p className="mt-4 rounded-2xl border border-success/30 bg-success-soft p-4 text-sm font-semibold text-success-ink">
              🎉 Parabéns! Você concluiu todo o conteúdo publicado até agora. Novas lições aparecem aqui assim que forem
              publicadas.
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="titulo-metodologia">
        <h2 id="titulo-metodologia" className="mb-3 text-lg font-semibold text-ink">
          Metodologia
        </h2>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
          {metodologias.map((m) => {
            const ativa = m.id === "gramatica";
            return (
              <div
                key={m.id}
                aria-disabled={!ativa}
                className={`w-[78%] shrink-0 snap-start rounded-2xl border-2 p-4 md:w-auto ${
                  ativa ? "border-grape/60 bg-card" : "border-dashed border-line-strong bg-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-semibold ${ativa ? "text-ink" : "text-ink-faint"}`}>{m.nome}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      ativa ? "bg-grape text-white" : "bg-gray-100 text-ink-faint"
                    }`}
                  >
                    {ativa ? "Ativa" : "Em breve"}
                  </span>
                </div>
                <p className={`mt-1 text-sm leading-relaxed ${ativa ? "text-ink-soft" : "text-ink-faint"}`}>
                  {m.descricao}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {semConteudo ? (
        <Aviso
          icone="📚"
          titulo="O curso está sendo preparado pela professora"
          texto="Assim que as primeiras lições forem revisadas e publicadas, elas aparecem aqui."
          acao={
            <Link href="/aluno" className={classeBotao("secundario")}>
              Voltar ao painel
            </Link>
          }
        />
      ) : (
        trilha.niveis
          .filter((n) => n.modulos.length > 0)
          .map((nivel) => (
            <section key={nivel.id} aria-labelledby={`nivel-${nivel.id}`} className="space-y-4">
              <div>
                <h2 id={`nivel-${nivel.id}`} className="flex items-center gap-2.5 text-xl font-semibold text-ink">
                  <span className="rounded-xl bg-grape px-2.5 py-1 font-display text-sm text-white">{nivel.codigo}</span>
                  {nivel.nome}
                </h2>
                {nivel.descricao && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{nivel.descricao}</p>}
              </div>
              <div className="space-y-3">
                {nivel.modulos.map((m) => (
                  <CartaoModulo key={m.id} modulo={m} aberto={abertos.has(m.id)} onToggle={() => alternar(m.id)} />
                ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
