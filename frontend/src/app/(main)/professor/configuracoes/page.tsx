"use client";

import { useSyncExternalStore } from "react";
import { SecaoConta } from "@/components/configuracoes/SecaoConta";
import { SecaoLogo } from "@/components/configuracoes/SecaoLogo";
import { SecaoProfessores } from "@/components/configuracoes/SecaoProfessores";
import { Cabecalho } from "@/components/painel/ui";
import { getStoredUser } from "@/lib/api";

export default function ConfiguracoesPage() {
  // No servidor não há localStorage: renderiza como não-admin e corrige na hidratação.
  // (Só esconde as seções; quem decide é o backend, que exige admin nas rotas.)
  const admin = useSyncExternalStore(
    () => () => {},
    () => getStoredUser()?.admin === true,
    () => false,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Cabecalho
        titulo="Configurações"
        descricao={admin ? "Sua conta, o logo da escola e os professores da plataforma." : "Seus dados de acesso."}
      />
      <SecaoConta />
      {admin && <SecaoLogo />}
      {admin && <SecaoProfessores />}
    </div>
  );
}
