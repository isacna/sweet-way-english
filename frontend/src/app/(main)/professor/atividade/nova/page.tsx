"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Send } from "lucide-react";
import {
  Cabecalho,
  Campo,
  Carregando,
  classeArquivo,
  classeBotao,
  classeCampo,
  erroDaApi,
  Mensagem,
} from "@/components/painel/ui";
import {
  ACEITA_ANEXO,
  atividadeVazia,
  CamposAtividade,
  corpoAtividade,
  validarAtividade,
  type ValoresAtividade,
} from "@/components/turmas/CamposAtividade";
import { apiFetch } from "@/lib/api";

type Turma = { id: number; nome: string };

function NovaAtividadeConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turmaIdInicial = searchParams.get("turmaId") ?? "";

  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [turmaEscolhida, setTurmaEscolhida] = useState(turmaIdInicial);
  const [valores, setValores] = useState<ValoresAtividade>(atividadeVazia);
  const [anexo, setAnexo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const res = await apiFetch("/turmas").catch(() => null);
      if (cancelado) return;
      if (res?.status === 401 || res?.status === 403) {
        router.replace("/login?tipo=professor");
        return;
      }
      if (!res?.ok) {
        setErro(await erroDaApi(res, "Não foi possível carregar as turmas."));
        setTurmas([]);
        return;
      }
      setTurmas(await res.json());
    })();
    return () => {
      cancelado = true;
    };
  }, [router]);

  // Com uma turma só, ela já vem escolhida
  const turmaId = turmaEscolhida || (turmas?.length === 1 ? String(turmas[0].id) : "");
  const voltar = turmaIdInicial ? `/professor/turmas/${turmaIdInicial}` : "/professor";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!turmaId) {
      setErro("Escolha a turma.");
      return;
    }
    const problema = validarAtividade(valores);
    if (problema) {
      setErro(problema);
      return;
    }
    setSalvando(true);
    const res = await apiFetch(`/turmas/${turmaId}/atividades`, {
      method: "POST",
      body: corpoAtividade(valores, anexo),
    }).catch(() => null);
    if (!res?.ok) {
      setSalvando(false);
      setErro(await erroDaApi(res, "Não foi possível publicar a atividade."));
      return;
    }
    const data = await res.json();
    router.push(`/professor/turmas/${turmaId}?atividade=${data.id}`);
  }

  if (turmas === null) return <Carregando className="mx-auto max-w-2xl" />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Cabecalho
        voltar={{ href: voltar, rotulo: turmaIdInicial ? "Voltar à turma" : "Painel" }}
        titulo="Nova atividade"
        descricao="Fica visível na hora para todos os alunos da turma."
      />

      {turmas.length === 0 ? (
        <Mensagem tom="alerta">
          Crie uma turma antes de publicar atividades.{" "}
          <Link href="/professor/turmas/nova" className="underline underline-offset-2">
            Nova turma
          </Link>
        </Mensagem>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6" noValidate>
          <Campo id="turma" rotulo="Turma" obrigatorio>
            <select
              id="turma"
              required
              value={turmaId}
              onChange={(e) => setTurmaEscolhida(e.target.value)}
              className={classeCampo}
            >
              <option value="">Escolha a turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>

          <CamposAtividade valores={valores} onChange={setValores} prefixo="nova" />

          <Campo
            id="anexo"
            rotulo="Anexo"
            opcional
            dica="Só os alunos da turma conseguem abrir. PDF, Word, PowerPoint, texto, imagem, áudio ou vídeo."
          >
            <input
              id="anexo"
              type="file"
              accept={ACEITA_ANEXO}
              onChange={(e) => setAnexo(e.target.files?.[0] ?? null)}
              className={classeArquivo}
            />
          </Campo>

          {erro && <Mensagem tom="erro">{erro}</Mensagem>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link href={voltar} className={classeBotao("secundario")}>
              Cancelar
            </Link>
            <button type="submit" disabled={salvando} className={classeBotao("primario")}>
              <Send aria-hidden className="h-4 w-4" />
              {salvando ? "Publicando…" : "Publicar atividade"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NovaAtividadePage() {
  return (
    <Suspense fallback={<Carregando className="mx-auto max-w-2xl" />}>
      <NovaAtividadeConteudo />
    </Suspense>
  );
}
