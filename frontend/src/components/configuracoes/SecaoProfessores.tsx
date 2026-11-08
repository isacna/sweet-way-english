"use client";

import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AcoesDialogo, ConfirmarDialogo, Dialogo } from "@/components/painel/Dialogo";
import {
  Avatar,
  CaixaMarcar,
  Campo,
  Carregando,
  classeBotao,
  classeCampo,
  erroDaApi,
  Mensagem,
  RegiaoAoVivo,
  Secao,
  Selo,
} from "@/components/painel/ui";
import { apiFetch, getStoredUser } from "@/lib/api";

type Professor = { id: number; nome: string; email: string; criadoEm: string; admin?: boolean };
type AlunoBusca = { id: number; nome: string; email: string };

function DialogoProfessor({
  professor,
  onFechar,
  onSalvo,
}: {
  professor: Professor | null;
  onFechar: () => void;
  onSalvo: (texto: string) => void;
}) {
  const criando = !professor;
  const [nome, setNome] = useState(professor?.nome ?? "");
  const [email, setEmail] = useState(professor?.email ?? "");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome.trim() || !email.trim()) return setErro("Informe nome e e-mail.");
    if ((criando || senha) && senha.trim().length < 6) return setErro("A senha precisa ter pelo menos 6 caracteres.");
    const body: Record<string, string> = {};
    if (criando) Object.assign(body, { nome: nome.trim(), email: email.trim(), senha });
    else {
      if (nome.trim() !== professor.nome) body.nome = nome.trim();
      if (email.trim().toLowerCase() !== professor.email.toLowerCase()) body.email = email.trim();
      if (senha) body.senha = senha;
      if (Object.keys(body).length === 0) return onFechar();
    }
    setSalvando(true);
    const res = await apiFetch(criando ? "/admin/professores" : `/admin/professores/${professor.id}`, {
      method: criando ? "POST" : "PATCH",
      body: JSON.stringify(body),
    }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível salvar."));
      return;
    }
    onSalvo(criando ? `${nome.trim()} foi cadastrado como professor.` : `Dados de ${nome.trim()} salvos.`);
  }

  return (
    <Dialogo titulo={criando ? "Novo professor" : "Editar professor"} onFechar={onFechar} bloquearFechar={salvando}>
      <form onSubmit={salvar} className="space-y-4" noValidate>
        <Campo id="prof-nome" rotulo="Nome">
          <input id="prof-nome" value={nome} onChange={(e) => setNome(e.target.value)} required className={classeCampo} />
        </Campo>
        <Campo id="prof-email" rotulo="E-mail" dica="É o login do professor.">
          <input
            id="prof-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={classeCampo}
          />
        </Campo>
        <Campo
          id="prof-senha"
          rotulo={criando ? "Senha inicial" : "Nova senha"}
          opcional={!criando}
          dica={criando ? "Mínimo de 6 caracteres. Peça para trocar no primeiro acesso." : "Deixe em branco para manter."}
        >
          <input
            id="prof-senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required={criando}
            className={classeCampo}
          />
        </Campo>
        {erro && <Mensagem tom="erro">{erro}</Mensagem>}
        <AcoesDialogo>
          <button type="button" onClick={onFechar} disabled={salvando} className={classeBotao("secundario")}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className={classeBotao("primario")}>
            {salvando ? "Salvando…" : criando ? "Cadastrar professor" : "Salvar"}
          </button>
        </AcoesDialogo>
      </form>
    </Dialogo>
  );
}

function DialogoPromover({ onFechar, onPromovido }: { onFechar: () => void; onPromovido: (texto: string) => void }) {
  const [busca, setBusca] = useState("");
  const [aluno, setAluno] = useState<AlunoBusca | null>(null);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [promovendo, setPromovendo] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAluno(null);
    setConfirmado(false);
    const alvo = busca.trim().toLowerCase();
    if (!alvo) return setErro("Informe o e-mail do aluno.");
    setBuscando(true);
    const res = await apiFetch("/professor/alunos").catch(() => null);
    setBuscando(false);
    if (!res?.ok) return setErro(await erroDaApi(res, "Não foi possível buscar os alunos."));
    const lista: AlunoBusca[] = await res.json();
    const achado = lista.find((a) => a.email.toLowerCase() === alvo);
    if (!achado) return setErro("Nenhum aluno das suas turmas tem este e-mail.");
    setAluno(achado);
  }

  async function promover() {
    if (!aluno || !confirmado) return;
    setErro("");
    setPromovendo(true);
    const res = await apiFetch(`/admin/alunos/${aluno.id}/promover`, { method: "POST" }).catch(() => null);
    setPromovendo(false);
    if (!res?.ok) return setErro(await erroDaApi(res, "Não foi possível promover."));
    onPromovido(`${aluno.nome} agora é professor.`);
  }

  return (
    <Dialogo
      titulo="Promover aluno a professor"
      descricao="Só alunos das suas turmas aparecem na busca."
      onFechar={onFechar}
      bloquearFechar={promovendo}
    >
      <form onSubmit={buscar} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Campo id="promover-email" rotulo="E-mail do aluno" className="min-w-0 flex-1">
          <input
            id="promover-email"
            type="email"
            inputMode="email"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setAluno(null);
              setErro("");
            }}
            placeholder="aluno@email.com"
            className={classeCampo}
          />
        </Campo>
        <button type="submit" disabled={buscando} className={classeBotao("secundario")}>
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {aluno && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-gray-50 px-3.5 py-3">
            <Avatar nome={aluno.nome} />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{aluno.nome}</p>
              <p className="truncate text-sm text-ink-soft">{aluno.email}</p>
            </div>
          </div>
          <Mensagem tom="alerta">
            Ação irreversível: a conta vira professor e as entregas, matrículas e notas do aluno são apagadas.
          </Mensagem>
          <CaixaMarcar id="promover-confirmar" checked={confirmado} onChange={setConfirmado}>
            Entendo que os dados do aluno serão perdidos e confirmo a promoção.
          </CaixaMarcar>
        </div>
      )}
      {erro && <Mensagem tom="erro" className="mt-4">{erro}</Mensagem>}
      <AcoesDialogo>
        <button type="button" onClick={onFechar} disabled={promovendo} className={classeBotao("secundario")}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void promover()}
          disabled={!aluno || !confirmado || promovendo}
          className={classeBotao("perigo")}
        >
          {promovendo ? "Promovendo…" : "Promover a professor"}
        </button>
      </AcoesDialogo>
    </Dialogo>
  );
}

/** Gestão de professores (só admin): listar, criar, editar, excluir e promover aluno. */
export function SecaoProfessores() {
  const [professores, setProfessores] = useState<Professor[] | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState<{ tom: "sucesso"; texto: string } | null>(null);
  const [form, setForm] = useState<{ professor: Professor | null } | null>(null);
  const [promover, setPromover] = useState(false);
  const [excluindo, setExcluindo] = useState<Professor | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroExcluir, setErroExcluir] = useState("");
  const [meuId, setMeuId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setErro("");
    const res = await apiFetch("/admin/professores").catch(() => null);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível carregar os professores."));
      setProfessores([]);
      return;
    }
    setProfessores(await res.json());
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setMeuId(getStoredUser()?.id ?? null);
      void carregar();
    });
  }, [carregar]);

  function concluido(texto: string) {
    setForm(null);
    setPromover(false);
    setAviso({ tom: "sucesso", texto });
    void carregar();
  }

  async function excluir() {
    if (!excluindo) return;
    setErroExcluir("");
    setOcupado(true);
    const res = await apiFetch(`/admin/professores/${excluindo.id}`, { method: "DELETE" }).catch(() => null);
    setOcupado(false);
    if (!res?.ok) {
      setErroExcluir(await erroDaApi(res, "Não foi possível excluir o professor."));
      return;
    }
    const nome = excluindo.nome;
    setExcluindo(null);
    concluido(`${nome} foi excluído.`);
  }

  return (
    <Secao
      id="professores"
      titulo="Professores"
      descricao="Contas com acesso à área da professora."
      acao={
        <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
          <button type="button" onClick={() => setPromover(true)} className={classeBotao("secundario")}>
            <UserPlus aria-hidden className="h-4 w-4" />
            Promover aluno
          </button>
          <button type="button" onClick={() => setForm({ professor: null })} className={classeBotao("primario")}>
            <Plus aria-hidden className="h-4 w-4" />
            Novo professor
          </button>
        </div>
      }
    >
      <RegiaoAoVivo mensagem={aviso} className="mb-4" />
      {erro && <Mensagem tom="erro" className="mb-4">{erro}</Mensagem>}
      {professores === null ? (
        <Carregando />
      ) : professores.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum professor cadastrado.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {professores.map((p) => {
            const souEu = p.id === meuId;
            return (
              <li key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <Avatar nome={p.nome} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
                    <span className="truncate">{p.nome}</span>
                    {souEu && <Selo tom="accent">Você</Selo>}
                    {p.admin && <Selo>Admin</Selo>}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{p.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ professor: p })}
                  aria-label={`Editar ${p.nome}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-gray-100 hover:text-ink"
                >
                  <Pencil aria-hidden className="h-[18px] w-[18px]" />
                </button>
                {!souEu && (
                  <button
                    type="button"
                    onClick={() => {
                      setErroExcluir("");
                      setExcluindo(p);
                    }}
                    aria-label={`Excluir ${p.nome}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-danger-soft hover:text-danger-ink"
                  >
                    <Trash2 aria-hidden className="h-[18px] w-[18px]" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {form && <DialogoProfessor professor={form.professor} onFechar={() => setForm(null)} onSalvo={concluido} />}
      {promover && <DialogoPromover onFechar={() => setPromover(false)} onPromovido={concluido} />}
      {excluindo && (
        <ConfirmarDialogo
          titulo="Excluir professor?"
          rotuloConfirmar="Excluir definitivamente"
          ocupado={ocupado}
          erro={erroExcluir}
          onConfirmar={() => void excluir()}
          onFechar={() => setExcluindo(null)}
        >
          <p>
            A conta de <strong className="text-ink">{excluindo.nome}</strong> será apagada junto com{" "}
            <strong className="text-ink">todas as turmas</strong> dela: atividades, entregas dos alunos, materiais e avisos.
            Esta ação não pode ser desfeita.
          </p>
        </ConfirmarDialogo>
      )}
    </Secao>
  );
}
