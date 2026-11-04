"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, apiPaths, getStoredUser } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";

type FeedbackItem = {
  id: number;
  comentario: string;
  nota: number;
  criadoEm: string;
  professor: { nome: string };
  submissao: { atividade: { titulo: string } };
};

export default function AlunoFeedbacksPage() {
  const router = useRouter();
  const [lista, setLista] = useState<FeedbackItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }

    let cancelled = false;

    async function load() {
      const res = await apiFetch(apiPaths.alunoMeFeedbacks);
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!res.ok) {
        setErro("Não foi possível carregar os feedbacks.");
        setCarregando(false);
        return;
      }
      const data: FeedbackItem[] = await res.json();
      if (cancelled) return;
      data.sort(
        (a, b) =>
          new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
      );
      setLista(data);
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Meus feedbacks</h1>
        <p className="text-ink-soft mt-1">
          Comentários e notas dos professores nas suas entregas.
        </p>
      </div>

      {erro && (
        <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-ink-soft">Carregando…</p>
      ) : lista.length === 0 ? (
        <div className="p-8 rounded-xl bg-white border border-gray-100 text-center">
          <p className="text-ink-soft mb-4">
            Você ainda não recebeu feedbacks.
          </p>
          <Button href="/aluno/turmas" variant="secondary" size="md">
            Ver turmas
          </Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {lista.map((f) => (
            <li
              key={f.id}
              className="card p-6"
            >
              <p className="font-semibold text-ink">
                {f.submissao.atividade.titulo}
              </p>
              <p className="text-sm text-ink-soft mt-1">
                {f.professor.nome} ·{" "}
                <span className="font-medium text-accent">
                  Nota {f.nota}
                </span>{" "}
                · {tempoRelativoPt(f.criadoEm)}
              </p>
              <p className="text-sm text-ink mt-4 whitespace-pre-wrap">
                {f.comentario}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
