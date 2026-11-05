"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Exercicio } from "@/components/curso/Exercicio";
import { FeedbackResultado } from "@/components/curso/FeedbackResultado";
import { ArrowLeft, Repeat2 } from "lucide-react";
import { Aviso, BarraAcao, BarraProgresso, Carregando, classeBotao } from "@/components/curso/ui";
import { apiFetch, getStoredUser } from "@/lib/api";
import {
  formatarDataHora,
  lerErroApi,
  respostaEmIngles,
  respostaPreenchida,
  type ItemRevisao,
  type Resposta,
  type Resultado,
} from "@/lib/curso";

type ResultadoRevisao = Resultado & { caixa: number; proximaEm: string; xpGanho: number };

type Sessao = { itens: ItemRevisao[]; total: number };

function SessaoRevisao({ sessao, onRecarregar }: { sessao: Sessao; onRecarregar: () => void }) {
  const { itens, total } = sessao;
  const [indice, setIndice] = useState(0);
  const [resposta, setResposta] = useState<Resposta | undefined>(undefined);
  const [feedback, setFeedback] = useState<ResultadoRevisao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [acertos, setAcertos] = useState(0);
  const [xp, setXp] = useState(0);
  const [fim, setFim] = useState(false);

  const atual = itens[indice];

  async function verificar() {
    if (!atual || enviando || feedback || !respostaPreenchida(atual, resposta)) return;
    setEnviando(true);
    setErro("");
    try {
      const res = await apiFetch(`/curso/revisao/${atual.id}`, {
        method: "POST",
        body: JSON.stringify({ resposta }),
      });
      if (!res.ok) {
        setErro(await lerErroApi(res, "Não foi possível verificar a resposta."));
        return;
      }
      const r: ResultadoRevisao = await res.json();
      setFeedback(r);
      if (r.correto) setAcertos((a) => a + 1);
      setXp((x) => x + (r.xpGanho ?? 0));
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setEnviando(false);
    }
  }

  function avancar() {
    setErro("");
    setFeedback(null);
    setResposta(undefined);
    if (indice >= itens.length - 1) setFim(true);
    else setIndice((i) => i + 1);
  }

  if (fim) {
    const restantes = total - itens.length;
    return (
      <div className="animate-pop-in rounded-[1.75rem] border-2 border-success-bright/30 bg-gradient-to-b from-success-soft to-card p-8 text-center">
        <p className="mb-3 text-5xl" aria-hidden>
          ✅
        </p>
        <h2 className="text-2xl font-semibold text-ink">Revisão concluída!</h2>
        <p className="mt-2 text-ink-soft">
          Você acertou {acertos} de {itens.length}.
          {xp > 0 && <span className="ml-1.5 inline-block rounded-full bg-sun px-2.5 py-0.5 font-display font-semibold text-gray-950">+{xp} XP</span>}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          Os itens que você errou voltam mais cedo; os que acertou, mais tarde.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm flex-col justify-center gap-2.5 sm:max-w-none sm:flex-row sm:gap-3">
          {restantes > 0 && (
            <button type="button" onClick={onRecarregar} className={classeBotao("primario")}>
              Continuar revisando ({restantes})
            </button>
          )}
          <Link href="/aluno/curso" className={classeBotao(restantes > 0 ? "secundario" : "primario")}>
            Voltar para a trilha
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarraProgresso grossa valor={(indice / itens.length) * 100} rotulo="Progresso da revisão" />
        <span className="shrink-0 text-xs font-semibold text-ink-soft">
          {indice + 1} de {itens.length}
        </span>
      </div>
      <div className="card space-y-5 p-5 sm:p-7">
        <p className="eyebrow inline-flex max-w-full items-center gap-1.5 break-words rounded-full bg-grape-soft px-2.5 py-1 text-grape">
          <Repeat2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {atual.licaoTitulo} · caixa {atual.caixa}
        </p>
        <Exercicio
          key={atual.id}
          item={atual}
          value={resposta}
          onChange={setResposta}
          disabled={!!feedback || enviando}
          feedback={feedback}
          onSubmit={() => {
            if (feedback) avancar();
            else void verificar();
          }}
        />
        {feedback && (
          <FeedbackResultado resultado={feedback} ouvir={respostaEmIngles(atual)}>
            <p className="mt-2 text-xs text-ink-soft">
              Agora na caixa {feedback.caixa} · próxima revisão em {formatarDataHora(feedback.proximaEm)}
              {feedback.xpGanho > 0 && <span className="ml-1 font-semibold text-sun-ink">+{feedback.xpGanho} XP</span>}
            </p>
          </FeedbackResultado>
        )}
        {erro && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink" role="alert">
            {erro}
          </p>
        )}
      </div>
      <BarraAcao tom={feedback ? (feedback.correto ? "certo" : "errado") : "neutro"}>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {feedback ? (
            <button type="button" onClick={avancar} className={`${classeBotao(feedback.correto ? "sucesso" : "erro")} w-full sm:w-auto sm:min-w-48`} autoFocus>
              {indice >= itens.length - 1 ? "Concluir" : "Próximo →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void verificar()}
              disabled={!respostaPreenchida(atual, resposta) || enviando}
              className={`${classeBotao("primario")} w-full sm:w-auto sm:min-w-48`}
            >
              {enviando ? "Verificando…" : "Verificar"}
            </button>
          )}
        </div>
      </BarraAcao>
    </div>
  );
}

export default function RevisaoPage() {
  const router = useRouter();
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [erro, setErro] = useState("");
  const [rodada, setRodada] = useState(0);

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/curso/revisao");
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/login?tipo=aluno");
          return;
        }
        if (!res.ok) {
          setErro(await lerErroApi(res, "Não foi possível carregar a revisão."));
          return;
        }
        const data: Sessao = await res.json();
        if (!cancelled) setSessao(data);
      } catch {
        if (!cancelled) setErro("Não foi possível conectar ao servidor.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, rodada]);

  function recarregar() {
    setSessao(null);
    setRodada((r) => r + 1);
  }

  let corpo: React.ReactNode;
  if (erro) corpo = <Aviso titulo="Ops!" texto={erro} />;
  else if (!sessao) corpo = <Carregando texto="Separando seus itens de revisão…" />;
  else if (sessao.itens.length === 0)
    corpo = (
      <Aviso
        icone="🌟"
        titulo="Nada para revisar hoje"
        texto="Os exercícios que você errar voltam aqui nos próximos dias para fixar o conteúdo."
      />
    );
  else corpo = <SessaoRevisao key={rodada} sessao={sessao} onRecarregar={recarregar} />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/aluno/curso" className="-ml-1 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-1 text-sm font-medium text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Trilha
        </Link>
        <h1 className="mt-1 text-[1.75rem] font-semibold text-ink sm:text-3xl">Revisão</h1>
        <p className="mt-1 text-ink-soft">Pratique de novo o que ainda não está firme.</p>
      </div>
      {corpo}
    </div>
  );
}
