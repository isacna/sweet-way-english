"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { FiltroLista } from "@/components/FiltroLista";
import { apiFetch, apiPaths } from "@/lib/api";
import { Plus } from "lucide-react";

type TurmaOpcao = { id: number; nome: string };

/** Idade em anos completos a partir de "AAAA-MM-DD" (null se a data for inválida). */
function idadeEmAnos(data: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return null;
  const hoje = new Date();
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade -= 1;
  return idade;
}

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-alunos-titulo"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] bg-card border border-line shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
          <h2
            id="modal-alunos-titulo"
            className="text-lg font-semibold tracking-[-0.01em] text-ink"
          >
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-lg text-ink-soft hover:bg-gray-100"
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
  const [dataNascimento, setDataNascimento] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelEmail, setResponsavelEmail] = useState("");
  const [consentimentoResponsavel, setConsentimentoResponsavel] = useState(false);
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
    setDataNascimento("");
    setResponsavelNome("");
    setResponsavelEmail("");
    setConsentimentoResponsavel(false);
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
    const idade = dataNascimento ? idadeEmAnos(dataNascimento) : null;
    if (dataNascimento && (idade === null || idade < 0)) {
      setErroForm("Data de nascimento inválida.");
      return;
    }
    const menor = idade !== null && idade < 18;
    if (menor) {
      if (!responsavelNome.trim() || !responsavelEmail.trim()) {
        setErroForm("Informe o nome e o e-mail do responsável (aluno menor de 18 anos).");
        return;
      }
      if (!consentimentoResponsavel) {
        setErroForm("É preciso confirmar o consentimento do responsável.");
        return;
      }
    }
    setSalvando(true);
    const res = await apiFetch(apiPaths.professorAlunos, {
      method: "POST",
      body: JSON.stringify({
        nome,
        email,
        senha,
        turmaId: parseInt(turmaId, 10),
        ...(dataNascimento ? { dataNascimento } : {}),
        ...(menor
          ? {
              responsavelNome: responsavelNome.trim(),
              responsavelEmail: responsavelEmail.trim(),
              consentimentoResponsavel: true,
            }
          : {}),
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
  const idadeNovo = dataNascimento ? idadeEmAnos(dataNascimento) : null;
  const novoMenor = idadeNovo !== null && idadeNovo >= 0 && idadeNovo < 18;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            href="/professor"
            className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-2"
          >
            ← Voltar ao painel
          </Link>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Alunos</h1>
          <p className="text-ink-soft mt-1">
            Alunos matriculados nas suas turmas. Novos cadastros são vinculados a
            uma turma para aparecerem aqui.
          </p>
        </div>
        <button
          type="button"
          disabled={!podeAdicionar}
          onClick={abrirNovo}
          className="inline-flex items-center justify-center gap-2 font-semibold rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 px-5 py-3 transition-[filter] disabled:opacity-50 disabled:pointer-events-none"
        >
          <Plus aria-hidden className="h-[18px] w-[18px] shrink-0" />
          Novo aluno
        </button>
      </div>

      {!podeAdicionar && !carregando && (
        <p className="text-sm text-sun-ink bg-sun-soft px-4 py-3 rounded-xl border border-sun/40">
          Crie uma{" "}
          <Link
            href="/professor/turmas/nova"
            className="font-medium text-accent hover:text-accent-strong"
          >
            turma
          </Link>{" "}
          antes de cadastrar alunos.
        </p>
      )}

      {erroLista && (
        <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">
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

      <div className="card overflow-hidden">
        {carregando ? (
          <p className="p-8 text-ink-soft">Carregando alunos…</p>
        ) : alunos.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-ink-soft mb-4">
              Nenhum aluno nas suas turmas ainda.
            </p>
            {podeAdicionar && (
              <button
                type="button"
                onClick={abrirNovo}
                className="text-sm font-medium text-accent hover:text-accent-strong"
              >
                Cadastrar primeiro aluno
              </button>
            )}
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <p className="p-8 text-center text-ink-soft text-sm">
            Nenhum aluno encontrado para os filtros aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-line">
                <tr>
                  <th className="px-6 py-3 font-semibold text-ink">
                    Nome
                  </th>
                  <th className="px-6 py-3 font-semibold text-ink">
                    Email
                  </th>
                  <th className="px-6 py-3 font-semibold text-ink">
                    Turmas
                  </th>
                  <th className="px-6 py-3 font-semibold text-ink w-40">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {alunosFiltrados.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80">
                    <td className="px-6 py-4 font-medium text-ink">
                      {a.nome}
                    </td>
                    <td className="px-6 py-4 text-ink-soft">{a.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {a.turmas.map((t) => (
                          <Link
                            key={t.id}
                            href={`/professor/turmas/${t.id}`}
                            className="inline-block px-2.5 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20"
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
                          className="text-xs font-medium text-accent hover:text-accent-strong"
                        >
                          Editar
                        </button>
                        <span className="text-gray-300" aria-hidden>|</span>
                        <button
                          type="button"
                          onClick={() => setExcluindo(a)}
                          className="text-xs font-medium text-danger-ink hover:text-danger-ink"
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
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Nome completo
              </label>
              <input
                id="novo-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="novo-email"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Email
              </label>
              <input
                id="novo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="novo-turma"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Turma
              </label>
              <select
                id="novo-turma"
                value={turmaId}
                onChange={(e) => setTurmaId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
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
                htmlFor="novo-nascimento"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Data de nascimento (opcional)
              </label>
              <input
                id="novo-nascimento"
                type="date"
                value={dataNascimento}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            {novoMenor && (
              <div className="space-y-4 rounded-lg border border-sun/40 bg-sun-soft/60 p-4">
                <p className="text-xs text-sun-ink">
                  Aluno menor de 18 anos: os dados do responsável e o consentimento
                  dele são obrigatórios (LGPD, art. 14).
                </p>
                <div>
                  <label
                    htmlFor="novo-resp-nome"
                    className="block text-sm font-medium text-ink mb-1.5"
                  >
                    Nome do responsável
                  </label>
                  <input
                    id="novo-resp-nome"
                    value={responsavelNome}
                    onChange={(e) => setResponsavelNome(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="novo-resp-email"
                    className="block text-sm font-medium text-ink mb-1.5"
                  >
                    E-mail do responsável
                  </label>
                  <input
                    id="novo-resp-email"
                    type="email"
                    value={responsavelEmail}
                    onChange={(e) => setResponsavelEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={consentimentoResponsavel}
                    onChange={(e) => setConsentimentoResponsavel(e.target.checked)}
                    required
                    className="mt-0.5"
                  />
                  <span>
                    Confirmo que o responsável autorizou o cadastro e o uso da
                    plataforma por este aluno.
                  </span>
                </label>
              </div>
            )}
            <div>
              <label
                htmlFor="novo-senha"
                className="block text-sm font-medium text-ink mb-1.5"
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
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="novo-confirmar"
                className="block text-sm font-medium text-ink mb-1.5"
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
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            {erroForm && (
              <p className="text-sm text-danger-ink bg-danger-soft px-3 py-2 rounded-2xl font-medium">
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
                className="inline-flex items-center justify-center font-semibold rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 px-5 py-2.5 disabled:opacity-70"
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
            <p className="text-xs text-ink-soft">
              Turmas:{" "}
              {editando.turmas.map((t) => t.nome).join(", ") || "—"} — para
              mudar matrícula, use a página da turma.
            </p>
            <div>
              <label
                htmlFor="edit-nome"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Nome
              </label>
              <input
                id="edit-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="edit-email"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Email
              </label>
              <input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="edit-senha"
                className="block text-sm font-medium text-ink mb-1.5"
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
                className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            {senha ? (
              <div>
                <label
                  htmlFor="edit-confirmar"
                  className="block text-sm font-medium text-ink mb-1.5"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="edit-confirmar"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
              </div>
            ) : null}
            {erroForm && (
              <p className="text-sm text-danger-ink bg-danger-soft px-3 py-2 rounded-2xl font-medium">
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
                className="inline-flex items-center justify-center font-semibold rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 px-5 py-2.5 disabled:opacity-70"
              >
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {excluindo && (
        <Modal titulo="Excluir aluno" onFechar={() => setExcluindo(null)}>
          <p className="text-ink-soft text-sm mb-6">
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
              className="inline-flex items-center justify-center font-medium rounded-lg bg-danger text-white px-5 py-2.5 hover:bg-danger-strong disabled:opacity-70"
            >
              {excluindoReq ? "Excluindo…" : "Excluir definitivamente"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
