"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { classeBotao } from "@/components/curso/ui";
import { classeBotaoProfessor, classeCampo, classeRotulo } from "@/components/formStyles";
import { apiUrl } from "@/lib/api";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") ?? "aluno";
  const cadastroOk = searchParams.get("cadastro") === "ok";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const res = await fetch(`${apiUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao fazer login");
        setCarregando(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

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
    <AuthShell voltarHref="/home">
      <div
        className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1 text-sm font-semibold"
        aria-label="Tipo de conta"
      >
        {(["aluno", "professor"] as const).map((t) => {
          const ativo = (tipo === "professor" ? "professor" : "aluno") === t;
          return (
            <Link
              key={t}
              href={`/login?tipo=${t}`}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-[40px] items-center justify-center rounded-xl transition-colors ${
                ativo
                  ? `bg-white shadow-sm ${t === "professor" ? "text-sky-ink" : "text-grape"}`
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {t === "professor" ? "Sou professor" : "Sou aluno"}
            </Link>
          );
        })}
      </div>

      <h1 className="text-3xl font-semibold text-ink">Entrar</h1>
      <p className="mt-1 mb-6 text-ink-soft">
        {tipo === "professor" ? "Acesse sua conta de professor" : "Acesse sua conta de aluno"}
      </p>

      {cadastroOk && (
        <p
          role="status"
          className="mb-6 rounded-2xl border border-success-bright/40 bg-success-soft px-4 py-3 text-sm font-medium text-success-ink"
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
          <label htmlFor="senha" className={classeRotulo}>
            Senha
          </label>
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
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink" role="alert">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className={`${tipo === "professor" ? classeBotaoProfessor : classeBotao("primario")} w-full`}
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      {tipo !== "professor" && (
        <p className="mt-6 text-center text-sm text-ink-soft">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="inline-flex min-h-[44px] items-center font-semibold text-grape hover:underline">
            Criar conta
          </Link>
        </p>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="bg-cotton min-h-screen" />}>
      <LoginPageContent />
    </Suspense>
  );
}
