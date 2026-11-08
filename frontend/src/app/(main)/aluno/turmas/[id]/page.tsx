"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronRight, ClipboardList, FileWarning, FolderOpen } from "lucide-react";
import { Cabecalho, Carregando, classeBotao, classeLinkAcao, Mensagem, Secao, Selo, Vazio } from "@/components/painel/ui";
import { TIPOS_MATERIAL } from "@/components/turmas/Materiais";
import { MuralAvisos } from "@/components/turmas/MuralAvisos";
import { prazo, situacaoAluno, type SituacaoAluno } from "@/components/turmas/status";
import type { AtividadeComEntregas, Aviso, Material, TurmaResumo } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";

const FILTROS: { valor: SituacaoAluno | ""; rotulo: string }[] = [
  { valor: "", rotulo: "Todas" },
  { valor: "a-entregar", rotulo: "A entregar" },
  { valor: "reprovada", rotulo: "Refazer" },
  { valor: "enviada", rotulo: "Aguardando" },
  { valor: "corrigida", rotulo: "Corrigidas" },
  { valor: "aprovada", rotulo: "Aprovadas" },
];

/** Prioridade na lista: o que o aluno precisa fazer vem primeiro. */
const ORDEM: Record<SituacaoAluno, number> = { "a-entregar": 0, reprovada: 1, enviada: 2, corrigida: 3, aprovada: 4 };

export default function AlunoTurmaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [turma, setTurma] = useState<TurmaResumo | null>(null);
  const [atividades, setAtividades] = useState<AtividadeComEntregas[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<SituacaoAluno | "">("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const resT = await apiFetch(`/turmas/${id}`).catch(() => null);
      if (cancelled) return;
      if (resT?.status === 401) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!resT?.ok) {
        setErro(
          resT
            ? "Turma não encontrada, ou você não está matriculado nela."
            : "Sem conexão com o servidor. Confira sua internet e tente de novo.",
        );
        setCarregando(false);
        return;
      }
      const t: TurmaResumo = await resT.json();
      const [resA, resM, resAv] = await Promise.all([
        apiFetch(`/turmas/${id}/atividades`).catch(() => null),
        apiFetch(`/turmas/${id}/materiais`).catch(() => null),
        apiFetch(`/turmas/${id}/avisos`).catch(() => null),
      ]);
      if (cancelled) return;
      const ats: AtividadeComEntregas[] = resA?.ok ? await resA.json() : [];
      const mats: Material[] = resM?.ok ? await resM.json() : [];
      const avs: Aviso[] = resAv?.ok ? await resAv.json() : [];
      if (!resA?.ok) setErro("Não foi possível carregar as atividades.");
      setTurma(t);
      setAtividades(ats);
      setMateriais(mats.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()));
      setAvisos(avs);
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const lista = useMemo(() => {
    const comSituacao = atividades.map((a) => ({ a, s: situacaoAluno(a.submissoes) }));
    return comSituacao
      .filter((x) => !filtro || x.s.chave === filtro)
      .sort(
        (x, y) =>
          ORDEM[x.s.chave] - ORDEM[y.s.chave] ||
          new Date(x.a.dataEntrega).getTime() - new Date(y.a.dataEntrega).getTime(),
      );
  }, [atividades, filtro]);

  if (carregando) return <Carregando texto="Carregando turma…" className="mx-auto max-w-5xl" />;

  if (!turma) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Mensagem tom="erro">{erro || "Turma não encontrada."}</Mensagem>
        <Link href="/aluno/turmas" className={classeBotao("secundario")}>
          Voltar às turmas
        </Link>
      </div>
    );
  }

  const contagem = (chave: SituacaoAluno) => atividades.filter((a) => situacaoAluno(a.submissoes).chave === chave).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Cabecalho
        voltar={{ href: "/aluno/turmas", rotulo: "Minhas turmas" }}
        eyebrow="Turma"
        titulo={turma.nome}
        descricao={
          <>
            <p>Professor {turma.professor?.nome ?? "—"}</p>
            {turma.descricao && <p className="mt-1 text-sm">{turma.descricao}</p>}
          </>
        }
      />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:grid-rows-[auto_1fr]">
        {/* No celular: avisos → atividades → materiais. No desktop: atividades à esquerda. */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <MuralAvisos turmaId={turma.id} avisos={avisos} />
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <Secao
            id="atividades"
            titulo={
              <span className="inline-flex items-center gap-2">
                <ClipboardList aria-hidden className="h-5 w-5 text-grape" />
                Atividades
              </span>
            }
            descricao={
              atividades.length > 0
                ? `${contagem("a-entregar") + contagem("reprovada")} para fazer · ${atividades.length} no total`
                : undefined
            }
          >
            {atividades.length > 0 && (
              <div
                role="group"
                aria-label="Filtrar atividades"
                className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
              >
                {FILTROS.map((f) => {
                  const ativo = filtro === f.valor;
                  return (
                    <button
                      key={f.valor || "todas"}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setFiltro(f.valor)}
                      className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
                        ativo
                          ? "bg-grape text-white shadow-sm"
                          : "border border-line-strong bg-card text-ink-soft hover:bg-gray-50 hover:text-ink"
                      }`}
                    >
                      {f.rotulo}
                    </button>
                  );
                })}
              </div>
            )}

            {atividades.length === 0 ? (
              <Vazio compacto titulo="Nenhuma atividade ainda" texto="Quando o professor publicar uma atividade, ela aparece aqui." />
            ) : lista.length === 0 ? (
              <Vazio compacto titulo="Nenhuma atividade com esse filtro" />
            ) : (
              <ul className="space-y-2.5">
                {lista.map(({ a, s }) => {
                  const p = prazo(a.dataEntrega);
                  const fazer = s.chave === "a-entregar" || s.chave === "reprovada";
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/aluno/atividades/${a.id}?turmaId=${turma.id}`}
                        className="group flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 transition-colors hover:border-line-strong hover:bg-gray-50 sm:p-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Selo tom={s.tom}>{s.rotulo}</Selo>
                            {a.arquivoObrigatorio && fazer && (
                              <Selo tom="sol">
                                <FileWarning aria-hidden className="h-3.5 w-3.5" />
                                Precisa de arquivo
                              </Selo>
                            )}
                          </div>
                          <p className="mt-1.5 break-words font-semibold leading-snug text-ink">{a.titulo}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{a.descricao}</p>
                          <p
                            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${
                              fazer && p.vencido ? "text-danger" : fazer && p.proximo ? "text-flame-ink" : "text-ink-soft"
                            }`}
                          >
                            <CalendarClock aria-hidden className="h-3.5 w-3.5" />
                            Até {p.texto} · {p.relativo}
                          </p>
                        </div>
                        <span className="hidden text-sm font-semibold text-grape sm:inline">{fazer ? "Entregar" : "Ver"}</span>
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
        </div>

        <div className="min-w-0 self-start lg:col-start-2 lg:row-start-2">
          <Secao
            id="materiais"
            titulo={
              <span className="inline-flex items-center gap-2">
                <FolderOpen aria-hidden className="h-5 w-5 text-grape" />
                Materiais
              </span>
            }
            acao={
              materiais.length > 0 ? (
                <Link href={`/aluno/materiais?turma=${turma.id}`} className={classeLinkAcao}>
                  Ver todos
                </Link>
              ) : undefined
            }
          >
            {materiais.length === 0 ? (
              <p className="text-sm text-ink-soft">Nenhum material publicado ainda.</p>
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {materiais.slice(0, 5).map((m) => {
                  const info = TIPOS_MATERIAL.find((t) => t.valor === m.tipo) ?? TIPOS_MATERIAL[0];
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/aluno/materiais?turma=${turma.id}#material-${m.id}`}
                        className="-mx-2 flex min-h-[52px] items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-gray-50"
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${info.tom}`} aria-hidden>
                          <info.Icone className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{m.titulo}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Secao>
        </div>
      </div>
    </div>
  );
}
