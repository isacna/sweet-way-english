"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Cabecalho, Campo, Carregando, classeBotao, classeCampo, erroDaApi, Mensagem, Vazio } from "@/components/painel/ui";
import { FiltrosMateriais, ItemMaterial } from "@/components/turmas/Materiais";
import type { Material } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";

type Turma = { id: number; nome: string };

function MateriaisAlunoConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turmaQuery = searchParams.get("turma");

  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [turmaManual, setTurmaManual] = useState("");
  const [materiais, setMateriais] = useState<Material[] | null>(null);
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch("/turmas").catch(() => null);
      if (cancelled) return;
      if (res?.status === 401) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!res?.ok) {
        setErro(await erroDaApi(res, "Não foi possível carregar suas turmas."));
        setTurmas([]);
        return;
      }
      setTurmas(await res.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const turmaId = useMemo(() => {
    if (!turmas) return "";
    if (turmaManual) return turmaManual;
    if (turmaQuery && turmas.some((t) => String(t.id) === turmaQuery)) return turmaQuery;
    return turmas[0] ? String(turmas[0].id) : "";
  }, [turmaQuery, turmas, turmaManual]);

  const carregarMateriais = useCallback(async (id: string) => {
    setMateriais(null);
    const res = await apiFetch(`/turmas/${id}/materiais`).catch(() => null);
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível carregar os materiais."));
      setMateriais([]);
      return;
    }
    const lista: Material[] = await res.json();
    setMateriais(lista.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()));
    // Link "#material-<id>" vindo da página da turma: rola até o item depois de renderizar
    const alvo = window.location.hash;
    if (alvo.startsWith("#material-")) {
      requestAnimationFrame(() => document.querySelector(alvo)?.scrollIntoView({ block: "start" }));
    }
  }, []);

  useEffect(() => {
    if (!turmaId) return;
    queueMicrotask(() => void carregarMateriais(turmaId));
  }, [turmaId, carregarMateriais]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (materiais ?? []).filter((m) => (!tipo || m.tipo === tipo) && (!q || m.titulo.toLowerCase().includes(q)));
  }, [materiais, tipo, busca]);

  if (turmas === null) return <Carregando className="mx-auto max-w-4xl" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Cabecalho titulo="Materiais" descricao="Arquivos e links que o professor compartilhou com a turma." />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      {turmas.length === 0 ? (
        !erro && (
          <Vazio
            icone={<FolderOpen />}
            titulo="Você ainda não está numa turma"
            texto="Entre na turma do seu professor para ver os materiais."
            acao={
              <Link href="/aluno/turmas" className={classeBotao("primario")}>
                Entrar em uma turma
              </Link>
            }
          />
        )
      ) : (
        <>
          {turmas.length > 1 && (
            <div className="card p-4">
              <Campo id="turma-materiais" rotulo="Turma">
                <select
                  id="turma-materiais"
                  value={turmaId}
                  onChange={(e) => setTurmaManual(e.target.value)}
                  className={`${classeCampo} sm:max-w-sm`}
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          )}

          {materiais && materiais.length > 0 && (
            <FiltrosMateriais busca={busca} onBusca={setBusca} tipo={tipo} onTipo={setTipo} idBusca="busca-materiais" />
          )}

          {materiais === null ? (
            <Carregando texto="Carregando materiais…" />
          ) : materiais.length === 0 ? (
            <Vazio
              icone={<FolderOpen />}
              titulo="Nenhum material ainda"
              texto="Quando o professor compartilhar arquivos ou links, eles aparecem aqui."
            />
          ) : filtrados.length === 0 ? (
            <Vazio compacto titulo="Nenhum material com esse filtro" />
          ) : (
            <ul className="space-y-3">
              {filtrados.map((m) => (
                <ItemMaterial key={m.id} material={m} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function AlunoMateriaisPage() {
  return (
    <Suspense fallback={<Carregando className="mx-auto max-w-4xl" />}>
      <MateriaisAlunoConteudo />
    </Suspense>
  );
}
