"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import {
  classeAvisoErro,
  classeAvisoSucesso,
  classeBotaoAcao,
  classeCampo,
  classeLinkSuave,
  classeRotulo,
} from "@/components/formStyles";
import { apiFetch, limparUsuario } from "@/lib/api";

const SENHA_MIN = 6; // mesma regra do cadastro

function RedefinirSenhaContent() {
  const token = useSearchParams().get("token")?.trim() ?? "";

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (senha.length < SENHA_MIN) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`);
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }

    setCarregando(true);
    try {
      const res = await apiFetch("/auth/redefinir-senha", {
        method: "POST",
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(typeof data?.error === "string" ? data.error : "Não foi possível alterar a senha.");
        return;
      }
      // As sessões antigas deixam de valer no servidor; o cache local sai junto
      limparUsuario();
      setOk(true);
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  if (!token) {
    return (
      <>
        <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] text-white">Link inválido</h1>
        <p className="mt-1.5 mb-6 text-ink-soft">
          Este endereço não tem o código de redefinição. Abra o link do e-mail de novo ou peça um novo.
        </p>
        <Link href="/esqueci-senha" className={`${classeBotaoAcao} w-full`}>
          Pedir um novo link
        </Link>
      </>
    );
  }

  if (ok) {
    return (
      <>
        <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] text-white">Senha alterada</h1>
        <p role="status" className={`mt-4 mb-6 ${classeAvisoSucesso}`}>
          Pronto! Sua senha foi alterada. Entre com a nova senha.
        </p>
        <Link href="/login?tipo=aluno" className={`${classeBotaoAcao} w-full`}>
          Ir para o login
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] text-white">Criar nova senha</h1>
      <p className="mt-1.5 mb-6 text-ink-soft">Escolha uma senha com pelo menos {SENHA_MIN} caracteres.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="senha" className={classeRotulo}>
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={SENHA_MIN}
            className={classeCampo}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmacao" className={classeRotulo}>
            Repita a nova senha
          </label>
          <input
            id="confirmacao"
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            required
            minLength={SENHA_MIN}
            className={classeCampo}
            autoComplete="new-password"
          />
        </div>

        {erro && (
          <p className={classeAvisoErro} role="alert">
            {erro}
            {/expirado|inválido/i.test(erro) && (
              <>
                {" "}
                <Link href="/esqueci-senha" className="underline underline-offset-4">
                  Pedir um novo link
                </Link>
              </>
            )}
          </p>
        )}

        <button type="submit" disabled={carregando} className={`${classeBotaoAcao} mt-2 w-full`}>
          {carregando ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link href="/login?tipo=aluno" className={classeLinkSuave}>
          Voltar para o login
        </Link>
      </p>
    </>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <AuthShell link={{ href: "/login?tipo=aluno", rotulo: "Entrar" }}>
      <Suspense fallback={null}>
        <RedefinirSenhaContent />
      </Suspense>
    </AuthShell>
  );
}
