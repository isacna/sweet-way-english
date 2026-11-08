"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  ClipboardCheck,
  Plus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  Avatar,
  Cabecalho,
  Carregando,
  classeBotao,
  classeLinkAcao,
  erroDaApi,
  Mensagem,
  Secao,
  Vazio,
} from "@/components/painel/ui";
import { CodigoConvite } from "@/components/turmas/CodigoConvite";
import type { AtividadeComEntregas, TurmaResumo } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";
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

function Estatistica({
  icone: Icone,
  valor,
  rotulo,
  tom,
}: {
  icone: LucideIcon;
  valor: string;
  rotulo: string;
  tom: string;
}) {
  return (
    <div className="card p-3.5 sm:p-5">
      <span className={`mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${tom}`} aria-hidden>
        <Icone className="h-5 w-5" />
      </span>
      <p className="text-2xl font-semibold tabular-nums tracking-[-0.02em] text-ink sm:text-3xl">{valor}</p>
      <p className="text-xs leading-snug text-ink-soft sm:text-sm">{rotulo}</p>
    </div>
  );
}

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [turmas, setTurmas] = useState<TurmaResumo[]>([]);
  const [fila, setFila] = useState<ParaCorrigir[]>([]);

  const carregar = useCallback(async () => {
    const resTurmas = await apiFetch("/turmas").catch(() => null);
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
    await Promise.all(
      lista.map(async (t) => {
        const r = await apiFetch(`/turmas/${t.id}/atividades`).catch(() => null);
        if (!r?.ok) return;
        const atividades: AtividadeComEntregas[] = await r.json();
        for (const a of atividades) {
          for (const s of a.submissoes) {
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
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  const totalAlunos = turmas.reduce((acc, t) => acc + (t._count?.matriculas ?? 0), 0);
  const v = (n: number) => (carregando ? "…" : String(n));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Cabecalho
        titulo="Painel"
        descricao="O que precisa da sua atenção nas turmas e no curso."
        acoes={
          <Link href="/professor/atividade/nova" className={classeBotao("primario")}>
            <Plus aria-hidden className="h-4 w-4" />
            Nova atividade
          </Link>
        }
      />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Estatistica icone={ClipboardCheck} valor={v(fila.length)} rotulo="Para corrigir" tom="bg-sun-soft text-sun-ink" />
        <Estatistica icone={UsersRound} valor={v(totalAlunos)} rotulo="Alunos" tom="bg-accent-soft text-accent" />
        <Estatistica
          icone={BookOpenCheck}
          valor={v(turmas.length)}
          rotulo={turmas.length === 1 ? "Turma" : "Turmas"}
          tom="bg-success-soft text-success-ink"
        />
      </div>

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
