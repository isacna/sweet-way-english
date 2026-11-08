"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import {
  classeAvisoErro,
  classeAvisoSucesso,
  classeBotaoAcao,
  classeCampo,
  classeLinkSuave,
  classeRotulo,
} from "@/components/formStyles";
import { apiFetch } from "@/lib/api";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const res = await apiFetch("/auth/esqueci-senha", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(
          typeof data?.error === "string"
            ? data.error
            : "Não foi possível enviar o pedido. Tente de novo em alguns minutos."
        );
        return;
      }
      // A resposta é sempre a mesma, exista ou não a conta
      setEnviado(
        typeof data?.message === "string"
          ? data.message
          : "Se houver uma conta com esse e-mail, enviamos um link para criar uma nova senha."
      );
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthShell link={{ href: "/login?tipo=aluno", rotulo: "Entrar" }}>
      <h1 className="text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] text-white">
        Esqueci minha senha
      </h1>
      <p className="mt-1.5 mb-6 text-ink-soft">
        Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
      </p>

      {enviado ? (
        <div className="space-y-5">
          <p role="status" className={classeAvisoSucesso}>
            {enviado}
          </p>
          <p className="text-sm text-ink-soft">
            O link vale por 1 hora. Não chegou? Confira a caixa de spam ou peça de novo daqui a alguns minutos.
          </p>
          <Link href="/login?tipo=aluno" className={`${classeBotaoAcao} w-full`}>
            Voltar para o login
          </Link>
        </div>
      ) : (
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

          {erro && (
            <p className={classeAvisoErro} role="alert">
              {erro}
            </p>
          )}

          <button type="submit" disabled={carregando} className={`${classeBotaoAcao} mt-2 w-full`}>
            {carregando ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">
        Lembrou a senha?{" "}
        <Link href="/login?tipo=aluno" className={classeLinkSuave}>
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
