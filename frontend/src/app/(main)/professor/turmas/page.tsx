"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FolderOpen, Plus, UsersRound } from "lucide-react";
import { FiltroLista } from "@/components/FiltroLista";
import { Cabecalho, Carregando, classeBotao, erroDaApi, Mensagem, Vazio } from "@/components/painel/ui";
import { CodigoConvite } from "@/components/turmas/CodigoConvite";
import type { TurmaResumo } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";

export default function TurmasPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<TurmaResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const turmasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return turmas;
    return turmas.filter(
      (t) =>
        t.nome.toLowerCase().includes(q) ||
        t.descricao?.toLowerCase().includes(q) ||
        t.codigoConvite.toLowerCase().includes(q),
    );
  }, [turmas, busca]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await apiFetch("/turmas").catch(() => null);
      if (cancelled) return;
      if (res?.status === 401 || res?.status === 403) {
        router.replace("/login?tipo=professor");
        return;
      }
      if (!res?.ok) {
        setErro(await erroDaApi(res, "Não foi possível carregar as turmas."));
        setCarregando(false);
        return;
      }
      const data: TurmaResumo[] = await res.json();
      if (cancelled) return;
      // Mais novas primeiro
      setTurmas(data.sort((a, b) => b.id - a.id));
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Cabecalho
        titulo="Minhas turmas"
        descricao="Atividades, avisos e alunos de cada turma. Passe o código de convite para os alunos entrarem."
        acoes={
          <Link href="/professor/turmas/nova" className={classeBotao("primario")}>
            <Plus aria-hidden className="h-4 w-4" />
            Nova turma
          </Link>
        }
      />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      {!carregando && turmas.length > 1 && (
        <FiltroLista
          busca={busca}
          onBuscaChange={setBusca}
          placeholderBusca="Buscar por nome, descrição ou código…"
          total={turmas.length}
          totalFiltrado={turmasFiltradas.length}
        />
      )}

      {carregando ? (
        <Carregando texto="Carregando turmas…" />
      ) : turmas.length === 0 && !erro ? (
        <Vazio
          icone={<UsersRound />}
          titulo="Nenhuma turma ainda"
          texto="Crie uma turma para publicar atividades e avisos. Um código de convite é gerado na hora."
          acao={
            <Link href="/professor/turmas/nova" className={classeBotao("primario")}>
              <Plus aria-hidden className="h-4 w-4" />
              Criar primeira turma
            </Link>
          }
        />
      ) : turmasFiltradas.length === 0 && busca ? (
        <Vazio compacto titulo={`Nenhuma turma encontrada para “${busca}”`} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {turmasFiltradas.map((t) => {
            const total = t._count?.matriculas ?? 0;
            return (
              <li key={t.id} className="card flex flex-col p-5">
                <Link
                  href={`/professor/turmas/${t.id}`}
                  className="group -m-2 flex items-start gap-2 rounded-xl p-2 hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-lg font-semibold leading-snug text-ink">{t.nome}</h2>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-soft">
                      <UsersRound aria-hidden className="h-4 w-4" />
                      {total} {total === 1 ? "aluno" : "alunos"}
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden
                    className="mt-1 h-5 w-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
                {t.descricao && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{t.descricao}</p>}
                <div className="mt-4 space-y-3 border-t border-line pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-ink-soft">Código de convite</span>
                    <CodigoConvite codigo={t.codigoConvite} compacto />
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/professor/turmas/${t.id}`} className={classeBotao("secundario", "flex-1")}>
                      Abrir turma
                    </Link>
                    <Link
                      href={`/professor/materiais?turma=${t.id}`}
                      className={classeBotao("fantasma", "px-3")}
                      aria-label={`Materiais da turma ${t.nome}`}
                    >
                      <FolderOpen aria-hidden className="h-[18px] w-[18px]" />
                      <span className="hidden sm:inline">Materiais</span>
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
