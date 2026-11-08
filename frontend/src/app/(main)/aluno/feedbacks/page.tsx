"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, MessageSquareText, Star } from "lucide-react";
import { Cabecalho, Carregando, classeBotao, erroDaApi, Mensagem, Vazio } from "@/components/painel/ui";
import { dataHoraCurta } from "@/components/turmas/status";
import type { FeedbackDoAluno } from "@/components/turmas/tipos";
import { apiFetch, apiPaths } from "@/lib/api";

export default function AlunoFeedbacksPage() {
  const router = useRouter();
  const [lista, setLista] = useState<FeedbackDoAluno[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch(apiPaths.alunoMeFeedbacks).catch(() => null);
      if (cancelled) return;
      if (res?.status === 401) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!res?.ok) {
        setErro(await erroDaApi(res, "Não foi possível carregar os feedbacks."));
        setLista([]);
        return;
      }
      const data: FeedbackDoAluno[] = await res.json();
      if (cancelled) return;
      setLista(data.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()));
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Cabecalho titulo="Meus feedbacks" descricao="Notas e comentários do professor nas suas entregas, dos mais novos aos mais antigos." />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      {lista === null ? (
        <Carregando texto="Carregando feedbacks…" />
      ) : lista.length === 0 ? (
        !erro && (
          <Vazio
            icone={<MessageSquareText />}
            titulo="Nenhum feedback ainda"
            texto="Quando o professor corrigir uma entrega com nota, o comentário aparece aqui."
            acao={
              <Link href="/aluno/turmas" className={classeBotao("secundario")}>
                Ver minhas turmas
              </Link>
            }
          />
        )
      ) : (
        <ul className="space-y-3">
          {lista.map((f) => {
            const at = f.submissao.atividade;
            return (
              <li key={f.id} className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-12 min-w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-success-soft px-2 text-success-ink"
                    aria-hidden
                  >
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-base font-bold leading-none tabular-nums">{String(f.nota).replace(".", ",")}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold leading-snug text-ink">{at.titulo}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      <span className="sr-only">Nota {f.nota}. </span>
                      {f.professor.nome} · {dataHoraCurta(f.criadoEm)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-gray-50 px-3.5 py-3 text-sm text-ink">
                  {f.comentario}
                </p>
                {at.turmaId && (
                  <Link
                    href={`/aluno/atividades/${at.id}?turmaId=${at.turmaId}`}
                    className="mt-2 -mx-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-grape hover:bg-grape-soft"
                  >
                    Ver atividade
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
