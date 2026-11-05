"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, assetUrl, getStoredUser } from "@/lib/api";
import { rotuloStatusSubmissaoPt, tempoRelativoPt } from "@/lib/timePt";
import { Download, Upload } from "lucide-react";

type FeedbackItem = {
  comentario: string;
  nota: number;
  criadoEm: string;
  professor: { nome: string };
};

type SubmissaoAluno = {
  id: number;
  conteudo: string | null;
  arquivoUrl: string | null;
  dataEnvio: string;
  status: string;
  feedback: FeedbackItem | null;
};

type Atividade = {
  id: number;
  titulo: string;
  descricao: string;
  dataEntrega: string;
  arquivoObrigatorio?: boolean;
  submissoes: SubmissaoAluno[];
};

function mensagemBloqueioEntrega(statusUltima: string): string {
  switch (statusUltima) {
    case "pendente":
      return "Sua última entrega está aguardando correção do professor. Você não pode enviar outra versão até receber aprovação ou reprovação.";
    case "aprovado":
      return "O professor aprovou sua última entrega. Esta atividade está encerrada para você — não é possível enviar novamente.";
    case "corrigido":
      return "O professor já corrigiu sua última entrega com nota e comentário. Esta atividade está encerrada — não é possível enviar novamente.";
    default:
      return "Você já possui uma entrega em andamento ou encerrada. Só é possível enviar de novo se o professor reprovar a última entrega.";
  }
}

function AtividadeEntregaContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const atividadeId = params.id as string;
  const turmaId = searchParams.get("turmaId") ?? "";

  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [conteudo, setConteudo] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }
    if (!turmaId) {
      queueMicrotask(() => {
        setCarregando(false);
        setErro(
          "Falta o parâmetro da turma. Abra a atividade a partir da turma."
        );
      });
      return;
    }

    let cancelled = false;

    async function load() {
      const res = await apiFetch(`/turmas/${turmaId}/atividades`);
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!res.ok) {
        setErro("Não foi possível carregar a atividade.");
        setCarregando(false);
        return;
      }
      const lista: Atividade[] = await res.json();
      const found = lista.find((a) => String(a.id) === String(atividadeId));
      if (!found) {
        setErro("Atividade não encontrada nesta turma.");
        setCarregando(false);
        return;
      }
      setAtividade(found);
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [atividadeId, turmaId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOkMsg("");
    if (!atividade) return;
    const ult = atividade.submissoes?.[0];
    if (ult && ult.status !== "reprovado") {
      setErro(
        "Você já enviou esta atividade. Só poderá enviar outra versão se o professor reprovar a última entrega."
      );
      return;
    }
    const exigeArquivo = Boolean(atividade.arquivoObrigatorio);
    if (exigeArquivo && !arquivo) {
      setErro("Esta atividade exige anexar um arquivo.");
      return;
    }
    if (!exigeArquivo && !conteudo.trim() && !arquivo) {
      setErro("Escreva algo na resposta ou anexe um arquivo.");
      return;
    }
    setEnviando(true);
    const fd = new FormData();
    fd.append("conteudo", conteudo.trim() || "");
    if (arquivo) fd.append("arquivo", arquivo);

    const res = await apiFetch(`/atividades/${atividade.id}/submissoes`, {
      method: "POST",
      body: fd,
    });
    setEnviando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErro(data.error ?? "Erro ao enviar.");
      return;
    }
    setOkMsg("Entrega registrada com sucesso.");
    setConteudo("");
    setArquivo(null);

    const res2 = await apiFetch(`/turmas/${turmaId}/atividades`);
    if (res2.ok) {
      const lista: Atividade[] = await res2.json();
      const found = lista.find((a) => String(a.id) === String(atividadeId));
      if (found) setAtividade(found);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-ink-soft">Carregando…</p>
      </div>
    );
  }

  if (erro && !atividade) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="text-danger-ink">{erro}</p>
        <Button href="/aluno/turmas" variant="secondary" size="md">
          Turmas
        </Button>
      </div>
    );
  }

  if (!atividade) return null;

  const submissoes = atividade.submissoes ?? [];
  /** Mais recente primeiro (API); última entrega = [0] */
  const ultima = submissoes[0];
  const podeNovaEntrega = !ultima || ultima.status === "reprovado";
  /** Do mais antigo ao mais recente, para leitura em ordem */
  const historicoCronologico = [...submissoes].reverse();
  const voltarHref = `/aluno/turmas/${turmaId}`;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href={voltarHref}
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-4"
        >
          ← Voltar à turma
        </Link>
        <h1 className="text-2xl font-bold text-ink">{atividade.titulo}</h1>
        <p className="text-sm text-ink-soft mt-2">
          Prazo: {new Date(atividade.dataEntrega).toLocaleString("pt-BR")}
          {atividade.arquivoObrigatorio && (
            <span className="block mt-1 text-sun-ink font-medium">
              É obrigatório enviar um arquivo anexo.
            </span>
          )}
        </p>
        <div className="mt-4 p-4 rounded-xl bg-card border border-line text-sm text-ink-soft whitespace-pre-wrap">
          {atividade.descricao}
        </div>
      </div>

      {submissoes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-ink">
            Suas entregas e feedbacks do professor
          </h2>
          <p className="text-sm text-ink-soft">
            Cada envio aparece abaixo. Quando o professor corrigir com nota, o
            comentário e a nota ficam registrados nesta mesma atividade.
          </p>
          <ul className="space-y-4">
            {historicoCronologico.map((s, index) => (
              <li
                key={s.id}
                className="p-5 rounded-xl bg-gray-50 border border-line space-y-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">
                    Entrega {index + 1}
                  </span>
                  <span className="text-xs text-ink-soft">
                    {new Date(s.dataEnvio).toLocaleString("pt-BR")} ·{" "}
                    {tempoRelativoPt(s.dataEnvio)} ·{" "}
                    {rotuloStatusSubmissaoPt(s.status)}
                  </span>
                </div>
                {s.conteudo ? (
                  <p className="text-sm text-ink whitespace-pre-wrap">
                    {s.conteudo}
                  </p>
                ) : (
                  <p className="text-sm text-ink-soft italic">
                    (sem texto na entrega)
                  </p>
                )}
                {s.arquivoUrl && (
                  <a
                    href={assetUrl(s.arquivoUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-grape font-medium hover:underline"
                  >
                    <Download aria-hidden className="h-[16px] w-[16px] shrink-0" />
                    Baixar anexo desta entrega
                  </a>
                )}
                {s.feedback ? (
                  <div className="text-sm bg-card border border-success/25 rounded-lg p-4">
                    <p className="font-medium text-success-ink">
                      Nota: {s.feedback.nota}
                    </p>
                    <p className="text-success-ink/90 mt-2 whitespace-pre-wrap">
                      {s.feedback.comentario}
                    </p>
                    <p className="text-xs text-ink-soft mt-3">
                      {s.feedback.professor.nome}
                      {s.feedback.criadoEm
                        ? ` · ${new Date(s.feedback.criadoEm).toLocaleString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                ) : s.status === "pendente" ? (
                  <p className="text-sm text-sun-ink bg-sun-soft border border-sun/30 rounded-lg px-3 py-2">
                    Aguardando correção do professor.
                  </p>
                ) : s.status === "aprovado" ? (
                  <p className="text-sm text-success-ink bg-success-soft border border-success/25 rounded-lg px-3 py-2">
                    Entrega aprovada pelo professor.
                  </p>
                ) : s.status === "reprovado" ? (
                  <p className="text-sm text-danger-ink bg-danger-soft border border-danger/25 rounded-lg px-3 py-2">
                    Entrega reprovada pelo professor.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {podeNovaEntrega ? (
        <form
          onSubmit={handleSubmit}
          className="card p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-ink">
            {ultima ? "Nova entrega" : "Sua resposta"}
          </h2>
          {ultima?.status === "reprovado" && (
            <p className="text-sm text-success-ink bg-success-soft border border-success/25 rounded-lg px-3 py-2">
              O professor reprovou sua última entrega. Envie uma nova versão
              desta atividade abaixo.
            </p>
          )}
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={6}
            placeholder="Escreva sua resposta aqui…"
            className="w-full px-4 py-3 rounded-xl border border-line-strong bg-gray-50 text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-grape/30 focus:border-grape"
          />
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Anexo{" "}
              {atividade.arquivoObrigatorio ? "(obrigatório)" : "(opcional)"}
            </label>
            <input
              type="file"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-ink-soft"
            />
          </div>
          {erro && (
            <p className="text-sm text-danger-ink bg-danger-soft px-3 py-2 rounded-2xl font-medium">
              {erro}
            </p>
          )}
          {okMsg && (
            <p className="text-sm text-success-ink bg-success-soft px-3 py-2 rounded-lg">
              {okMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-xl bg-grape text-white font-semibold px-6 py-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-grape-strong disabled:opacity-70"
          >
            <Upload aria-hidden className="h-[18px] w-[18px] shrink-0" />
            {enviando ? "Enviando…" : "Enviar entrega"}
          </button>
        </form>
      ) : (
        <section className="card p-6">
          <h2 className="text-lg font-bold text-ink mb-2">
            Nova entrega indisponível
          </h2>
          <p className="text-sm text-ink-soft">
            {ultima
              ? mensagemBloqueioEntrega(ultima.status)
              : "Não é possível enviar neste momento."}
          </p>
        </section>
      )}
    </div>
  );
}

export default function AlunoAtividadePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto p-8 text-ink-soft">Carregando…</div>
      }
    >
      <AtividadeEntregaContent />
    </Suspense>
  );
}
