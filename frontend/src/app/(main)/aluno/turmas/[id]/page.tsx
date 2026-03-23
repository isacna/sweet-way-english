"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, assetUrl, getStoredUser } from "@/lib/api";

type TurmaDetalhe = {
  id: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  professor: { nome: string };
};

type Material = {
  id: number;
  titulo: string;
  tipo: string;
  urlArquivo: string;
};

type Atividade = {
  id: number;
  titulo: string;
  descricao: string;
  dataEntrega: string;
  arquivoObrigatorio?: boolean;
  submissoes: { id: number; status: string; dataEnvio: string }[];
};

function statusAluno(a: Atividade): string {
  const s = a.submissoes?.[0];
  if (!s) return "A entregar";
  if (s.status === "corrigido") return "Corrigida";
  if (s.status === "aprovado") return "Aprovada";
  if (s.status === "reprovado") return "Reprovada";
  return "Enviada · aguardando correção";
}

export default function AlunoTurmaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
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
      const resT = await apiFetch(`/turmas/${id}`);
      if (cancelled) return;
      if (resT.status === 401 || resT.status === 403) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!resT.ok) {
        setErro("Turma não encontrada ou você não está matriculado.");
        setTurma(null);
        setCarregando(false);
        return;
      }
      const t: TurmaDetalhe = await resT.json();

      const [resA, resM] = await Promise.all([
        apiFetch(`/turmas/${id}/atividades`),
        apiFetch(`/turmas/${id}/materiais`),
      ]);
      if (cancelled) return;

      const ats: Atividade[] = resA.ok ? await resA.json() : [];
      const mats: Material[] = resM.ok ? await resM.json() : [];

      setTurma(t);
      setAtividades(ats);
      setMateriais(mats);
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (carregando) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-[#4A4A4A]">Carregando…</p>
      </div>
    );
  }

  if (erro || !turma) {
    return (
      <div className="max-w-6xl mx-auto space-y-4">
        <p className="text-red-600">{erro || "Turma não encontrada."}</p>
        <Button href="/aluno/turmas" variant="secondary" size="md">
          Voltar às turmas
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <Link
          href="/aluno/turmas"
          className="inline-flex items-center gap-2 text-sm text-[#4A4A4A] hover:text-[#1A1A1A] mb-4"
        >
          ← Minhas turmas
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">{turma.nome}</h1>
        <p className="text-[#4A4A4A] mt-1">
          Professor {turma.professor.nome}
        </p>
        {turma.descricao && (
          <p className="text-sm text-[#4A4A4A] mt-3 max-w-2xl">{turma.descricao}</p>
        )}
      </div>

      <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Materiais</h2>
        {materiais.length === 0 ? (
          <p className="text-sm text-[#4A4A4A]">Nenhum material publicado.</p>
        ) : (
          <ul className="space-y-2">
            {materiais.map((m) => {
              const href = assetUrl(m.urlArquivo);
              return (
                <li key={m.id}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[#8A4FF7] hover:text-[#7742e0] flex items-center gap-2"
                    >
                      <Image
                        src="/icons/file-document.svg"
                        alt=""
                        width={16}
                        height={16}
                      />
                      {m.titulo}{" "}
                      <span className="text-[#4A4A4A] font-normal">
                        ({m.tipo})
                      </span>
                    </a>
                  ) : (
                    <span className="text-sm text-[#1A1A1A]">{m.titulo}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Atividades</h2>
        {atividades.length === 0 ? (
          <p className="text-sm text-[#4A4A4A]">
            Nenhuma atividade nesta turma.
          </p>
        ) : (
          <ul className="space-y-3">
            {atividades.map((a) => (
              <li
                key={a.id}
                className="p-4 rounded-lg border border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[#1A1A1A]">{a.titulo}</p>
                  <p className="text-xs text-[#4A4A4A] mt-1 line-clamp-2">
                    {a.descricao}
                  </p>
                  <p className="text-xs text-[#4A4A4A] mt-2">
                    Entrega:{" "}
                    {new Date(a.dataEntrega).toLocaleString("pt-BR")}
                  </p>
                  {a.arquivoObrigatorio && (
                    <p className="text-xs text-amber-800 mt-1 font-medium">
                      Arquivo obrigatório na entrega
                    </p>
                  )}
                  <p className="text-xs font-medium text-[#8A4FF7] mt-1">
                    {statusAluno(a)}
                  </p>
                </div>
                <Button
                  href={`/aluno/atividades/${a.id}?turmaId=${turma.id}`}
                  variant="secondary"
                  size="md"
                  className="shrink-0"
                >
                  {a.submissoes?.length ? "Ver / nova entrega" : "Entregar"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
