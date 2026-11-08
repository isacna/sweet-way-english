"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, ChevronRight, ClipboardList, KeyRound, MessageSquareText, Star, UsersRound } from "lucide-react";
import { ContinuarCursoCard } from "@/components/curso/ContinuarCursoCard";
import { Cabecalho, Carregando, classeBotao, classeLinkAcao, Mensagem, Secao, Selo, Vazio } from "@/components/painel/ui";
import { prazo, situacaoAluno, type SituacaoAluno } from "@/components/turmas/status";
import type { AtividadeComEntregas, FeedbackDoAluno, TurmaResumo } from "@/components/turmas/tipos";
import type { TomSelo } from "@/components/painel/ui";
import { apiFetch, apiPaths } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";

type Linha = {
  atividadeId: number;
  turmaId: number;
  turmaNome: string;
  titulo: string;
  dataEntrega: string;
  situacao: { chave: SituacaoAluno; rotulo: string; tom: TomSelo };
};

export default function AlunoDashboardPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [turmas, setTurmas] = useState<TurmaResumo[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackDoAluno[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [resTurmas, resFb] = await Promise.all([
        apiFetch("/turmas").catch(() => null),
        apiFetch(apiPaths.alunoMeFeedbacks).catch(() => null),
      ]);
      if (cancelled) return;
      if (resTurmas?.status === 401) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!resTurmas?.ok) {
        setErro("Não foi possível carregar suas turmas.");
        setCarregando(false);
        return;
      }
      const listaTurmas: TurmaResumo[] = await resTurmas.json();
      const listaFb: FeedbackDoAluno[] = resFb?.ok ? await resFb.json() : [];

      const todas: Linha[] = [];
      await Promise.all(
        listaTurmas.map(async (t) => {
          const r = await apiFetch(`/turmas/${t.id}/atividades`).catch(() => null);
          if (!r?.ok) return;
          const atividades: AtividadeComEntregas[] = await r.json();
          for (const a of atividades) {
            todas.push({
              atividadeId: a.id,
              turmaId: t.id,
              turmaNome: t.nome,
              titulo: a.titulo,
              dataEntrega: a.dataEntrega,
              situacao: situacaoAluno(a.submissoes),
            });
          }
        }),
      );
      if (cancelled) return;
      todas.sort((x, y) => new Date(x.dataEntrega).getTime() - new Date(y.dataEntrega).getTime());
      setTurmas(listaTurmas);
      setFeedbacks(listaFb.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()));
      setLinhas(todas);
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const paraFazer = linhas.filter((l) => l.situacao.chave === "a-entregar" || l.situacao.chave === "reprovada");
  const aguardando = linhas.filter((l) => l.situacao.chave === "enviada");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Cabecalho titulo="Seu painel" descricao="Curso, atividades da turma e o retorno do professor." />

      <ContinuarCursoCard />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      {carregando ? (
        <Carregando />
      ) : turmas.length === 0 && !erro ? (
        <Vazio
          icone={<KeyRound />}
          titulo="Entre na turma do seu professor"
          texto="Com o código de convite você vê as atividades, os avisos e os materiais da turma."
          acao={
            <Link href="/aluno/turmas" className={classeBotao("primario")}>
              Usar código de convite
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Secao
            id="para-fazer"
            titulo={
              <span className="inline-flex items-center gap-2">
                <ClipboardList aria-hidden className="h-5 w-5 text-grape" />
                Para fazer
              </span>
            }
            descricao={
              paraFazer.length === 0
                ? undefined
                : `${paraFazer.length} ${paraFazer.length === 1 ? "atividade" : "atividades"}${
                    aguardando.length ? ` · ${aguardando.length} aguardando correção` : ""
                  }`
            }
            acao={
              turmas[0] ? (
                <Link href={turmas.length === 1 ? `/aluno/turmas/${turmas[0].id}` : "/aluno/turmas"} className={classeLinkAcao}>
                  <UsersRound aria-hidden className="h-4 w-4" />
                  Turma
                </Link>
              ) : undefined
            }
          >
            {paraFazer.length === 0 ? (
              <Vazio
                compacto
                titulo="Nada pendente"
                texto={aguardando.length ? "Suas entregas estão com o professor." : "Quando houver atividade nova, ela aparece aqui."}
              />
            ) : (
              <ul className="space-y-2.5">
                {paraFazer.slice(0, 6).map((l) => {
                  const p = prazo(l.dataEntrega);
                  return (
                    <li key={`${l.turmaId}-${l.atividadeId}`}>
                      <Link
                        href={`/aluno/atividades/${l.atividadeId}?turmaId=${l.turmaId}`}
                        className="group flex items-center gap-3 rounded-2xl border border-line p-3.5 hover:border-line-strong hover:bg-gray-50"
                      >
                        <div className="min-w-0 flex-1">
                          <Selo tom={l.situacao.tom}>{l.situacao.rotulo}</Selo>
                          <p className="mt-1.5 break-words font-semibold leading-snug text-ink">{l.titulo}</p>
                          <p
                            className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-medium ${
                              p.vencido ? "text-danger" : p.proximo ? "text-flame-ink" : "text-ink-soft"
                            }`}
                          >
                            <CalendarClock aria-hidden className="h-3.5 w-3.5" />
                            {p.relativo} · {p.texto}
                          </p>
                        </div>
                        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-ink-faint group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>

          <Secao
            id="feedbacks"
            titulo={
              <span className="inline-flex items-center gap-2">
                <MessageSquareText aria-hidden className="h-5 w-5 text-grape" />
                Feedbacks recentes
              </span>
            }
            acao={
              feedbacks.length > 0 ? (
                <Link href="/aluno/feedbacks" className={classeLinkAcao}>
                  Ver todos
                </Link>
              ) : undefined
            }
          >
            {feedbacks.length === 0 ? (
              <Vazio compacto titulo="Nenhum feedback ainda" texto="As notas do professor aparecem aqui." />
            ) : (
              <ul className="space-y-3">
                {feedbacks.slice(0, 3).map((f) => (
                  <li key={f.id} className="rounded-2xl border border-line p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 break-words font-semibold leading-snug text-ink">{f.submissao.atividade.titulo}</p>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-sm font-bold text-success-ink">
                        <Star aria-hidden className="h-3.5 w-3.5 fill-current" />
                        <span className="sr-only">Nota </span>
                        {String(f.nota).replace(".", ",")}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{f.comentario}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {f.professor.nome} · {tempoRelativoPt(f.criadoEm)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>
      )}
    </div>
  );
}
