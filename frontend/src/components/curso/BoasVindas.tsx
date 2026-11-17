"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, PencilLine, Repeat2, type LucideIcon } from "lucide-react";
import { LogoSwirl } from "@/components/BrandMark";
import { CaixaMarcar, Mensagem } from "@/components/painel/ui";
import { proximoPasso, type Trilha } from "@/lib/curso";
import { salvarPerfil } from "@/lib/trilha";
import { EscolhaMeta } from "./MetaDiaria";
import { classeBotao } from "./ui";

const PASSOS = 3;

/** Frases em inglês que flutuam em volta do logo na primeira tela. */
const FRASES: { texto: string; classe: string; atraso: string }[] = [
  { texto: "Hello!", classe: "left-[2%] top-[8%] bg-candy-soft text-candy", atraso: "0s" },
  { texto: "Nice to meet you", classe: "right-0 top-[20%] bg-sky-soft text-sky-ink", atraso: "0.6s" },
  { texto: "How are you?", classe: "left-0 bottom-[18%] bg-sun-soft text-sun-ink", atraso: "1.2s" },
  { texto: "Let's go!", classe: "right-[6%] bottom-[6%] bg-success-soft text-success-ink", atraso: "1.8s" },
];

const COMO_FUNCIONA: { Icone: LucideIcon; cor: string; titulo: string; texto: string }[] = [
  { Icone: BookOpen, cor: "bg-grape-soft text-grape", titulo: "Entenda", texto: "Uma explicação curta, em português, com exemplos que você pode ouvir." },
  { Icone: PencilLine, cor: "bg-sun-soft text-sun-ink", titulo: "Pratique", texto: "Exercícios com correção na hora e um mini-quiz para fechar a lição." },
  { Icone: Repeat2, cor: "bg-candy-soft text-candy", titulo: "Revise", texto: "O que você errar volta nos dias seguintes, até ficar firme." },
];

/**
 * Boas-vindas do aluno no primeiro acesso: apresentação, como o curso funciona e a meta diária.
 * Ocupa a tela toda. Terminar ou pular grava `onboardingConcluido` (PATCH /curso/perfil);
 * concluir a primeira lição também encerra as boas-vindas no servidor.
 */
export function BoasVindas({ nome, trilha }: { nome: string; trilha: Trilha }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [meta, setMeta] = useState(trilha.perfil.metaDiariaXp);
  // Lembretes por e-mail são opt-in: a caixa começa desmarcada
  const [lembretes, setLembretes] = useState(trilha.perfil.lembretesEmail ?? false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // A cada passo o foco vai para o título (leitor de tela anuncia a tela nova)
  useEffect(() => {
    tituloRef.current?.focus();
  }, [passo]);

  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  const proximo = proximoPasso(trilha);
  const destino = proximo.tipo === "licao" ? `/aluno/curso/licao/${proximo.licao.id}` : "/aluno/curso";

  async function concluir(irPara: string | null) {
    setSalvando(true);
    setErro("");
    // "Pular" não grava a meta nem os lembretes: só encerra as boas-vindas
    const ok = await salvarPerfil(
      irPara ? { metaDiariaXp: meta, lembretesEmail: lembretes, onboardingConcluido: true } : { onboardingConcluido: true },
    );
    if (!ok) {
      setSalvando(false);
      setErro("Não foi possível salvar. Confira sua internet e tente de novo.");
      return;
    }
    if (irPara) router.push(irPara);
  }

  const titulos = [
    nome ? `Boas-vindas, ${nome}!` : "Boas-vindas!",
    "Cada lição tem três partes",
    "Quanto você quer estudar por dia?",
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="boas-vindas-titulo"
      className="fixed inset-0 z-[80] !m-0 overflow-y-auto bg-canvas"
    >
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-5 pb-6 pt-4 sm:px-6">
        <div className="flex min-h-[44px] items-center gap-3">
          {passo > 0 ? (
            <button
              type="button"
              onClick={() => setPasso((p) => p - 1)}
              disabled={salvando}
              aria-label="Voltar"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft hover:bg-gray-100 hover:text-ink"
            >
              <ArrowLeft aria-hidden className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-9" aria-hidden />
          )}
          <div
            className="flex flex-1 gap-1.5"
            role="progressbar"
            aria-label="Etapa das boas-vindas"
            aria-valuemin={1}
            aria-valuemax={PASSOS}
            aria-valuenow={passo + 1}
          >
            {Array.from({ length: PASSOS }, (_, i) => (
              <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                <span
                  className={`block h-full rounded-full bg-grape-bright transition-[width] duration-500 ease-out ${
                    i <= passo ? "w-full" : "w-0"
                  }`}
                />
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void concluir(null)}
            disabled={salvando}
            className="-mr-2 inline-flex min-h-[44px] items-center rounded-xl px-2 text-sm font-semibold text-ink-soft hover:bg-gray-100 hover:text-ink"
          >
            Pular
          </button>
        </div>

        {/* `key` refaz a animação de entrada a cada passo */}
        <div key={passo} className="flex flex-1 animate-rise flex-col justify-center py-8">
          {passo === 0 && (
            <div className="relative mx-auto mb-8 h-56 w-full max-w-xs" aria-hidden>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-1.5 shadow-lg">
                <LogoSwirl size={112} />
              </div>
              {FRASES.map((f) => (
                <span
                  key={f.texto}
                  style={{ animationDelay: f.atraso }}
                  className={`absolute animate-flutuar whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm ${f.classe}`}
                >
                  {f.texto}
                </span>
              ))}
            </div>
          )}

          <h1
            id="boas-vindas-titulo"
            ref={tituloRef}
            tabIndex={-1}
            className="text-balance text-[1.9rem] font-semibold leading-[1.1] tracking-[-0.03em] text-ink focus:outline-none sm:text-4xl"
          >
            {titulos[passo]}
          </h1>

          {passo === 0 && (
            <p className="mt-3 text-pretty text-lg leading-relaxed text-ink-soft">
              Aqui você aprende inglês do zero, no seu ritmo: uma lição curta por vez, com prática e correção na hora.
            </p>
          )}

          {passo === 1 && (
            <ol className="mt-6 space-y-3">
              {COMO_FUNCIONA.map(({ Icone, cor, titulo, texto }, i) => (
                <li
                  key={titulo}
                  style={{ animationDelay: `${120 + i * 90}ms` }}
                  className="card flex animate-pop-in items-start gap-3.5 p-4"
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cor}`} aria-hidden>
                    <Icone className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{titulo}</span>
                    <span className="block text-sm leading-relaxed text-ink-soft">{texto}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {passo === 1 && (
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Já sabe o básico? Na trilha, cada módulo tem a opção “Já sei este conteúdo”: você faz o teste direto e, se
              passar, segue para o próximo.
            </p>
          )}

          {passo === 2 && (
            <>
              <p className="mt-3 text-pretty leading-relaxed text-ink-soft">
                Pouco todo dia vale mais do que muito de vez em quando. Você pode mudar a meta depois, no painel.
              </p>
              <div className="mt-6">
                <EscolhaMeta valor={meta} onChange={setMeta} nome="meta-boas-vindas" />
              </div>
              <div className="mt-4">
                <CaixaMarcar id="lembretes-boas-vindas" checked={lembretes} onChange={setLembretes}>
                  Quero receber lembretes de estudo por e-mail
                  <span className="mt-0.5 block text-ink-soft">
                    No máximo um por dia, e só quando você ficar sem estudar. Dá para desligar quando quiser.
                  </span>
                </CaixaMarcar>
              </div>
            </>
          )}
        </div>

        <div className="pb-safe space-y-3">
          {erro && <Mensagem tom="erro">{erro}</Mensagem>}
          {passo < PASSOS - 1 ? (
            <button type="button" onClick={() => setPasso((p) => p + 1)} className={`${classeBotao("primario")} w-full`}>
              {passo === 0 ? "Vamos lá" : "Continuar"}
              <ArrowRight aria-hidden className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void concluir(destino)}
              disabled={salvando}
              aria-busy={salvando}
              className={`${classeBotao("primario")} w-full`}
            >
              {salvando ? "Preparando…" : proximo.tipo === "licao" ? "Começar a primeira lição" : "Ver o curso"}
              {!salvando && <ArrowRight aria-hidden className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
