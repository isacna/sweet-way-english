"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  ClipboardCheck,
  Inbox,
  Plus,
  UsersRound,
} from "lucide-react";
import {
  Avatar,
  Cabecalho,
  Carregando,
  classeBotao,
  classeLinkAcao,
  Contagem,
  erroDaApi,
  Indicador,
  Mensagem,
  Secao,
  Selo,
  Vazio,
} from "@/components/painel/ui";
import { GraficoEntregasSemana, GraficoSituacaoEntregas, resumirEntregas, type ResumoEntregas } from "@/components/painel/graficos";
import { CodigoConvite } from "@/components/turmas/CodigoConvite";
import type { ProgressoTurma } from "@/components/conteudo/tipos";
import type { AtividadeComEntregas, TurmaResumo } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";
import { useHojePt, usePrimeiroNome } from "@/lib/sessaoUi";
import { tempoRelativoPt } from "@/lib/timePt";

type ParaCorrigir = {
  id: number;
  dataEnvio: string;
  aluno: string;
  atividadeTitulo: string;
  atividadeId: number;
  turmaNome: string;
  turmaId: number;
};

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

/** Aluno das turmas que não estuda o curso há 7 dias ou mais (ou nunca estudou). */
type AlunoParado = { id: number; nome: string; turma: string; ultimoEstudoEm: string | null };

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const nome = usePrimeiroNome();
  const hoje = useHojePt();
  const [entregasSemana, setEntregasSemana] = useState(0);
  const [parados, setParados] = useState<AlunoParado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [turmas, setTurmas] = useState<TurmaResumo[]>([]);
  const [fila, setFila] = useState<ParaCorrigir[]>([]);
  const [resumo, setResumo] = useState<ResumoEntregas | null>(null);

  const carregar = useCallback(async () => {
    const [resTurmas, resProgresso] = await Promise.all([
      apiFetch("/turmas").catch(() => null),
      apiFetch("/professor/progresso").catch(() => null),
    ]);
    if (resTurmas?.status === 401 || resTurmas?.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!resTurmas?.ok) {
      setErro(await erroDaApi(resTurmas, "Não foi possível carregar o painel."));
      setCarregando(false);
      return;
    }
    const lista: TurmaResumo[] = await resTurmas.json();

    // Entregas aguardando correção, de todas as turmas
    const pendentes: ParaCorrigir[] = [];
    const desde = Date.now() - SETE_DIAS;
    let recentes = 0;
    const todas: { dataEnvio: string; status: string }[] = []; // para os gráficos
    await Promise.all(
      lista.map(async (t) => {
        const r = await apiFetch(`/turmas/${t.id}/atividades`).catch(() => null);
        if (!r?.ok) return;
        const atividades: AtividadeComEntregas[] = await r.json();
        for (const a of atividades) {
          for (const s of a.submissoes) {
            todas.push({ dataEnvio: s.dataEnvio, status: s.status });
            if (new Date(s.dataEnvio).getTime() >= desde) recentes++;
            if (s.status !== "pendente") continue;
            pendentes.push({
              id: s.id,
              dataEnvio: s.dataEnvio,
              aluno: s.aluno?.nome ?? "Aluno",
              atividadeTitulo: a.titulo,
              atividadeId: a.id,
              turmaNome: t.nome,
              turmaId: t.id,
            });
          }
        }
      }),
    );
    // As mais antigas primeiro: quem espera há mais tempo é corrigido antes
    pendentes.sort((x, y) => new Date(x.dataEnvio).getTime() - new Date(y.dataEnvio).getTime());
    setTurmas(lista.sort((a, b) => b.id - a.id));
    setFila(pendentes);
    setEntregasSemana(recentes);
    setResumo(resumirEntregas(todas, new Date()));

    // Quem está parado no curso: nunca estudou primeiro, depois quem está há mais tempo sem estudar
    if (resProgresso?.ok) {
      const progresso: ProgressoTurma = await resProgresso.json();
      const instante = (a: AlunoParado) => (a.ultimoEstudoEm ? new Date(a.ultimoEstudoEm).getTime() : 0);
      setParados(
        progresso.alunos
          .filter((a) => !a.ultimoEstudoEm || new Date(a.ultimoEstudoEm).getTime() < desde)
          .map((a) => ({ id: a.id, nome: a.nome, turma: a.turmas.map((t) => t.nome).join(", "), ultimoEstudoEm: a.ultimoEstudoEm }))
          .sort((a, b) => instante(a) - instante(b) || a.nome.localeCompare(b.nome, "pt-BR")),
      );
    }
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  const totalAlunos = turmas.reduce((acc, t) => acc + (t._count?.matriculas ?? 0), 0);
  const v = (n: number) => (carregando ? "…" : <Contagem valor={n} />);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Cabecalho
        eyebrow={hoje || undefined}
        titulo={nome ? `Olá, ${nome}!` : "Painel"}
        descricao={
          carregando || erro
            ? "O que precisa da sua atenção nas turmas e no curso."
            : fila.length > 0
              ? `${fila.length} ${fila.length === 1 ? "entrega espera" : "entregas esperam"} a sua correção.`
              : "Tudo corrigido. Nenhuma entrega esperando por você."
        }
        acoes={
          <Link href="/professor/atividade/nova" className={classeBotao("primario")}>
            <Plus aria-hidden className="h-4 w-4" />
            Nova atividade
          </Link>
        }
      />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador
          icone={<ClipboardCheck />}
          tom="sol"
          valor={v(fila.length)}
          rotulo="Para corrigir"
          detalhe={
            carregando
              ? undefined
              : fila[0]
                ? `Mais antiga: ${tempoRelativoPt(fila[0].dataEnvio).toLowerCase()}`
                : "Nenhuma entrega na fila"
          }
          href="#corrigir"
        />
        <Indicador
          icone={<Inbox />}
          tom="doce"
          ordem={1}
          valor={v(entregasSemana)}
          rotulo="Entregas na semana"
          detalhe="Recebidas nos últimos 7 dias"
        />
        <Indicador
          icone={<UsersRound />}
          ordem={2}
          valor={v(totalAlunos)}
          rotulo={totalAlunos === 1 ? "Aluno" : "Alunos"}
          detalhe="Matriculados nas suas turmas"
          href="/professor/alunos"
        />
        <Indicador
          icone={<BookOpenCheck />}
          tom="sucesso"
          ordem={3}
          valor={v(turmas.length)}
          rotulo={turmas.length === 1 ? "Turma" : "Turmas"}
          detalhe="Ver todas"
          href="/professor/turmas"
        />
      </div>

      {/* Sem nenhuma entrega, os gráficos não aparecem */}
      {resumo && resumo.total > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <GraficoEntregasSemana semanas={resumo.semanas} />
          <GraficoSituacaoEntregas situacao={resumo.situacao} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Secao
          id="corrigir"
          titulo="Para corrigir"
          descricao="Entregas esperando nota ou decisão, das mais antigas para as mais novas."
        >
          {carregando ? (
            <Carregando />
          ) : fila.length === 0 ? (
            <Vazio compacto icone={<ClipboardCheck />} titulo="Tudo corrigido" texto="Nenhuma entrega esperando por você." />
          ) : (
            <ul className="-my-1 divide-y divide-line">
              {fila.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/professor/turmas/${s.turmaId}?atividade=${s.atividadeId}`}
                    className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-gray-50"
                  >
                    <Avatar nome={s.aluno} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{s.aluno}</p>
                      <p className="truncate text-sm text-ink-soft">
                        {s.atividadeTitulo} · {s.turmaNome}
                      </p>
                      <p className="text-xs text-ink-faint">Enviada {tempoRelativoPt(s.dataEnvio).toLowerCase()}</p>
                    </div>
                    <span className="hidden text-sm font-semibold text-accent sm:inline">Corrigir</span>
                    <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-ink-faint group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {fila.length > 8 && (
            <p className="mt-3 text-sm text-ink-soft">E mais {fila.length - 8} nas páginas das turmas.</p>
          )}
        </Secao>

        <div className="space-y-6">
          <Secao
            id="turmas"
            titulo="Minhas turmas"
            acao={
              <Link href="/professor/turmas" className={classeLinkAcao}>
                Ver todas
              </Link>
            }
          >
            {carregando ? (
              <Carregando />
            ) : turmas.length === 0 ? (
              <Vazio
                compacto
                titulo="Nenhuma turma ainda"
                acao={
                  <Link href="/professor/turmas/nova" className={classeBotao("primario")}>
                    <Plus aria-hidden className="h-4 w-4" />
                    Criar turma
                  </Link>
                }
              />
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {turmas.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <Link
                      href={`/professor/turmas/${t.id}`}
                      className="-mx-2 flex min-h-[44px] min-w-0 flex-1 flex-col justify-center rounded-xl px-2 hover:bg-gray-50"
                    >
                      <span className="truncate font-medium text-ink">{t.nome}</span>
                      <span className="text-xs text-ink-soft">
                        {t._count?.matriculas ?? 0} {(t._count?.matriculas ?? 0) === 1 ? "aluno" : "alunos"}
                      </span>
                    </Link>
                    <CodigoConvite codigo={t.codigoConvite} compacto />
                  </li>
                ))}
              </ul>
            )}
          </Secao>

          {parados.length > 0 && (
            <Secao
              id="parados"
              titulo="Parados no curso"
              descricao="Sem estudar há 7 dias ou mais."
              acao={
                <Link href="/professor/progresso" className={classeLinkAcao}>
                  Ver progresso
                </Link>
              }
            >
              <ul className="-my-1 divide-y divide-line">
                {parados.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <Avatar nome={a.nome} tamanho="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{a.nome}</p>
                      {a.turma && <p className="truncate text-xs text-ink-soft">{a.turma}</p>}
                    </div>
                    <Selo tom={a.ultimoEstudoEm ? "sol" : "neutro"}>
                      {a.ultimoEstudoEm ? tempoRelativoPt(a.ultimoEstudoEm) : "Nunca estudou"}
                    </Selo>
                  </li>
                ))}
              </ul>
              {parados.length > 5 && <p className="mt-3 text-sm text-ink-soft">E mais {parados.length - 5}.</p>}
            </Secao>
          )}

          <Secao id="curso" titulo="Curso autoguiado">
            <div className="grid gap-2">
              <Link
                href="/professor/conteudo"
                className="group flex items-center gap-3 rounded-xl border border-line p-3 hover:border-line-strong hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden>
                  <BookOpenCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">Conteúdo</span>
                  <span className="block text-xs text-ink-soft">Revisar e publicar lições</span>
                </span>
                <ChevronRight aria-hidden className="h-5 w-5 text-ink-faint" />
              </Link>
              <Link
                href="/professor/progresso"
                className="group flex items-center gap-3 rounded-xl border border-line p-3 hover:border-line-strong hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-candy-soft text-candy" aria-hidden>
                  <ChartNoAxesColumnIncreasing className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">Progresso</span>
                  <span className="block text-xs text-ink-soft">Como os alunos estão no curso</span>
                </span>
                <ChevronRight aria-hidden className="h-5 w-5 text-ink-faint" />
              </Link>
            </div>
          </Secao>
        </div>
      </div>
    </div>
  );
}
