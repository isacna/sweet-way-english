"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { Plus, Upload } from "lucide-react";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] bg-card border border-line shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{titulo}</h2>
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
    <section className="card p-6 space-y-5">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Minha conta</h2>
      <form onSubmit={salvar} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="cfg-nome" className="block text-sm font-medium text-ink mb-1">
            Nome
          </label>
          <input
            id="cfg-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="cfg-email" className="block text-sm font-medium text-ink mb-1">
            Email
          </label>
          <input
            id="cfg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="cfg-senha" className="block text-sm font-medium text-ink mb-1">
            Nova senha <span className="text-ink-soft font-normal">(deixe em branco para manter)</span>
          </label>
          <input
            id="cfg-senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          />
        </div>
        {msg && (
          <p
            className={`text-sm px-4 py-3 rounded-lg ${
              msg.tipo === "ok"
                ? "text-success-ink bg-success-soft"
                : "text-danger-ink bg-danger-soft"
            }`}
          >
            {msg.texto}
          </p>
        )}
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center justify-center font-semibold rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 px-6 py-3 transition-[filter] disabled:opacity-70"
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

    // apiFetch manda o cookie de sessão (a rota exige admin)
    const res = await apiFetch("/configuracoes/logo", { method: "PATCH", body: form });

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
    <section className="card p-6 space-y-5">
      <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Aparência</h2>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink">Logo atual</p>
        <div className="flex items-center justify-center p-4 rounded-lg bg-gray-50 border border-dashed border-line-strong max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview ?? logoAtual ?? "/logo-sweet.png"}
            alt="Logo da aplicação"
            className="h-16 w-auto object-contain"
          />
        </div>
        {preview && (
          <p className="text-xs text-ink-soft">Pré-visualização do novo logo</p>
        )}
      </div>

      <form onSubmit={enviarLogo} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="cfg-logo" className="block text-sm font-medium text-ink mb-1">
            Selecionar novo logo
          </label>
          <input
            id="cfg-logo"
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onSelecionarArquivo}
            className="block w-full text-sm text-ink-soft file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
          />
          <p className="text-xs text-ink-soft mt-1">PNG, JPG ou SVG recomendado. Máx. 5 MB.</p>
        </div>
        {msg && (
          <p
            className={`text-sm px-4 py-3 rounded-lg ${
              msg.tipo === "ok"
                ? "text-success-ink bg-success-soft"
                : "text-danger-ink bg-danger-soft"
            }`}
          >
            {msg.texto}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando || !arquivo}
          className="inline-flex items-center gap-2 font-semibold rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 px-6 py-3 transition-[filter] disabled:opacity-70"
        >
          <Upload aria-hidden className="h-[16px] w-[16px] shrink-0" />
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
    <section className="card p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">Professores</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModalPromover(true)}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-accent text-accent hover:bg-accent/5 transition-colors"
          >
            Promover aluno
          </button>
          <button
            type="button"
            onClick={abrirCriar}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 transition-[filter]"
          >
            <Plus aria-hidden className="h-[14px] w-[14px] shrink-0" />
            Novo professor
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-ink-soft">Carregando…</p>
      ) : professores.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum professor cadastrado.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {professores.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{p.nome}</p>
                <p className="text-xs text-ink-soft truncate">{p.email}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => abrirEditar(p)}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void deletarProfessor(p)}
                  className="text-xs font-medium text-danger hover:underline"
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
              <label className="block text-sm font-medium text-ink mb-1">Nome</label>
              <input
                type="text"
                value={fNome}
                onChange={(e) => setFNome(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                type="email"
                value={fEmail}
                onChange={(e) => setFEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">
                {modalForm.modo === "criar" ? "Senha" : "Nova senha (deixe em branco para manter)"}
              </label>
              <input
                type="password"
                value={fSenha}
                onChange={(e) => setFSenha(e.target.value)}
                required={modalForm.modo === "criar"}
                placeholder={modalForm.modo === "editar" ? "••••••••" : undefined}
                className="w-full px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
              />
            </div>
            {fErro && <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">{fErro}</p>}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalForm(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-line-strong bg-card shadow-sm text-sm font-semibold text-ink hover:bg-gray-50 hover:border-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={fSalvando}
                className="flex-1 px-4 py-3 rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 text-sm font-semibold disabled:opacity-70"
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
              <label className="block text-sm font-medium text-ink mb-1">Email do aluno</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={buscaEmail}
                  onChange={(e) => { setBuscaEmail(e.target.value); setAlunoEncontrado(null); setBuscaErro(""); setPromoverMsg(null); }}
                  placeholder="aluno@email.com"
                  className="flex-1 px-4 py-3 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => void buscarAluno()}
                  className="px-4 py-3 rounded-lg bg-gray-100 text-sm font-medium text-ink hover:bg-gray-200"
                >
                  Buscar
                </button>
              </div>
              {buscaErro && <p className="text-sm text-danger-ink mt-2">{buscaErro}</p>}
            </div>

            {alunoEncontrado && (
              <div className="space-y-4">
                <div className="px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-sm font-medium text-ink">{alunoEncontrado.nome}</p>
                  <p className="text-xs text-ink-soft">{alunoEncontrado.email}</p>
                </div>

                <div className="px-4 py-3 rounded-lg bg-sun-soft border border-sun/40">
                  <p className="text-sm font-semibold text-sun-ink mb-1">⚠ Ação irreversível</p>
                  <p className="text-sm text-sun-ink">
                    Esta ação converterá a conta do aluno em professor. Todas as submissões,
                    matrículas e feedbacks do aluno serão permanentemente deletados.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoverConfirmado}
                    onChange={(e) => setPromoverConfirmado(e.target.checked)}
                    className="mt-1 rounded border-gray-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-ink">
                    Entendo que os dados do aluno serão perdidos e confirmo a promoção.
                  </span>
                </label>

                {promoverMsg && (
                  <p className={`text-sm px-4 py-3 rounded-lg ${promoverMsg.tipo === "ok" ? "text-success-ink bg-success-soft" : "text-danger-ink bg-danger-soft"}`}>
                    {promoverMsg.texto}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void promover()}
                  disabled={!promoverConfirmado || promovendo}
                  className="w-full px-4 py-3 rounded-xl bg-accent bg-[linear-gradient(163deg,#8a63f6,#7448f0_50%,#6236dc)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_1px_2px_rgb(34_27_58/0.2),0_4px_12px_-4px_rgb(98_54_220/0.45)] hover:brightness-110 active:brightness-95 text-sm font-semibold disabled:opacity-50 transition-[filter]"
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
  // No servidor não há localStorage: renderiza como não-admin e corrige na hidratação
  const admin = useSyncExternalStore(
    () => () => {},
    () => getStoredUser()?.admin === true,
    () => false,
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Configurações</h1>
        <p className="text-ink-soft mt-1">
          {admin ? "Gerencie sua conta, aparência e professores da plataforma." : "Gerencie sua conta."}
        </p>
      </div>
      <SecaoMinhaConta />
      {admin && <SecaoAparencia />}
      {admin && <SecaoProfessores />}
    </div>
  );
}
