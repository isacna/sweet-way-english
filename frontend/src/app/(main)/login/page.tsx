"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import {
  classeAvisoErro,
  classeAvisoSucesso,
  classeBotaoAcao,
  classeCampo,
  classeLinkSuave,
  classeRotulo,
} from "@/components/formStyles";
import { apiFetch, limparUsuario, salvarUsuario } from "@/lib/api";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") ?? "aluno";
  const cadastroOk = searchParams.get("cadastro") === "ok";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  // Quem chega ao login vai entrar de novo (ou foi mandado para cá pelo proxy.ts por estar sem sessão):
  // o usuário em cache é descartado para nenhuma tela mostrar um nome antigo.
  useEffect(() => {
    limparUsuario();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      // O backend grava a sessão num cookie httpOnly; aqui só guardamos o usuário para a interface
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao fazer login");
        setCarregando(false);
        return;
      }

      salvarUsuario(data.user);

      if (data.user.role === "professor") {
        window.location.href = "/professor";
      } 

      if(data.user.role === "aluno") {
        window.location.href = "/aluno";
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
      setCarregando(false);
    }
  }

  return (
    <AuthShell
      link={tipo === "professor" ? { href: "/home", rotulo: "Início" } : { href: "/cadastro", rotulo: "Criar conta" }}
    >
      <div
        className="mb-7 grid grid-cols-2 gap-1 rounded-[14px] bg-black/30 p-1 text-sm font-medium shadow-[inset_0_0_0_1px_rgba(214,228,255,0.1)]"
        aria-label="Tipo de conta"
      >
        {(["aluno", "professor"] as const).map((t) => {
          const ativo = (tipo === "professor" ? "professor" : "aluno") === t;
          return (
            <Link
              key={t}
              href={`/login?tipo=${t}`}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-[44px] items-center justify-center rounded-[11px] transition-colors ${
                ativo
                  ? "bg-[linear-gradient(180deg,#3d3d3f_0%,#1d1d20_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_10px_rgba(0,0,0,0.3)]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {t === "professor" ? "Sou professor" : "Sou aluno"}
            </Link>
          );
        })}
      </div>

      <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] text-white">Entrar</h1>
      <p className="mt-1.5 mb-6 text-ink-soft">
        {tipo === "professor" ? "Acesse sua conta de professor" : "Acesse sua conta de aluno"}
      </p>

      {cadastroOk && (
        <p
          role="status"
          className={`mb-6 ${classeAvisoSucesso}`}
        >
          Conta criada com sucesso! Entre com seu e-mail e senha.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            className={classeCampo}
            autoComplete="email"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="senha" className={classeRotulo}>
              Senha
            </label>
            <Link
              href="/esqueci-senha"
              className="mb-1.5 text-sm font-medium text-white/80 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
            >
              Esqueci minha senha
            </Link>
          </div>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            required
            className={classeCampo}
            autoComplete="current-password"
          />
        </div>

        {erro && (
          <p className={classeAvisoErro} role="alert">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className={`${classeBotaoAcao} mt-2 w-full`}
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {tipo !== "professor" && (
        <p className="mt-6 text-center text-sm text-ink-soft">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className={classeLinkSuave}>
            Criar conta
          </Link>
        </p>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0d12]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
