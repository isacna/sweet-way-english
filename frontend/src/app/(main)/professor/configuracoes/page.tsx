"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ProfessorPerfil = { id: number; nome: string; email: string; criadoEm: string };

// ─── Modal genérico ──────────────────────────────────────────────────────────

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
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-gray-100 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#1A1A1A]">{titulo}</h2>
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

// ─── Seção: Minha conta ───────────────────────────────────────────────────────

function SecaoMinhaConta() {
  const [perfil, setPerfil] = useState<ProfessorPerfil | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    apiFetch("/professor/me").then(async (res) => {
      if (res.ok) {
        const d: ProfessorPerfil = await res.json();
        setPerfil(d);
        setNome(d.nome);
        setEmail(d.email);
      }
    });
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSalvando(true);
    const body: Record<string, string> = {};
    if (nome !== perfil?.nome) body.nome = nome;
    if (email !== perfil?.email) body.email = email;
    if (senha.trim()) body.senha = senha;

    if (Object.keys(body).length === 0) {
      setMsg({ tipo: "erro", texto: "Nenhuma alteração detectada." });
      setSalvando(false);
      return;
    }

    const res = await apiFetch("/professor/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSalvando(false);
    if (!res.ok) {
      setMsg({ tipo: "erro", texto: data.error ?? "Erro ao salvar." });
      return;
    }
    setPerfil(data);
    setNome(data.nome);
    setEmail(data.email);
    setSenha("");
    setMsg({ tipo: "ok", texto: "Perfil atualizado com sucesso." });
  }

  return (
    <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm space-y-5">
      <h2 className="text-lg font-bold text-[#1A1A1A]">Minha conta</h2>
      <form onSubmit={salvar} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="cfg-nome" className="block text-sm font-medium text-[#1A1A1A] mb-1">
            Nome
          </label>
          <input
            id="cfg-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
          />
        </div>
        <div>
          <label htmlFor="cfg-email" className="block text-sm font-medium text-[#1A1A1A] mb-1">
            Email
          </label>
          <input
            id="cfg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
          />
        </div>
        <div>
          <label htmlFor="cfg-senha" className="block text-sm font-medium text-[#1A1A1A] mb-1">
            Nova senha <span className="text-[#4A4A4A] font-normal">(deixe em branco para manter)</span>
          </label>
          <input
            id="cfg-senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
          />
        </div>
        {msg && (
          <p
            className={`text-sm px-4 py-3 rounded-lg ${
              msg.tipo === "ok"
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}
          >
            {msg.texto}
          </p>
        )}
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center justify-center font-medium rounded-lg bg-[#1898DC] text-white px-6 py-3 hover:bg-[#147EB8] transition-colors disabled:opacity-70"
        >
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </section>
  );
}

// ─── Seção: Aparência (logo) ──────────────────────────────────────────────────

function SecaoAparencia() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoAtual, setLogoAtual] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    apiFetch("/configuracoes").then(async (res) => {
      if (res.ok) {
        const d = await res.json();
        setLogoAtual(d.logoUrl ?? null);
      }
    });
  }, []);

  function onSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArquivo(f);
    setPreview(URL.createObjectURL(f));
    setMsg(null);
  }

  async function enviarLogo(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) return;
    setMsg(null);
    setEnviando(true);

    const form = new FormData();
    form.append("logo", arquivo);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/api/configuracoes/logo`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : ""}`,
        },
        body: form,
      }
    );

    const data = await res.json().catch(() => ({}));
    setEnviando(false);

    if (!res.ok) {
      setMsg({ tipo: "erro", texto: data.error ?? "Erro ao enviar logo." });
      return;
    }

    setLogoAtual(data.logoUrl);
    setPreview(null);
    setArquivo(null);
    if (inputRef.current) inputRef.current.value = "";
    setMsg({ tipo: "ok", texto: "Logo atualizado com sucesso." });
    router.refresh();
  }

  return (
    <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm space-y-5">
      <h2 className="text-lg font-bold text-[#1A1A1A]">Aparência</h2>

      <div className="space-y-3">
        <p className="text-sm font-medium text-[#1A1A1A]">Logo atual</p>
        <div className="flex items-center justify-center p-4 rounded-lg bg-gray-50 border border-dashed border-gray-200 max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview ?? logoAtual ?? "/logo-sweet.png"}
            alt="Logo da aplicação"
            className="h-16 w-auto object-contain"
          />
        </div>
        {preview && (
          <p className="text-xs text-[#4A4A4A]">Pré-visualização do novo logo</p>
        )}
      </div>

      <form onSubmit={enviarLogo} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="cfg-logo" className="block text-sm font-medium text-[#1A1A1A] mb-1">
            Selecionar novo logo
          </label>
          <input
            id="cfg-logo"
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onSelecionarArquivo}
            className="block w-full text-sm text-[#4A4A4A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1898DC]/10 file:text-[#1898DC] hover:file:bg-[#1898DC]/20 cursor-pointer"
          />
          <p className="text-xs text-[#4A4A4A] mt-1">PNG, JPG ou SVG recomendado. Máx. 5 MB.</p>
        </div>
        {msg && (
          <p
            className={`text-sm px-4 py-3 rounded-lg ${
              msg.tipo === "ok"
                ? "text-green-700 bg-green-50"
                : "text-red-600 bg-red-50"
            }`}
          >
            {msg.texto}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando || !arquivo}
          className="inline-flex items-center gap-2 font-medium rounded-lg bg-[#1898DC] text-white px-6 py-3 hover:bg-[#147EB8] transition-colors disabled:opacity-70"
        >
          <Image src="/icons/upload-white.svg" alt="" width={16} height={16} />
          {enviando ? "Enviando…" : "Enviar logo"}
        </button>
      </form>
    </section>
  );
}

// ─── Seção: Gestão de professores ─────────────────────────────────────────────

type ProfessorItem = { id: number; nome: string; email: string; criadoEm: string };

function SecaoProfessores() {
  const [professores, setProfessores] = useState<ProfessorItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Modal criar/editar
  const [modalForm, setModalForm] = useState<{ modo: "criar" | "editar"; prof?: ProfessorItem } | null>(null);
  const [fNome, setFNome] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fSenha, setFSenha] = useState("");
  const [fErro, setFErro] = useState("");
  const [fSalvando, setFSalvando] = useState(false);

  // Modal promover aluno
  const [modalPromover, setModalPromover] = useState(false);
  const [buscaEmail, setBuscaEmail] = useState("");
  const [alunoEncontrado, setAlunoEncontrado] = useState<{ id: number; nome: string; email: string } | null>(null);
  const [buscaErro, setBuscaErro] = useState("");
  const [promoverConfirmado, setPromoverConfirmado] = useState(false);
  const [promovendo, setPromovendo] = useState(false);
  const [promoverMsg, setPromoverMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const res = await apiFetch("/admin/professores");
    if (res.ok) setProfessores(await res.json());
    setCarregando(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  function abrirCriar() {
    setFNome(""); setFEmail(""); setFSenha(""); setFErro("");
    setModalForm({ modo: "criar" });
  }

  function abrirEditar(p: ProfessorItem) {
    setFNome(p.nome); setFEmail(p.email); setFSenha(""); setFErro("");
    setModalForm({ modo: "editar", prof: p });
  }

  async function salvarForm(e: React.FormEvent) {
    e.preventDefault();
    setFErro("");
    setFSalvando(true);

    const body: Record<string, string> = {};
    if (modalForm?.modo === "criar") {
      body.nome = fNome; body.email = fEmail; body.senha = fSenha;
    } else {
      if (fNome !== modalForm?.prof?.nome) body.nome = fNome;
      if (fEmail !== modalForm?.prof?.email) body.email = fEmail;
      if (fSenha.trim()) body.senha = fSenha;
    }

    const url = modalForm?.modo === "criar"
      ? "/admin/professores"
      : `/admin/professores/${modalForm?.prof?.id}`;
    const method = modalForm?.modo === "criar" ? "POST" : "PATCH";

    const res = await apiFetch(url, { method, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setFSalvando(false);

    if (!res.ok) { setFErro(data.error ?? "Erro ao salvar."); return; }
    setModalForm(null);
    void carregar();
  }

  async function deletarProfessor(p: ProfessorItem) {
    if (!confirm(`Deletar o professor "${p.nome}"? Todas as turmas e atividades dele serão removidas.`)) return;
    await apiFetch(`/admin/professores/${p.id}`, { method: "DELETE" });
    void carregar();
  }

  async function buscarAluno() {
    setBuscaErro("");
    setAlunoEncontrado(null);
    setPromoverConfirmado(false);
    setPromoverMsg(null);
    if (!buscaEmail.trim()) { setBuscaErro("Informe um email."); return; }

    const res = await apiFetch("/professor/alunos");
    if (!res.ok) { setBuscaErro("Erro ao buscar alunos."); return; }
    const lista: { id: number; nome: string; email: string }[] = await res.json();
    const encontrado = lista.find((a) => a.email.toLowerCase() === buscaEmail.trim().toLowerCase());
    if (!encontrado) { setBuscaErro("Nenhum aluno encontrado com este email."); return; }
    setAlunoEncontrado(encontrado);
  }

  async function promover() {
    if (!alunoEncontrado || !promoverConfirmado) return;
    setPromovendo(true);
    setPromoverMsg(null);
    const res = await apiFetch(`/admin/alunos/${alunoEncontrado.id}/promover`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setPromovendo(false);
    if (!res.ok) {
      setPromoverMsg({ tipo: "erro", texto: data.error ?? "Erro ao promover." });
      return;
    }
    setPromoverMsg({ tipo: "ok", texto: `${alunoEncontrado.nome} agora é professor.` });
    setAlunoEncontrado(null);
    setBuscaEmail("");
    setPromoverConfirmado(false);
    void carregar();
  }

  return (
    <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-[#1A1A1A]">Professores</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModalPromover(true)}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-[#1898DC] text-[#1898DC] hover:bg-[#1898DC]/5 transition-colors"
          >
            Promover aluno
          </button>
          <button
            type="button"
            onClick={abrirCriar}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#1898DC] text-white hover:bg-[#147EB8] transition-colors"
          >
            <Image src="/icons/plus-white.svg" alt="" width={14} height={14} />
            Novo professor
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-[#4A4A4A]">Carregando…</p>
      ) : professores.length === 0 ? (
        <p className="text-sm text-[#4A4A4A]">Nenhum professor cadastrado.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
          {professores.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{p.nome}</p>
                <p className="text-xs text-[#4A4A4A] truncate">{p.email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => abrirEditar(p)}
                  className="text-xs font-medium text-[#1898DC] hover:underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void deletarProfessor(p)}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  Deletar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal criar/editar professor */}
      {modalForm && (
        <Modal
          titulo={modalForm.modo === "criar" ? "Novo professor" : "Editar professor"}
          onFechar={() => setModalForm(null)}
        >
          <form onSubmit={salvarForm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Nome</label>
              <input
                type="text"
                value={fNome}
                onChange={(e) => setFNome(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Email</label>
              <input
                type="email"
                value={fEmail}
                onChange={(e) => setFEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                {modalForm.modo === "criar" ? "Senha" : "Nova senha (deixe em branco para manter)"}
              </label>
              <input
                type="password"
                value={fSenha}
                onChange={(e) => setFSenha(e.target.value)}
                required={modalForm.modo === "criar"}
                placeholder={modalForm.modo === "editar" ? "••••••••" : undefined}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
              />
            </div>
            {fErro && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{fErro}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalForm(null)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-sm font-medium text-[#4A4A4A] hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={fSalvando}
                className="flex-1 px-4 py-3 rounded-lg bg-[#1898DC] text-white text-sm font-medium hover:bg-[#147EB8] disabled:opacity-70"
              >
                {fSalvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal promover aluno */}
      {modalPromover && (
        <Modal titulo="Promover aluno a professor" onFechar={() => setModalPromover(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Email do aluno</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={buscaEmail}
                  onChange={(e) => { setBuscaEmail(e.target.value); setAlunoEncontrado(null); setBuscaErro(""); setPromoverMsg(null); }}
                  placeholder="aluno@email.com"
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
                />
                <button
                  type="button"
                  onClick={() => void buscarAluno()}
                  className="px-4 py-3 rounded-lg bg-gray-100 text-sm font-medium text-[#1A1A1A] hover:bg-gray-200"
                >
                  Buscar
                </button>
              </div>
              {buscaErro && <p className="text-sm text-red-600 mt-2">{buscaErro}</p>}
            </div>

            {alunoEncontrado && (
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm font-medium text-[#1A1A1A]">{alunoEncontrado.nome}</p>
                  <p className="text-xs text-[#4A4A4A]">{alunoEncontrado.email}</p>
                </div>

                <div className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm font-semibold text-amber-800 mb-1">⚠ Ação irreversível</p>
                  <p className="text-sm text-amber-700">
                    Esta ação converterá a conta do aluno em professor. Todas as submissões,
                    matrículas e feedbacks do aluno serão permanentemente deletados.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoverConfirmado}
                    onChange={(e) => setPromoverConfirmado(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-[#1898DC] focus:ring-[#1898DC]"
                  />
                  <span className="text-sm text-[#1A1A1A]">
                    Entendo que os dados do aluno serão perdidos e confirmo a promoção.
                  </span>
                </label>

                {promoverMsg && (
                  <p className={`text-sm px-4 py-3 rounded-lg ${promoverMsg.tipo === "ok" ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"}`}>
                    {promoverMsg.texto}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void promover()}
                  disabled={!promoverConfirmado || promovendo}
                  className="w-full px-4 py-3 rounded-lg bg-[#1898DC] text-white text-sm font-medium hover:bg-[#147EB8] disabled:opacity-50 transition-colors"
                >
                  {promovendo ? "Promovendo…" : "Confirmar promoção"}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Configurações</h1>
        <p className="text-[#4A4A4A] mt-1">Gerencie sua conta, aparência e professores da plataforma.</p>
      </div>
      <SecaoMinhaConta />
      <SecaoAparencia />
      <SecaoProfessores />
    </div>
  );
}
