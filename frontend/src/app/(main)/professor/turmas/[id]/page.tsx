"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CalendarClock, ChevronRight, ClipboardList, FolderOpen, Megaphone, Plus, UsersRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Avatar,
  Cabecalho,
  Carregando,
  classeBotao,
  classeLinkAcao,
  erroDaApi,
  Mensagem,
  Secao,
  Selo,
  Vazio,
} from "@/components/painel/ui";
import { CodigoConvite } from "@/components/turmas/CodigoConvite";
import { MuralAvisos } from "@/components/turmas/MuralAvisos";
import { PainelAtividade } from "@/components/turmas/PainelAtividade";
import { prazo } from "@/components/turmas/status";
import type { AtividadeComEntregas, Aviso, TurmaDetalhe } from "@/components/turmas/tipos";

/** Mais próximas do prazo primeiro; as encerradas vão para o fim (da mais recente à mais antiga). */
function ordenarPorPrazo(lista: AtividadeComEntregas[]) {
  const agora = Date.now();
  return [...lista].sort((a, b) => {
    const ta = new Date(a.dataEntrega).getTime();
    const tb = new Date(b.dataEntrega).getTime();
    const va = ta < agora ? 1 : 0;
    const vb = tb < agora ? 1 : 0;
    if (va !== vb) return va - vb;
    return va ? tb - ta : ta - tb;
  });
}

function TurmaDetalheConteudo() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;
  const atividadeSelecionada = searchParams.get("atividade");

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [atividades, setAtividades] = useState<AtividadeComEntregas[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [novoAviso, setNovoAviso] = useState(false);

  const carregarAvisos = useCallback(async () => {
    const res = await apiFetch(`/turmas/${id}/avisos`).catch(() => null);
    if (res?.ok) setAvisos(await res.json());
  }, [id]);

  const carregarAtividades = useCallback(async () => {
    const res = await apiFetch(`/turmas/${id}/atividades`).catch(() => null);
    if (res?.ok) setAtividades(ordenarPorPrazo(await res.json()));
  }, [id]);

  const carregarTurma = useCallback(async () => {
    setErro("");
    const res = await apiFetch(`/turmas/${id}`).catch(() => null);
    if (res?.status === 401) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!res?.ok) {
      setErro(
        res?.status === 404 || res?.status === 403
          ? "Turma não encontrada ou de outra professora."
          : await erroDaApi(res, "Não foi possível carregar a turma."),
      );
      setTurma(null);
      setCarregando(false);
      return;
    }
    setTurma(await res.json());
    setCarregando(false);
  }, [id, router]);

  const recarregarTudo = useCallback(async () => {
    await Promise.all([carregarTurma(), carregarAtividades()]);
  }, [carregarTurma, carregarAtividades]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarTurma();
      void carregarAtividades();
      void carregarAvisos();
    });
  }, [carregarTurma, carregarAtividades, carregarAvisos]);

  // Ao escolher uma atividade, leva o painel dela para a vista (no celular ele fica abaixo da lista)
  useEffect(() => {
    if (!atividadeSelecionada || carregando) return;
    const el = document.getElementById("atividade-detalhe");
    if (el && window.matchMedia("(max-width: 1023px)").matches) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [atividadeSelecionada, carregando]);


  if (carregando) return <Carregando texto="Carregando turma…" className="mx-auto max-w-6xl" />;

  if (erro || !turma) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Mensagem tom="erro">{erro || "Turma não encontrada."}</Mensagem>
        <Link href="/professor/turmas" className={classeBotao("secundario")}>
          Voltar às turmas
        </Link>
      </div>
    );
  }

  const atividadeAtual =
    atividades.find((a) => String(a.id) === atividadeSelecionada) ??
    turma.atividades.find((a) => String(a.id) === atividadeSelecionada) ??
    null;
  const alunos = turma.matriculas.map((m) => m.aluno);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Cabecalho
        voltar={{ href: "/professor/turmas", rotulo: "Turmas" }}
        eyebrow="Turma"
        titulo={turma.nome}
        descricao={
          <>
            <p>
              Prof. {turma.professor.nome} · {alunos.length} {alunos.length === 1 ? "aluno" : "alunos"}
            </p>
            {turma.descricao && <p className="mt-1 text-sm">{turma.descricao}</p>}
          </>
        }
        acoes={
          <>
            <Link href={`/professor/atividade/nova?turmaId=${turma.id}`} className={classeBotao("primario")}>
              <Plus aria-hidden className="h-4 w-4" />
              Nova atividade
            </Link>
            <button type="button" onClick={() => setNovoAviso(true)} className={classeBotao("secundario")}>
              <Megaphone aria-hidden className="h-4 w-4" />
              Novo aviso
            </button>
            <Link href={`/professor/materiais?turma=${turma.id}`} className={classeBotao("secundario")}>
              <FolderOpen aria-hidden className="h-4 w-4" />
              Materiais
            </Link>
          </>
        }
      />

      <CodigoConvite codigo={turma.codigoConvite} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-6">
          <Secao
            id="atividades"
            titulo={
              <span className="inline-flex items-center gap-2">
                <ClipboardList aria-hidden className="h-5 w-5 text-accent" />
                Atividades
              </span>
            }
            descricao={atividades.length > 0 ? "Escolha uma atividade para ver e corrigir as entregas." : undefined}
          >
            {atividades.length === 0 ? (
              <Vazio
                compacto
                titulo="Nenhuma atividade ainda"
                texto="Crie a primeira atividade: os alunos da turma veem na hora."
                acao={
                  <Link href={`/professor/atividade/nova?turmaId=${turma.id}`} className={classeBotao("primario")}>
                    <Plus aria-hidden className="h-4 w-4" />
                    Nova atividade
                  </Link>
                }
              />
            ) : (
              <ul className="space-y-2.5">
                {atividades.map((a) => {
                  const selecionada = String(a.id) === atividadeSelecionada;
                  const p = prazo(a.dataEntrega);
                  const pendentes = a.submissoes.filter((s) => s.status === "pendente").length;
                  const alunosComEntrega = new Set(a.submissoes.map((s) => s.aluno.id ?? s.aluno.nome)).size;
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/professor/turmas/${turma.id}?atividade=${a.id}`}
                        scroll={false}
                        aria-current={selecionada ? "true" : undefined}
                        className={`group flex items-center gap-3 rounded-2xl border p-3.5 transition-colors sm:p-4 ${
                          selecionada
                            ? "border-accent bg-accent-soft/60 ring-1 ring-accent"
                            : "border-line bg-card hover:border-line-strong hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-semibold leading-snug text-ink">{a.titulo}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                            <span className="inline-flex items-center gap-1">
                              <CalendarClock aria-hidden className="h-3.5 w-3.5" />
                              {p.texto}
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                              {alunosComEntrega}/{alunos.length} entregaram
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {pendentes > 0 ? (
                            <Selo tom="sol">{pendentes} para corrigir</Selo>
                          ) : p.vencido ? (
                            <Selo>Encerrada</Selo>
                          ) : (
                            <Selo tom={p.proximo ? "chama" : "accent"}>{p.relativo}</Selo>
                          )}
                        </div>
                        <ChevronRight
                          aria-hidden
                          className="h-5 w-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>

          {atividadeSelecionada &&
            (atividadeAtual ? (
              <PainelAtividade
                key={atividadeAtual.id}
                atividade={atividadeAtual}
                alunos={alunos}
                onAtividadeMudou={recarregarTudo}
              />
            ) : (
              <Mensagem tom="alerta">Esta atividade não existe mais nesta turma.</Mensagem>
            ))}
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Avisos e alunos da turma">
          <MuralAvisos
            turmaId={turma.id}
            avisos={avisos}
            editavel
            onMudou={carregarAvisos}
            abrirNovo={novoAviso}
            onFecharNovo={() => setNovoAviso(false)}
          />

          <Secao
            id="alunos"
            titulo={
              <span className="inline-flex items-center gap-2">
                <UsersRound aria-hidden className="h-5 w-5 text-accent" />
                Alunos ({alunos.length})
              </span>
            }
            acao={
              <Link href="/professor/alunos" className={classeLinkAcao}>
                Gerenciar
              </Link>
            }
          >
            {alunos.length === 0 ? (
              <Vazio
                compacto
                titulo="Nenhum aluno ainda"
                texto="Passe o código de convite para a turma ou cadastre alunos em Alunos."
              />
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {alunos.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <Avatar nome={a.nome} tamanho="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.nome}</p>
                      <p className="truncate text-xs text-ink-soft">{a.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </aside>
      </div>
    </div>
  );
}

export default function TurmaDetalhePage() {
  return (
    <Suspense fallback={<Carregando texto="Carregando turma…" className="mx-auto max-w-6xl" />}>
      <TurmaDetalheConteudo />
    </Suspense>
  );
}
