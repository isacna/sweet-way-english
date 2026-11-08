"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { ConfirmarDialogo } from "@/components/painel/Dialogo";
import {
  Cabecalho,
  Campo,
  Carregando,
  classeBotao,
  classeCampo,
  erroDaApi,
  Mensagem,
  RegiaoAoVivo,
  Vazio,
} from "@/components/painel/ui";
import { DialogoNovoMaterial } from "@/components/turmas/DialogoNovoMaterial";
import { FiltrosMateriais, ItemMaterial } from "@/components/turmas/Materiais";
import type { Material } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";

type Turma = { id: number; nome: string };

function MateriaisConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turmaQuery = searchParams.get("turma");

  const [turmas, setTurmas] = useState<Turma[] | null>(null);
  const [turmaManual, setTurmaManual] = useState("");
  const [materiais, setMateriais] = useState<Material[] | null>(null);
  const [tipo, setTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState<{ tom: "sucesso"; texto: string } | null>(null);
  const [novo, setNovo] = useState(false);
  const [excluindo, setExcluindo] = useState<Material | null>(null);
  const [ocupadoExcluir, setOcupadoExcluir] = useState(false);
  const [erroExcluir, setErroExcluir] = useState("");

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

  const turmaId = useMemo(() => {
    if (!turmas) return "";
    if (turmaManual) return turmaManual;
    if (turmaQuery && turmas.some((t) => String(t.id) === turmaQuery)) return turmaQuery;
    return turmas[0] ? String(turmas[0].id) : "";
  }, [turmaQuery, turmas, turmaManual]);
  const turmaNome = turmas?.find((t) => String(t.id) === turmaId)?.nome ?? "";

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
  }, []);

  useEffect(() => {
    if (!turmaId) return;
    queueMicrotask(() => void carregarMateriais(turmaId));
  }, [turmaId, carregarMateriais]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (materiais ?? []).filter((m) => (!tipo || m.tipo === tipo) && (!q || m.titulo.toLowerCase().includes(q)));
  }, [materiais, tipo, busca]);

  async function excluir() {
    if (!excluindo) return;
    setErroExcluir("");
    setOcupadoExcluir(true);
    const res = await apiFetch(`/turmas/${turmaId}/materiais/${excluindo.id}`, { method: "DELETE" }).catch(() => null);
    setOcupadoExcluir(false);
    if (!res?.ok) {
      setErroExcluir(await erroDaApi(res, "Não foi possível excluir o material."));
      return;
    }
    setAviso({ tom: "sucesso", texto: `"${excluindo.titulo}" foi excluído.` });
    setExcluindo(null);
    void carregarMateriais(turmaId);
  }

  if (turmas === null) return <Carregando className="mx-auto max-w-4xl" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Cabecalho
        titulo="Materiais de apoio"
        descricao="Arquivos e links que os alunos da turma podem abrir a qualquer momento."
        acoes={
          turmaId ? (
            <button type="button" onClick={() => setNovo(true)} className={classeBotao("primario")}>
              <Plus aria-hidden className="h-4 w-4" />
              Adicionar material
            </button>
          ) : undefined
        }
      />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}

      {turmas.length === 0 ? (
        !erro && (
          <Vazio
            icone={<FolderOpen />}
            titulo="Nenhuma turma ainda"
            texto="Os materiais ficam dentro de uma turma."
            acao={
              <Link href="/professor/turmas/nova" className={classeBotao("primario")}>
                Criar turma
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
                  onChange={(e) => {
                    setTurmaManual(e.target.value);
                    router.replace(`/professor/materiais?turma=${e.target.value}`, { scroll: false });
                  }}
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

          <RegiaoAoVivo mensagem={aviso} />

          {materiais && materiais.length > 0 && (
            <FiltrosMateriais busca={busca} onBusca={setBusca} tipo={tipo} onTipo={setTipo} idBusca="busca-materiais" />
          )}

          {materiais === null ? (
            <Carregando texto="Carregando materiais…" />
          ) : materiais.length === 0 ? (
            <Vazio
              icone={<FolderOpen />}
              titulo="Nenhum material nesta turma"
              texto="Envie PDFs, áudios, vídeos ou links para os alunos estudarem."
              acao={
                <button type="button" onClick={() => setNovo(true)} className={classeBotao("primario")}>
                  <Plus aria-hidden className="h-4 w-4" />
                  Adicionar material
                </button>
              }
            />
          ) : filtrados.length === 0 ? (
            <Vazio compacto titulo="Nenhum material com esse filtro" />
          ) : (
            <ul className="space-y-3">
              {filtrados.map((m) => (
                <ItemMaterial
                  key={m.id}
                  material={m}
                  onExcluir={() => {
                    setErroExcluir("");
                    setExcluindo(m);
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {novo && turmaId && (
        <DialogoNovoMaterial
          turmaId={turmaId}
          turmaNome={turmaNome}
          onFechar={() => setNovo(false)}
          onCriado={(titulo) => {
            setNovo(false);
            setAviso({ tom: "sucesso", texto: `"${titulo}" foi adicionado à turma.` });
            void carregarMateriais(turmaId);
          }}
        />
      )}

      {excluindo && (
        <ConfirmarDialogo
          titulo="Excluir material?"
          rotuloConfirmar="Excluir material"
          ocupado={ocupadoExcluir}
          erro={erroExcluir}
          onConfirmar={() => void excluir()}
          onFechar={() => setExcluindo(null)}
        >
          <p>
            <strong className="text-ink">{excluindo.titulo}</strong> deixa de aparecer para os alunos
            {excluindo.arquivo ? " e o arquivo é apagado do servidor" : ""}. Esta ação não pode ser desfeita.
          </p>
        </ConfirmarDialogo>
      )}
    </div>
  );
}

export default function MateriaisPage() {
  return (
    <Suspense fallback={<Carregando className="mx-auto max-w-4xl" />}>
      <MateriaisConteudo />
    </Suspense>
  );
}
