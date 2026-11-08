"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";
import type { ProgressoTurma } from "@/components/conteudo/tipos";

type Turma = { id: number; nome: string };
type Ordenacao = "nome" | "estudo";

/** `?turmaId=sem-turma`: alunos que se cadastraram sozinhos e ainda não têm matrícula. */
const SEM_TURMA = "sem-turma";

type AlunoProgresso = ProgressoTurma["alunos"][number];
type CelulaModulo = AlunoProgresso["modulos"][number];

function CelulaProgresso({ celula, totalLicoes }: { celula: CelulaModulo | undefined; totalLicoes: number }) {
  const feitas = celula?.licoesConcluidas ?? 0;
  const completo = totalLicoes > 0 && feitas >= totalLicoes;
  const pct = totalLicoes > 0 ? Math.min(100, Math.round((feitas / totalLicoes) * 100)) : 0;
  return (
    <div className="space-y-1 min-w-28">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={completo ? "font-semibold text-success-ink" : "text-ink"}>
          {feitas}/{totalLicoes} lições
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden>
        <div className={`h-full ${completo ? "bg-success-bright" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs">
        {celula?.testeAprovado ? (
          <span className="font-medium text-success-ink">
            Teste ✓ {celula.melhorPercentualTeste ?? 0}%
          </span>
        ) : celula && celula.tentativasTeste > 0 ? (
          <span className="text-danger-ink">
            Teste ✗ {celula.melhorPercentualTeste ?? 0}% ({celula.tentativasTeste}{" "}
            {celula.tentativasTeste === 1 ? "tentativa" : "tentativas"})
          </span>
        ) : (
          <span className="text-ink-soft">Teste —</span>
        )}
      </p>
    </div>
  );
}

export default function ProfessorProgressoPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("");
  const [dados, setDados] = useState<ProgressoTurma | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");

  const carregarTurmas = useCallback(async () => {
    const res = await apiFetch("/turmas").catch(() => null);
    if (res?.ok) setTurmas((await res.json()) as Turma[]);
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    const qs = turmaId ? `?turmaId=${encodeURIComponent(turmaId)}` : "";
    const res = await apiFetch(`/professor/progresso${qs}`).catch(() => null);
    if (!res) {
      setErro("Sem conexão com o servidor.");
      setCarregando(false);
      return;
    }
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível carregar o progresso.");
      setCarregando(false);
      return;
    }
    setDados((await res.json()) as ProgressoTurma);
    setCarregando(false);
  }, [turmaId, router]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregarTurmas();
    });
  }, [carregarTurmas]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregar();
    });
  }, [carregar]);

  const alunos = useMemo(() => {
    const lista = [...(dados?.alunos ?? [])];
    if (ordenacao === "nome") {
      lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    } else {
      // Mais recente primeiro; quem nunca estudou vai para o fim
      const t = (a: AlunoProgresso) => (a.ultimoEstudoEm ? new Date(a.ultimoEstudoEm).getTime() : -Infinity);
      lista.sort((a, b) => t(b) - t(a) || a.nome.localeCompare(b.nome, "pt-BR"));
    }
    return lista;
  }, [dados, ordenacao]);

  const modulos = useMemo(() => [...(dados?.modulos ?? [])].sort((a, b) => a.ordem - b.ordem), [dados]);

  const thBotao = (campo: Ordenacao, rotulo: string) => (
    <button
      type="button"
      onClick={() => setOrdenacao(campo)}
      className={`inline-flex items-center gap-1 font-semibold ${ordenacao === campo ? "text-accent" : "text-ink hover:text-accent"}`}
      aria-pressed={ordenacao === campo}
    >
      {rotulo}
      {ordenacao === campo && <span aria-hidden>↓</span>}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <Link
          href="/professor"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-2"
        >
          ← Voltar ao painel
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Progresso no curso</h1>
        <p className="text-ink-soft mt-1">
          Lições concluídas e testes de cada módulo publicado, por aluno das suas turmas ou sem turma.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label htmlFor="filtro-turma" className="block text-sm font-medium text-ink mb-1.5">
            Turma
          </label>
          <select
            id="filtro-turma"
            value={turmaId}
            onChange={(e) => setTurmaId(e.target.value)}
            className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          >
            <option value="">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
            <option value={SEM_TURMA}>Alunos sem turma</option>
          </select>
        </div>
        <div>
          <label htmlFor="ordenacao" className="block text-sm font-medium text-ink mb-1.5">
            Ordenar por
          </label>
          <select
            id="ordenacao"
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            className="w-full sm:w-56 px-4 py-2.5 rounded-xl border border-line-strong bg-card text-ink focus:outline-none focus:ring-4 focus:ring-accent/15 focus:border-accent"
          >
            <option value="nome">Nome</option>
            <option value="estudo">Último estudo (recente primeiro)</option>
          </select>
        </div>
      </div>

      {erro && <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">{erro}</p>}

      <div className="card overflow-hidden">
        {carregando ? (
          <p className="p-8 text-ink-soft">Carregando progresso…</p>
        ) : !dados || alunos.length === 0 ? (
          <p className="p-8 text-center text-ink-soft">
            {turmaId === SEM_TURMA
              ? "Nenhum aluno sem turma."
              : turmaId
                ? "Nenhum aluno nesta turma."
                : "Nenhum aluno nas suas turmas ainda."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-line">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 min-w-44">{thBotao("nome", "Aluno")}</th>
                  {modulos.map((m) => (
                    <th key={m.id} className="px-4 py-3 font-semibold text-ink min-w-36 align-bottom">
                      <span className="block text-xs font-normal text-ink-soft">Módulo {m.ordem}</span>
                      <span className="block max-w-40 truncate" title={m.titulo}>
                        {m.titulo}
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-ink whitespace-nowrap">XP</th>
                  <th className="px-4 py-3 font-semibold text-ink whitespace-nowrap">Ofensiva</th>
                  <th className="px-4 py-3 whitespace-nowrap">{thBotao("estudo", "Último estudo")}</th>
                  <th className="px-4 py-3 font-semibold text-ink whitespace-nowrap">Revisões pendentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {alunos.map((a) => {
                  const porModulo = new Map(a.modulos.map((c) => [c.moduloId, c]));
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/80">
                      <td className="sticky left-0 z-10 bg-card px-4 py-3 align-top">
                        <p className="font-medium text-ink">{a.nome}</p>
                        <p className="text-xs text-ink-soft">
                          {a.turmas.length ? a.turmas.map((t) => t.nome).join(", ") : "Sem turma"}
                        </p>
                      </td>
                      {modulos.map((m) => (
                        <td key={m.id} className="px-4 py-3 align-top">
                          <CelulaProgresso celula={porModulo.get(m.id)} totalLicoes={m.totalLicoes} />
                        </td>
                      ))}
                      <td className="px-4 py-3 align-top font-medium text-ink">{a.xp}</td>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {a.ofensivaAtual} {a.ofensivaAtual === 1 ? "dia" : "dias"}
                      </td>
                      <td className="px-4 py-3 align-top whitespace-nowrap text-ink-soft">
                        {a.ultimoEstudoEm ? tempoRelativoPt(a.ultimoEstudoEm) : "Nunca"}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {a.revisoesPendentes > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-sun-soft text-sun-ink text-xs font-medium">
                            {a.revisoesPendentes}
                          </span>
                        ) : (
                          <span className="text-ink-soft">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {dados && modulos.length === 0 && !carregando && (
        <p className="text-sm text-ink-soft">
          Nenhum módulo publicado ainda. Publique o conteúdo em{" "}
          <Link href="/professor/conteudo" className="font-medium text-accent hover:text-accent-strong">
            Conteúdo
          </Link>
          .
        </p>
      )}
    </div>
  );
}
