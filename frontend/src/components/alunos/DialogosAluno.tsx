"use client";

import { useState } from "react";
import { AcoesDialogo, Dialogo } from "@/components/painel/Dialogo";
import { CaixaMarcar, Campo, classeBotao, classeCampo, erroDaApi, Mensagem } from "@/components/painel/ui";
import { apiFetch, apiPaths } from "@/lib/api";

export type TurmaOpcao = { id: number; nome: string };

export type AlunoLista = {
  id: number;
  nome: string;
  email: string;
  criadoEm: string;
  turmas: TurmaOpcao[];
};

const SENHA_MIN = 6;

/** Idade em anos completos a partir de "AAAA-MM-DD" (null se a data for inválida). */
export function idadeEmAnos(data: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) return null;
  const hoje = new Date();
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade -= 1;
  return idade;
}

function hojeIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Cadastro de aluno já matriculado numa turma. Menor de 18: responsável + consentimento (LGPD). */
export function DialogoNovoAluno({
  turmas,
  onFechar,
  onCriado,
}: {
  turmas: TurmaOpcao[];
  onFechar: () => void;
  onCriado: (nome: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [turmaId, setTurmaId] = useState(turmas[0] ? String(turmas[0].id) : "");
  const [nascimento, setNascimento] = useState("");
  const [respNome, setRespNome] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const idade = nascimento ? idadeEmAnos(nascimento) : null;
  const menor = idade !== null && idade >= 0 && idade < 18;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome.trim() || !email.trim()) return setErro("Informe o nome e o e-mail do aluno.");
    if (!turmaId) return setErro("Escolha a turma.");
    if (nascimento && (idade === null || idade < 0 || idade > 120)) return setErro("Data de nascimento inválida.");
    if (menor) {
      if (!respNome.trim() || !respEmail.trim())
        return setErro("Aluno menor de 18 anos: informe o nome e o e-mail do responsável.");
      if (!consentimento) return setErro("Confirme o consentimento do responsável.");
    }
    if (senha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
    if (senha !== confirmar) return setErro("As senhas não coincidem.");

    setSalvando(true);
    const res = await apiFetch(apiPaths.professorAlunos, {
      method: "POST",
      body: JSON.stringify({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        turmaId: Number(turmaId),
        ...(nascimento ? { dataNascimento: nascimento } : {}),
        ...(menor
          ? { responsavelNome: respNome.trim(), responsavelEmail: respEmail.trim(), consentimentoResponsavel: true }
          : {}),
      }),
    }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível cadastrar o aluno."));
      return;
    }
    onCriado(nome.trim());
  }

  return (
    <Dialogo titulo="Novo aluno" descricao="O aluno entra já matriculado na turma escolhida." onFechar={onFechar} bloquearFechar={salvando}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo id="novo-nome" rotulo="Nome completo" obrigatorio>
          <input id="novo-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="off" className={classeCampo} />
        </Campo>
        <Campo id="novo-email" rotulo="E-mail" obrigatorio dica="É o login do aluno.">
          <input
            id="novo-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={classeCampo}
          />
        </Campo>
        <Campo id="novo-turma" rotulo="Turma" obrigatorio>
          <select id="novo-turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required className={classeCampo}>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="novo-nascimento" rotulo="Data de nascimento" opcional dica="Para menores de 18 anos pedimos os dados do responsável.">
          <input
            id="novo-nascimento"
            type="date"
            value={nascimento}
            max={hojeIso()}
            onChange={(e) => setNascimento(e.target.value)}
            className={classeCampo}
          />
        </Campo>
        {menor && (
          <fieldset className="space-y-4 rounded-2xl border border-sun/40 bg-sun-soft p-4">
            <legend className="sr-only">Responsável pelo aluno</legend>
            <p className="text-sm font-medium text-sun-ink">
              Aluno com {idade} anos: os dados do responsável e o consentimento dele são obrigatórios (LGPD, art. 14).
            </p>
            <Campo id="novo-resp-nome" rotulo="Nome do responsável" obrigatorio>
              <input id="novo-resp-nome" value={respNome} onChange={(e) => setRespNome(e.target.value)} required className={classeCampo} />
            </Campo>
            <Campo id="novo-resp-email" rotulo="E-mail do responsável" obrigatorio>
              <input
                id="novo-resp-email"
                type="email"
                inputMode="email"
                value={respEmail}
                onChange={(e) => setRespEmail(e.target.value)}
                required
                className={classeCampo}
              />
            </Campo>
            <CaixaMarcar id="novo-consentimento" checked={consentimento} onChange={setConsentimento} required>
              Confirmo que o responsável autorizou o cadastro e o uso da plataforma por este aluno.
            </CaixaMarcar>
          </fieldset>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="novo-senha" rotulo="Senha inicial" obrigatorio dica={`Mínimo de ${SENHA_MIN} caracteres.`}>
            <input
              id="novo-senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={SENHA_MIN}
              className={classeCampo}
            />
          </Campo>
          <Campo id="novo-confirmar" rotulo="Confirmar senha" obrigatorio>
            <input
              id="novo-confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              className={classeCampo}
            />
          </Campo>
        </div>
        {erro && <Mensagem tom="erro">{erro}</Mensagem>}
        <AcoesDialogo>
          <button type="button" onClick={onFechar} disabled={salvando} className={classeBotao("secundario")}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className={classeBotao("primario")}>
            {salvando ? "Cadastrando…" : "Cadastrar aluno"}
          </button>
        </AcoesDialogo>
      </form>
    </Dialogo>
  );
}

/** Edição de nome, e-mail e (opcional) senha. Senha nova derruba as sessões abertas do aluno. */
export function DialogoEditarAluno({
  aluno,
  onFechar,
  onSalvo,
}: {
  aluno: AlunoLista;
  onFechar: () => void;
  onSalvo: (nome: string) => void;
}) {
  const [nome, setNome] = useState(aluno.nome);
  const [email, setEmail] = useState(aluno.email);
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome.trim() || !email.trim()) return setErro("Nome e e-mail não podem ficar vazios.");
    if (senha) {
      if (senha.length < SENHA_MIN) return setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      if (senha !== confirmar) return setErro("As senhas não coincidem.");
    }
    const corpo: Record<string, string> = {};
    if (nome.trim() !== aluno.nome) corpo.nome = nome.trim();
    if (email.trim().toLowerCase() !== aluno.email.toLowerCase()) corpo.email = email.trim();
    if (senha) corpo.senha = senha;
    if (Object.keys(corpo).length === 0) {
      onFechar();
      return;
    }
    setSalvando(true);
    const res = await apiFetch(apiPaths.professorAluno(aluno.id), { method: "PATCH", body: JSON.stringify(corpo) }).catch(
      () => null,
    );
    setSalvando(false);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível salvar."));
      return;
    }
    onSalvo(nome.trim());
  }

  return (
    <Dialogo
      titulo="Editar aluno"
      descricao={`Turmas: ${aluno.turmas.map((t) => t.nome).join(", ") || "—"}`}
      onFechar={onFechar}
      bloquearFechar={salvando}
    >
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo id="edit-nome" rotulo="Nome">
          <input id="edit-nome" value={nome} onChange={(e) => setNome(e.target.value)} required className={classeCampo} />
        </Campo>
        <Campo id="edit-email" rotulo="E-mail">
          <input
            id="edit-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={classeCampo}
          />
        </Campo>
        <Campo id="edit-senha" rotulo="Nova senha" opcional dica="Deixe em branco para manter. Se trocar, o aluno precisa entrar de novo.">
          <input
            id="edit-senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={classeCampo}
          />
        </Campo>
        {senha && (
          <Campo id="edit-confirmar" rotulo="Confirmar nova senha">
            <input
              id="edit-confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={classeCampo}
            />
          </Campo>
        )}
        {erro && <Mensagem tom="erro">{erro}</Mensagem>}
        <AcoesDialogo>
          <button type="button" onClick={onFechar} disabled={salvando} className={classeBotao("secundario")}>
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className={classeBotao("primario")}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </AcoesDialogo>
      </form>
    </Dialogo>
  );
}
