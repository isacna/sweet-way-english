"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Cabecalho, Campo, classeBotao, classeCampo, erroDaApi, Mensagem } from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";

const NIVEIS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export default function NovaTurmaPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nivel, setNivel] = useState<string>("A1");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!nome.trim()) {
      setErro("Informe o nome da turma.");
      return;
    }
    setSalvando(true);
    const res = await apiFetch("/turmas", {
      method: "POST",
      body: JSON.stringify({ nome: nome.trim(), descricao: descricao.trim() || undefined, nivel }),
    }).catch(() => null);
    if (res?.status === 401 || res?.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!res?.ok) {
      setSalvando(false);
      setErro(await erroDaApi(res, "Não foi possível criar a turma."));
      return;
    }
    const data = await res.json();
    router.push(`/professor/turmas/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Cabecalho
        voltar={{ href: "/professor/turmas", rotulo: "Turmas" }}
        titulo="Nova turma"
        descricao="O código de convite é gerado automaticamente. Você passa ele para os alunos entrarem."
      />

      <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
        <Campo id="nome" rotulo="Nome da turma" obrigatorio>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
            placeholder="Ex.: Inglês A1 — Terça à noite"
            className={classeCampo}
          />
        </Campo>
        <Campo id="descricao" rotulo="Descrição" opcional>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            className={`${classeCampo} resize-y`}
          />
        </Campo>
        <Campo id="nivel" rotulo="Nível" dica="Entra no código de convite (ex.: SWA13-2026).">
          <select id="nivel" value={nivel} onChange={(e) => setNivel(e.target.value)} className={classeCampo}>
            {NIVEIS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Campo>
        {erro && <Mensagem tom="erro">{erro}</Mensagem>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link href="/professor/turmas" className={classeBotao("secundario")}>
            Cancelar
          </Link>
          <button type="submit" disabled={salvando} className={classeBotao("primario")}>
            <Plus aria-hidden className="h-4 w-4" />
            {salvando ? "Criando…" : "Criar turma"}
          </button>
        </div>
      </form>
    </div>
  );
}
