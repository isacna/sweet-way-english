"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { FiltroLista } from "@/components/FiltroLista";
import {
  DialogoEditarAluno,
  DialogoNovoAluno,
  type AlunoLista,
  type TurmaOpcao,
} from "@/components/alunos/DialogosAluno";
import { ConfirmarDialogo } from "@/components/painel/Dialogo";
import {
  Avatar,
  Cabecalho,
  Carregando,
  classeBotao,
  erroDaApi,
  Mensagem,
  RegiaoAoVivo,
  Vazio,
} from "@/components/painel/ui";
import { apiFetch, apiPaths } from "@/lib/api";

export default function ProfessorAlunosPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<AlunoLista[]>([]);
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [aviso, setAviso] = useState<{ tom: "sucesso"; texto: string } | null>(null);

  const [busca, setBusca] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");

  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<AlunoLista | null>(null);
  const [excluindo, setExcluindo] = useState<AlunoLista | null>(null);
  const [ocupadoExcluir, setOcupadoExcluir] = useState(false);
  const [erroExcluir, setErroExcluir] = useState("");

  const alunosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alunos.filter((a) => {
      const okBusca = !q || a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
      const okTurma = !turmaFiltro || a.turmas.some((t) => String(t.id) === turmaFiltro);
      return okBusca && okTurma;
    });
  }, [alunos, busca, turmaFiltro]);

  const carregar = useCallback(async () => {
    setErroLista("");
    const [resAlunos, resTurmas] = await Promise.all([
      apiFetch(apiPaths.professorAlunos).catch(() => null),
      apiFetch("/turmas").catch(() => null),
    ]);
    if (resAlunos?.status === 401 || resAlunos?.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!resAlunos?.ok || !resTurmas?.ok) {
      setErroLista(await erroDaApi(resAlunos?.ok ? resTurmas : resAlunos, "Não foi possível carregar os alunos."));
      setCarregando(false);
      return;
    }
    setAlunos(await resAlunos.json());
    setTurmas(((await resTurmas.json()) as TurmaOpcao[]).map((t) => ({ id: t.id, nome: t.nome })));
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  async function excluir() {
    if (!excluindo) return;
    setErroExcluir("");
    setOcupadoExcluir(true);
    const res = await apiFetch(apiPaths.professorAluno(excluindo.id), { method: "DELETE" }).catch(() => null);
    setOcupadoExcluir(false);
    if (!res?.ok) {
      setErroExcluir(await erroDaApi(res, "Não foi possível excluir o aluno."));
      return;
    }
    setAviso({ tom: "sucesso", texto: `${excluindo.nome} foi excluído.` });
    setExcluindo(null);
    void carregar();
  }

  const podeAdicionar = turmas.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Cabecalho
        titulo="Alunos"
        descricao="Alunos matriculados nas suas turmas. Quem você cadastra aqui já entra numa turma."
        acoes={
          <button type="button" disabled={!podeAdicionar} onClick={() => setNovo(true)} className={classeBotao("primario")}>
            <Plus aria-hidden className="h-4 w-4" />
            Novo aluno
          </button>
        }
      />

      {!podeAdicionar && !carregando && !erroLista && (
        <Mensagem tom="alerta">
          Crie uma{" "}
          <Link href="/professor/turmas/nova" className="underline underline-offset-2">
            turma
          </Link>{" "}
          antes de cadastrar alunos.
        </Mensagem>
      )}
      {erroLista && <Mensagem tom="erro">{erroLista}</Mensagem>}
      <RegiaoAoVivo mensagem={aviso} />

      {!carregando && alunos.length > 0 && (
        <FiltroLista
          busca={busca}
          onBuscaChange={setBusca}
          placeholderBusca="Buscar por nome ou e-mail…"
          filtros={[
            {
              id: "turma",
              label: "Turma",
              opcoes: turmas.map((t) => ({ valor: String(t.id), rotulo: t.nome })),
              valor: turmaFiltro,
              onChange: setTurmaFiltro,
            },
          ]}
          total={alunos.length}
          totalFiltrado={alunosFiltrados.length}
        />
      )}

      {carregando ? (
        <Carregando texto="Carregando alunos…" />
      ) : alunos.length === 0 && !erroLista ? (
        <Vazio
          icone={<UserRound />}
          titulo="Nenhum aluno nas suas turmas"
          texto="Passe o código de convite da turma para os alunos se cadastrarem, ou cadastre você mesma."
          acao={
            podeAdicionar ? (
              <button type="button" onClick={() => setNovo(true)} className={classeBotao("primario")}>
                <Plus aria-hidden className="h-4 w-4" />
                Cadastrar primeiro aluno
              </button>
            ) : undefined
          }
        />
      ) : alunosFiltrados.length === 0 && alunos.length > 0 ? (
        <Vazio compacto titulo="Nenhum aluno encontrado com esses filtros" />
      ) : alunos.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] gap-4 border-b border-line bg-gray-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft md:grid">
            <span>Nome</span>
            <span>E-mail</span>
            <span>Turmas</span>
            <span className="w-[6.5rem] text-right">Ações</span>
          </div>
          <ul className="divide-y divide-line">
            {alunosFiltrados.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] md:gap-4 md:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar nome={a.nome} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{a.nome}</p>
                    <p className="truncate text-sm text-ink-soft md:hidden">{a.email}</p>
                  </div>
                </div>
                <p className="hidden truncate text-sm text-ink-soft md:block">{a.email}</p>
                <div className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1 md:row-auto">
                  {a.turmas.map((t) => (
                    <Link
                      key={t.id}
                      href={`/professor/turmas/${t.id}`}
                      className="inline-flex min-h-[32px] items-center rounded-full bg-accent-soft px-3 text-xs font-semibold text-accent hover:ring-1 hover:ring-accent/40"
                    >
                      {t.nome}
                    </Link>
                  ))}
                </div>
                <div className="col-start-2 row-start-1 flex justify-end gap-1 md:col-start-auto md:row-start-auto">
                  <button
                    type="button"
                    onClick={() => setEditando(a)}
                    aria-label={`Editar ${a.nome}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft hover:bg-gray-100 hover:text-ink"
                  >
                    <Pencil aria-hidden className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setErroExcluir("");
                      setExcluindo(a);
                    }}
                    aria-label={`Excluir ${a.nome}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft hover:bg-danger-soft hover:text-danger-ink"
                  >
                    <Trash2 aria-hidden className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {novo && (
        <DialogoNovoAluno
          turmas={turmas}
          onFechar={() => setNovo(false)}
          onCriado={(nome) => {
            setNovo(false);
            setAviso({ tom: "sucesso", texto: `${nome} foi cadastrado.` });
            void carregar();
          }}
        />
      )}

      {editando && (
        <DialogoEditarAluno
          aluno={editando}
          onFechar={() => setEditando(null)}
          onSalvo={(nome) => {
            setEditando(null);
            setAviso({ tom: "sucesso", texto: `Dados de ${nome} salvos.` });
            void carregar();
          }}
        />
      )}

      {excluindo && (
        <ConfirmarDialogo
          titulo="Excluir aluno?"
          rotuloConfirmar="Excluir definitivamente"
          ocupado={ocupadoExcluir}
          erro={erroExcluir}
          onConfirmar={() => void excluir()}
          onFechar={() => setExcluindo(null)}
        >
          <p>
            A conta de <strong className="text-ink">{excluindo.nome}</strong> ({excluindo.email}) será apagada, com as
            matrículas, entregas, notas e arquivos enviados. Esta ação não pode ser desfeita.
          </p>
        </ConfirmarDialogo>
      )}
    </div>
  );
}
