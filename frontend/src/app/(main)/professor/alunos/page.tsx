"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { FiltroLista } from "@/components/FiltroLista";
import { apiFetch, apiPaths } from "@/lib/api";

type TurmaOpcao = { id: number; nome: string };

type AlunoLista = {
  id: number;
  nome: string;
  email: string;
  criadoEm: string;
  turmas: TurmaOpcao[];
};

function Modal({
  titulo,
  children,
  onFechar,
}: {
  titulo: string;
  children: React.ReactNode;
  onFechar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alunos-titulo"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-gray-100 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <h2
            id="modal-alunos-titulo"
            className="text-lg font-bold text-[#1A1A1A]"
          >
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-lg text-[#4A4A4A] hover:bg-gray-100"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function ProfessorAlunosPage() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<AlunoLista[]>([]);
  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");

  const [busca, setBusca] = useState("");
  const [turmaFiltro, setTurmaFiltro] = useState("");

  const alunosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alunos.filter((a) => {
      const matchBusca =
        q === "" ||
        a.nome.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q);
      const matchTurma =
        turmaFiltro === "" || a.turmas.some((t) => String(t.id) === turmaFiltro);
      return matchBusca && matchTurma;
    });
  }, [alunos, busca, turmaFiltro]);

  const [modalNovo, setModalNovo] = useState(false);
  const [editando, setEditando] = useState<AlunoLista | null>(null);
  const [excluindo, setExcluindo] = useState<AlunoLista | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [erroForm, setErroForm] = useState("");
  const [salvando, setSalvando] = useState(false);

  const [excluindoReq, setExcluindoReq] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLista("");
    const [resAlunos, resTurmas] = await Promise.all([
      apiFetch(apiPaths.professorAlunos),
      apiFetch("/turmas"),
    ]);
    if (resAlunos.status === 401 || resAlunos.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!resAlunos.ok || !resTurmas.ok) {
      setErroLista("Não foi possível carregar os dados.");
      setCarregando(false);
      return;
    }
    const lista: AlunoLista[] = await resAlunos.json();
    const turmasRaw: { id: number; nome: string }[] = await resTurmas.json();
    setAlunos(lista);
    setTurmas(turmasRaw);
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregar();
    });
  }, [carregar]);

  function abrirNovo() {
    setNome("");
    setEmail("");
    setSenha("");
    setConfirmarSenha("");
    setTurmaId(turmas[0] ? String(turmas[0].id) : "");
    setErroForm("");
    setModalNovo(true);
  }

  function abrirEditar(a: AlunoLista) {
    setEditando(a);
    setNome(a.nome);
    setEmail(a.email);
    setSenha("");
    setConfirmarSenha("");
    setErroForm("");
  }

  async function submitNovo(e: React.FormEvent) {
    e.preventDefault();
    setErroForm("");
    if (senha !== confirmarSenha) {
      setErroForm("As senhas não coincidem.");
      return;
    }
    if (senha.length < 6) {
      setErroForm("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!turmaId) {
      setErroForm("Selecione uma turma.");
      return;
    }
    setSalvando(true);
    const res = await apiFetch(apiPaths.professorAlunos, {
      method: "POST",
      body: JSON.stringify({
        nome,
        email,
        senha,
        turmaId: parseInt(turmaId, 10),
      }),
    });
    setSalvando(false);
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErroForm(data.error ?? "Não foi possível cadastrar.");
      return;
    }
    setModalNovo(false);
    void carregar();
  }

  async function submitEditar(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setErroForm("");
    if (senha) {
      if (senha !== confirmarSenha) {
        setErroForm("As senhas não coincidem.");
        return;
      }
      if (senha.length < 6) {
        setErroForm("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
    }
    setSalvando(true);
    const body: { nome: string; email: string; senha?: string } = {
      nome,
      email,
    };
    if (senha) body.senha = senha;
    const res = await apiFetch(apiPaths.professorAluno(editando.id), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setSalvando(false);
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErroForm(data.error ?? "Não foi possível salvar.");
      return;
    }
    setEditando(null);
    void carregar();
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setExcluindoReq(true);
    const res = await apiFetch(apiPaths.professorAluno(excluindo.id), {
      method: "DELETE",
    });
    setExcluindoReq(false);
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroLista(data.error ?? "Não foi possível excluir o aluno.");
      setExcluindo(null);
      return;
    }
    setExcluindo(null);
    void carregar();
  }

  const podeAdicionar = turmas.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/professor"
            className="inline-flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#1A1A1A] mb-2"
          >
            ← Voltar ao painel
          </Link>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Alunos</h1>
          <p className="text-[#4A4A4A] mt-1">
            Alunos matriculados nas suas turmas. Novos cadastros são vinculados a
            uma turma para aparecerem aqui.
          </p>
        </div>
        <button
          type="button"
          disabled={!podeAdicionar}
          onClick={abrirNovo}
          className="inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-[#1898DC] text-white px-5 py-3 hover:bg-[#147EB8] transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <Image src="/icons/plus-white.svg" alt="" width={18} height={18} />
          Novo aluno
        </button>
      </div>

      {!podeAdicionar && !carregando && (
        <p className="text-sm text-amber-800 bg-amber-50 px-4 py-3 rounded-xl border border-amber-100">
          Crie uma{" "}
          <Link
            href="/professor/turmas/nova"
            className="font-medium text-[#1898DC] hover:text-[#147EB8]"
          >
            turma
          </Link>{" "}
          antes de cadastrar alunos.
        </p>
      )}

      {erroLista && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          {erroLista}
        </p>
      )}

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

      <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {carregando ? (
          <p className="p-8 text-[#4A4A4A]">Carregando alunos…</p>
        ) : alunos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#4A4A4A] mb-4">
              Nenhum aluno nas suas turmas ainda.
            </p>
            {podeAdicionar && (
              <button
                type="button"
                onClick={abrirNovo}
                className="text-sm font-medium text-[#1898DC] hover:text-[#147EB8]"
              >
                Cadastrar primeiro aluno
              </button>
            )}
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <p className="p-8 text-center text-[#4A4A4A] text-sm">
            Nenhum aluno encontrado para os filtros aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 font-semibold text-[#1A1A1A]">
                    Nome
                  </th>
                  <th className="px-6 py-3 font-semibold text-[#1A1A1A]">
                    Email
                  </th>
                  <th className="px-6 py-3 font-semibold text-[#1A1A1A]">
                    Turmas
                  </th>
                  <th className="px-6 py-3 font-semibold text-[#1A1A1A] w-40">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunosFiltrados.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80">
                    <td className="px-6 py-4 font-medium text-[#1A1A1A]">
                      {a.nome}
                    </td>
                    <td className="px-6 py-4 text-[#4A4A4A]">{a.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {a.turmas.map((t) => (
                          <Link
                            key={t.id}
                            href={`/professor/turmas/${t.id}`}
                            className="inline-block px-2.5 py-0.5 rounded-full bg-[#1898DC]/10 text-[#1898DC] text-xs font-medium hover:bg-[#1898DC]/20"
                          >
                            {t.nome}
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(a)}
                          className="text-xs font-medium text-[#1898DC] hover:text-[#147EB8]"
                        >
                          Editar
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          type="button"
                          onClick={() => setExcluindo(a)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalNovo && (
        <Modal titulo="Novo aluno" onFechar={() => setModalNovo(false)}>
          <form onSubmit={submitNovo} className="space-y-4">
            <div>
              <label
                htmlFor="novo-nome"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Nome completo
              </label>
              <input
                id="novo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            <div>
              <label
                htmlFor="novo-email"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Email
              </label>
              <input
                id="novo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            <div>
              <label
                htmlFor="novo-turma"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Turma
              </label>
              <select
                id="novo-turma"
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              >
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="novo-senha"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Senha inicial
              </label>
              <input
                id="novo-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            <div>
              <label
                htmlFor="novo-confirmar"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Confirmar senha
              </label>
              <input
                id="novo-confirmar"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            {erroForm && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {erroForm}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setModalNovo(false)}
              >
                Cancelar
              </Button>
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center justify-center font-medium rounded-lg bg-[#1898DC] text-white px-5 py-2.5 hover:bg-[#147EB8] disabled:opacity-70"
              >
                {salvando ? "Salvando…" : "Cadastrar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editando && (
        <Modal
          titulo="Editar aluno"
          onFechar={() => setEditando(null)}
        >
          <form onSubmit={submitEditar} className="space-y-4">
            <p className="text-xs text-[#4A4A4A]">
              Turmas:{" "}
              {editando.turmas.map((t) => t.nome).join(", ") || "—"} — para
              mudar matrícula, use a página da turma.
            </p>
            <div>
              <label
                htmlFor="edit-nome"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Nome
              </label>
              <input
                id="edit-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            <div>
              <label
                htmlFor="edit-email"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            <div>
              <label
                htmlFor="edit-senha"
                className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
              >
                Nova senha (opcional)
              </label>
              <input
                id="edit-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                minLength={6}
                placeholder="Deixe em branco para manter"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            {senha ? (
              <div>
                <label
                  htmlFor="edit-confirmar"
                  className="block text-sm font-medium text-[#1A1A1A] mb-1.5"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="edit-confirmar"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
                />
              </div>
            ) : null}
            {erroForm && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {erroForm}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setEditando(null)}
              >
                Cancelar
              </Button>
              <button
                type="submit"
                disabled={salvando}
                className="inline-flex items-center justify-center font-medium rounded-lg bg-[#1898DC] text-white px-5 py-2.5 hover:bg-[#147EB8] disabled:opacity-70"
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {excluindo && (
        <Modal titulo="Excluir aluno" onFechar={() => setExcluindo(null)}>
          <p className="text-[#4A4A4A] text-sm mb-6">
            Tem certeza que deseja excluir <strong>{excluindo.nome}</strong>?
            Todas as matrículas, submissões e dados vinculados a este aluno
            serão removidos. Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setExcluindo(null)}
            >
              Cancelar
            </Button>
            <button
              type="button"
              disabled={excluindoReq}
              onClick={() => void confirmarExclusao()}
              className="inline-flex items-center justify-center font-medium rounded-lg bg-red-600 text-white px-5 py-2.5 hover:bg-red-700 disabled:opacity-70"
            >
              {excluindoReq ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
