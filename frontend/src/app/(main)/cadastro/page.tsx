"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import {
  classeAvisoErro,
  classeBotaoAcao,
  classeCampo,
  classeLinkSuave,
  classeRotulo,
} from "@/components/formStyles";
import { apiUrl } from "@/lib/api";

const IDADE_MAIORIDADE = 18;

/** Idade completa em anos a partir de "AAAA-MM-DD" (data local, sem fuso). */
function idadeEm(dataIso: string, hoje = new Date()): number | null {
  const m = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const dia = Number(m[3]);
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() < mes || (hoje.getMonth() === mes && hoje.getDate() < dia)) idade--;
  return idade;
}


export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelEmail, setResponsavelEmail] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const idade = dataNascimento ? idadeEm(dataNascimento) : null;
  const menor = idade !== null && idade >= 0 && idade < IDADE_MAIORIDADE;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }
    if (idade === null || idade < 0) {
      setErro("Informe uma data de nascimento válida.");
      return;
    }
    if (menor) {
      if (!responsavelNome.trim() || !responsavelEmail.trim()) {
        setErro("Informe o nome e o e-mail do responsável.");
        return;
      }
      if (responsavelEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
        setErro("O e-mail do responsável precisa ser diferente do seu.");
        return;
      }
      if (!consentimento) {
        setErro("É preciso a autorização do responsável para criar a conta.");
        return;
      }
    }

    setCarregando(true);
    try {
      const res = await fetch(`${apiUrl()}/api/auth/register/aluno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          senha,
          dataNascimento,
          ...(menor && {
            responsavelNome: responsavelNome.trim(),
            responsavelEmail: responsavelEmail.trim(),
            consentimentoResponsavel: consentimento,
          }),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(
          typeof data?.error === "string"
            ? data.error
            : res.status === 429
              ? "Muitas tentativas. Aguarde alguns minutos."
              : "Não foi possível criar a conta."
        );
        setCarregando(false);
        return;
      }
      router.push("/login?tipo=aluno&cadastro=ok");
    } catch {
      setErro("Não foi possível conectar ao servidor.");
      setCarregando(false);
    }
  }

  return (
    <AuthShell link={{ href: "/login?tipo=aluno", rotulo: "Entrar" }}>
              <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] text-white">Criar conta</h1>
              <p className="mt-1.5 mb-6 text-ink-soft">Cadastro de aluno — é grátis.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="nome" className={classeRotulo}>
                    Nome completo
                  </label>
                  <input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    autoComplete="name"
                    className={classeCampo}
                  />
                </div>

                <div>
                  <label htmlFor="email" className={classeRotulo}>
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    className={classeCampo}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="senha" className={classeRotulo}>
                      Senha
                    </label>
                    <input
                      id="senha"
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      aria-describedby="senha-dica"
                      className={classeCampo}
                    />
                    <p id="senha-dica" className="mt-1 text-xs text-ink-soft">
                      Mínimo de 6 caracteres.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="confirmacao" className={classeRotulo}>
                      Confirme a senha
                    </label>
                    <input
                      id="confirmacao"
                      type="password"
                      value={confirmacao}
                      onChange={(e) => setConfirmacao(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className={classeCampo}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="dataNascimento" className={classeRotulo}>
                    Data de nascimento
                  </label>
                  <input
                    id="dataNascimento"
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    required
                    min="1900-01-01"
                    autoComplete="bday"
                    className={classeCampo}
                  />
                </div>

                {menor && (
                  <fieldset className="space-y-4 rounded-2xl border border-[#a98bff]/30 bg-[#7448f0]/12 p-4">
                    <legend className="rounded-full bg-[#7448f0] px-3 py-1 text-xs font-semibold text-white">
                      Responsável (menores de 18 anos)
                    </legend>
                    <p className="text-sm text-ink-soft">
                      Como você tem menos de 18 anos, precisamos dos dados de um responsável (pai, mãe ou tutor legal).
                    </p>
                    <div>
                      <label htmlFor="responsavelNome" className={classeRotulo}>
                        Nome do responsável
                      </label>
                      <input
                        id="responsavelNome"
                        type="text"
                        value={responsavelNome}
                        onChange={(e) => setResponsavelNome(e.target.value)}
                        required
                        className={classeCampo}
                      />
                    </div>
                    <div>
                      <label htmlFor="responsavelEmail" className={classeRotulo}>
                        E-mail do responsável
                      </label>
                      <input
                        id="responsavelEmail"
                        type="email"
                        value={responsavelEmail}
                        onChange={(e) => setResponsavelEmail(e.target.value)}
                        required
                        className={classeCampo}
                      />
                    </div>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-white/12 bg-black/30 p-3 text-sm leading-relaxed text-white/90 transition-colors hover:border-white/25 has-[:focus-visible]:border-[#f8b285]">
                      <input
                        type="checkbox"
                        checked={consentimento}
                        onChange={(e) => setConsentimento(e.target.checked)}
                        required
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[#8a63f6]"
                      />
                      <span>
                        Sou o responsável legal por este aluno e autorizo o uso da Sweet Way English. Entendo que os
                        dados informados (nome, e-mail, data de nascimento e o progresso nos estudos) serão usados
                        apenas para oferecer o curso e acompanhar o aprendizado, sem publicidade e sem
                        compartilhamento com terceiros, conforme a LGPD (Lei 13.709/2018, art. 14). Posso pedir
                        acesso, correção ou exclusão desses dados a qualquer momento.
                      </span>
                    </label>
                  </fieldset>
                )}

                {erro && (
                  <p className={classeAvisoErro} role="alert">
                    {erro}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className={`${classeBotaoAcao} w-full`}
                >
                  {carregando ? "Criando conta..." : "Criar conta"}
                </button>
              </form>

              <p className="mt-6 text-sm text-center text-ink-soft">
                Já tem conta?{" "}
                <Link href="/login?tipo=aluno" className={classeLinkSuave}>
                  Entrar
                </Link>
              </p>
    </AuthShell>
  );
}
