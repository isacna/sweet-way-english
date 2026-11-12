"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthShell } from "@/components/AuthShell";
import { classeAvisoErro, classeAvisoSucesso, classeBotaoAcao, classeLinkSuave } from "@/components/formStyles";
import { apiFetch } from "@/lib/api";

type Estado = { fase: "enviando" } | { fase: "ok"; mensagem: string } | { fase: "erro"; mensagem: string };

const classeTitulo = "text-[1.9rem] font-semibold leading-tight tracking-[-0.015em] text-white";

/**
 * Link "parar de receber" dos lembretes de estudo: desliga os lembretes assim que a página abre
 * (POST /lembretes/cancelar com o token do e-mail), sem pedir login.
 */
function CancelarLembretesContent() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  const [estado, setEstado] = useState<Estado>({ fase: "enviando" });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelado = false;
    (async () => {
      const res = await apiFetch("/lembretes/cancelar", { method: "POST", body: JSON.stringify({ token }) }).catch(
        () => null,
      );
      if (cancelado) return;
      if (!res) {
        setEstado({ fase: "erro", mensagem: "Não foi possível conectar ao servidor." });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (cancelado) return;
      if (res.ok) {
        setEstado({
          fase: "ok",
          mensagem: typeof data?.message === "string" ? data.message : "Pronto! Os lembretes foram desligados.",
        });
      } else {
        setEstado({
          fase: "erro",
          mensagem: typeof data?.error === "string" ? data.error : "Não foi possível desligar os lembretes.",
        });
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [token, tentativa]);

  if (!token) {
    return (
      <>
        <h1 className={classeTitulo}>Link inválido</h1>
        <p className="mt-1.5 mb-6 text-ink-soft">
          Este endereço não tem o código do e-mail. Abra o link do lembrete de novo, ou entre na sua conta e desligue
          os lembretes no painel, em &quot;Meta de hoje&quot;.
        </p>
        <Link href="/login?tipo=aluno" className={`${classeBotaoAcao} w-full`}>
          Entrar na minha conta
        </Link>
      </>
    );
  }

  if (estado.fase === "enviando") {
    return (
      <>
        <h1 className={classeTitulo}>Lembretes de estudo</h1>
        <p role="status" className="mt-1.5 text-ink-soft">
          Desligando os lembretes…
        </p>
      </>
    );
  }

  if (estado.fase === "ok") {
    return (
      <>
        <h1 className={classeTitulo}>Lembretes desligados</h1>
        <p role="status" className={`mt-4 mb-4 ${classeAvisoSucesso}`}>
          {estado.mensagem}
        </p>
        <p className="mb-6 text-ink-soft">
          Sua conta e seu progresso continuam iguais. Se mudar de ideia, é só ligar os lembretes de novo no painel, em
          &quot;Meta de hoje&quot;.
        </p>
        <Link href="/aluno" className={`${classeBotaoAcao} w-full`}>
          Ir para o painel
        </Link>
      </>
    );
  }

  const linkRuim = /inválido|expirado/i.test(estado.mensagem);
  return (
    <>
      <h1 className={classeTitulo}>Não deu para desligar</h1>
      <p role="alert" className={`mt-4 mb-6 ${classeAvisoErro}`}>
        {estado.mensagem}
      </p>
      {linkRuim ? (
        <Link href="/aluno" className={`${classeBotaoAcao} w-full`}>
          Entrar e desligar no painel
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEstado({ fase: "enviando" });
            setTentativa((n) => n + 1);
          }}
          className={`${classeBotaoAcao} w-full`}
        >
          Tentar de novo
        </button>
      )}
      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link href="/login?tipo=aluno" className={classeLinkSuave}>
          Ir para o login
        </Link>
      </p>
    </>
  );
}

export default function CancelarLembretesPage() {
  return (
    <AuthShell link={{ href: "/login?tipo=aluno", rotulo: "Entrar" }}>
      <Suspense fallback={null}>
        <CancelarLembretesContent />
      </Suspense>
    </AuthShell>
  );
}
