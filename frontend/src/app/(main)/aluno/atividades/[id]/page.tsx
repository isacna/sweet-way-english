"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CalendarClock, FileWarning, Paperclip, Send } from "lucide-react";
import { AssetPreview } from "@/components/AssetPreview";
import {
  Cabecalho,
  Campo,
  Carregando,
  classeArquivo,
  classeBotao,
  classeCampo,
  erroDaApi,
  Mensagem,
  RegiaoAoVivo,
  Secao,
  Selo,
} from "@/components/painel/ui";
import { CaixaFeedback, ConteudoEntrega } from "@/components/turmas/CartaoEntrega";
import { dataHoraCurta, podeEnviar, prazo, situacaoAluno } from "@/components/turmas/status";
import type { AtividadeComEntregas, Entrega } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";

function mensagemBloqueio(status: string): string {
  switch (status) {
    case "pendente":
      return "Sua entrega está com o professor. Se ele pedir uma nova versão, o formulário volta a aparecer aqui.";
    case "aprovado":
      return "O professor aprovou sua entrega. Esta atividade está concluída.";
    case "corrigido":
      return "O professor corrigiu sua entrega com nota e comentário. Esta atividade está concluída.";
    default:
      return "Não é possível enviar uma nova entrega agora.";
  }
}

function ResultadoEntrega({ entrega }: { entrega: Entrega }) {
  if (entrega.feedback) {
    return (
      <CaixaFeedback
        nota={entrega.feedback.nota}
        comentario={entrega.feedback.comentario}
        autor={entrega.feedback.professor?.nome}
        data={entrega.feedback.criadoEm}
      />
    );
  }
  if (entrega.status === "pendente") return <Mensagem tom="alerta">Aguardando correção do professor.</Mensagem>;
  if (entrega.status === "aprovado") return <Mensagem tom="sucesso">Entrega aprovada pelo professor.</Mensagem>;
  if (entrega.status === "reprovado")
    return <Mensagem tom="erro">O professor pediu uma nova versão desta entrega.</Mensagem>;
  return null;
}

function AtividadeEntregaConteudo() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const atividadeId = params.id as string;
  const turmaId = searchParams.get("turmaId") ?? "";

  const [atividade, setAtividade] = useState<AtividadeComEntregas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [chaveArquivo, setChaveArquivo] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState<{ tom: "sucesso"; texto: string } | null>(null);

  const buscar = useCallback(async (): Promise<AtividadeComEntregas | null | "erro"> => {
    const res = await apiFetch(`/turmas/${turmaId}/atividades`).catch(() => null);
    if (res?.status === 401) {
      router.replace("/login?tipo=aluno");
      return null;
    }
    if (!res?.ok) {
      setErroCarga(await erroDaApi(res, "Não foi possível carregar a atividade."));
      return "erro";
    }
    const lista: AtividadeComEntregas[] = await res.json();
    return lista.find((a) => String(a.id) === String(atividadeId)) ?? null;
  }, [atividadeId, turmaId, router]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      if (!turmaId) {
        setErroCarga("Abra a atividade a partir da página da turma.");
        setCarregando(false);
        return;
      }
      const a = await buscar();
      if (cancelled) return;
      if (a === null) setErroCarga((e) => e || "Atividade não encontrada nesta turma.");
      else if (a !== "erro") setAtividade(a);
      setCarregando(false);
    });
    return () => {
      cancelled = true;
    };
  }, [buscar, turmaId]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!atividade) return;
    setErro("");
    setSucesso(null);
    const exigeArquivo = Boolean(atividade.arquivoObrigatorio);
    if (exigeArquivo && !arquivo) {
      setErro("Esta atividade exige um arquivo anexo.");
      return;
    }
    if (!conteudo.trim() && !arquivo) {
      setErro("Escreva sua resposta ou anexe um arquivo.");
      return;
    }
    setEnviando(true);
    const fd = new FormData();
    fd.append("conteudo", conteudo.trim());
    if (arquivo) fd.append("arquivo", arquivo);
    const res = await apiFetch(`/atividades/${atividade.id}/submissoes`, { method: "POST", body: fd }).catch(() => null);
    if (!res?.ok) {
      setEnviando(false);
      setErro(await erroDaApi(res, "Não foi possível enviar sua entrega."));
      return;
    }
    setConteudo("");
    setArquivo(null);
    setChaveArquivo((k) => k + 1);
    const atualizada = await buscar();
    if (atualizada && atualizada !== "erro") setAtividade(atualizada);
    setEnviando(false);
    setSucesso({ tom: "sucesso", texto: "Entrega enviada! O professor vai corrigir em breve." });
  }

  const voltar = turmaId ? { href: `/aluno/turmas/${turmaId}`, rotulo: "Voltar à turma" } : { href: "/aluno/turmas", rotulo: "Turmas" };

  if (carregando) return <Carregando texto="Carregando atividade…" className="mx-auto max-w-3xl" />;

  if (!atividade) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Mensagem tom="erro">{erroCarga || "Atividade não encontrada."}</Mensagem>
        <Link href={voltar.href} className={classeBotao("secundario")}>
          {voltar.rotulo}
        </Link>
      </div>
    );
  }

  const entregas = atividade.submissoes ?? [];
  const ultima = entregas[0];
  const liberado = podeEnviar(entregas);
  const situacao = situacaoAluno(entregas);
  const p = prazo(atividade.dataEntrega);
  const historico = [...entregas].reverse();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Cabecalho voltar={voltar} eyebrow="Atividade" titulo={atividade.titulo} />

      <section aria-label="Enunciado" className="card space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Selo tom={situacao.tom}>{situacao.rotulo}</Selo>
          <span
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              liberado && p.vencido ? "text-danger" : liberado && p.proximo ? "text-flame-ink" : "text-ink-soft"
            }`}
          >
            <CalendarClock aria-hidden className="h-4 w-4" />
            Até {p.texto} · {p.relativo}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words text-ink">{atividade.descricao}</p>
        {atividade.arquivoObrigatorio && (
          <Mensagem tom="alerta">
            <span className="inline-flex items-center gap-1.5">
              <FileWarning aria-hidden className="h-4 w-4" />
              Para entregar, é obrigatório anexar um arquivo.
            </span>
          </Mensagem>
        )}
        {(atividade.link || atividade.arquivoUrl) && (
          <div className="space-y-4 border-t border-line pt-4">
            {atividade.link && /^https?:\/\//i.test(atividade.link) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-ink">Link de apoio</p>
                <AssetPreview url={atividade.link} tipo="link" title={`Link — ${atividade.titulo}`} />
              </div>
            )}
            {atividade.arquivoUrl && (
              <div className="space-y-2">
                <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                  <Paperclip aria-hidden className="h-4 w-4 shrink-0 text-ink-faint" />
                  <span className="truncate">Material: {atividade.arquivo?.nomeOriginal ?? "anexo"}</span>
                </p>
                <AssetPreview url={atividade.arquivoUrl} arquivo={atividade.arquivo} title={`Anexo — ${atividade.titulo}`} />
              </div>
            )}
          </div>
        )}
      </section>

      <RegiaoAoVivo mensagem={sucesso} />

      {historico.length > 0 && (
        <Secao
          id="entregas"
          titulo={historico.length === 1 ? "Sua entrega" : "Suas entregas"}
          descricao="A nota e o comentário do professor aparecem junto de cada entrega."
        >
          <ol className="space-y-4">
            {historico.map((s, i) => (
              <li key={s.id} className="space-y-3 rounded-2xl border border-line p-4">
                <p className="text-sm font-semibold text-ink">
                  {historico.length > 1 ? `Entrega ${i + 1} · ` : ""}
                  <span className="font-normal text-ink-soft">enviada em {dataHoraCurta(s.dataEnvio)}</span>
                </p>
                <ConteudoEntrega entrega={s} rotuloAnexo="Seu anexo" />
                <ResultadoEntrega entrega={s} />
              </li>
            ))}
          </ol>
        </Secao>
      )}

      {liberado ? (
        <Secao
          id="enviar"
          titulo={ultima ? "Enviar nova versão" : "Sua resposta"}
          descricao={ultima ? "O professor pediu uma nova versão. Corrija e envie de novo." : undefined}
        >
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <Campo id="resposta" rotulo="Resposta" opcional={!!atividade.arquivoObrigatorio || undefined}>
              <textarea
                id="resposta"
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={6}
                placeholder="Escreva sua resposta aqui…"
                className={`${classeCampo} resize-y`}
              />
            </Campo>
            <Campo
              id="anexo-entrega"
              rotulo="Arquivo"
              obrigatorio={!!atividade.arquivoObrigatorio}
              opcional={!atividade.arquivoObrigatorio}
              dica="Foto, PDF, documento, áudio ou vídeo. Só você e o professor conseguem abrir."
            >
              <input
                key={chaveArquivo}
                id="anexo-entrega"
                type="file"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className={classeArquivo}
              />
            </Campo>
            {erro && <Mensagem tom="erro">{erro}</Mensagem>}
            <button type="submit" disabled={enviando} className={classeBotao("primario", "w-full sm:w-auto")}>
              <Send aria-hidden className="h-4 w-4" />
              {enviando ? "Enviando…" : "Enviar entrega"}
            </button>
          </form>
        </Secao>
      ) : (
        ultima && <Mensagem tom="info">{mensagemBloqueio(ultima.status)}</Mensagem>
      )}
    </div>
  );
}

export default function AlunoAtividadePage() {
  return (
    <Suspense fallback={<Carregando className="mx-auto max-w-3xl" />}>
      <AtividadeEntregaConteudo />
    </Suspense>
  );
}
