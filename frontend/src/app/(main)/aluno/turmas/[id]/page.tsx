"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, getStoredUser } from "@/lib/api";
import { ArquivoBotao } from "@/components/ArquivoBotao";
import type { ArquivoResumo } from "@/lib/arquivos";
import { FileText } from "lucide-react";

type TurmaDetalhe = {
  id: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  professor: { nome: string };
};

type Aviso = {
  id: number;
  titulo: string;
  conteudo: string | null;
  link: string | null;
  criadoEm: string;
};

type Material = {
  id: number;
  titulo: string;
  tipo: string;
  /** "/api/arquivos/<id>" (upload, privado) ou URL externa (link) */
  urlArquivo: string;
  arquivo: ArquivoResumo | null;
};

type Atividade = {
  id: number;
  titulo: string;
  descricao: string;
  dataEntrega: string;
  arquivoObrigatorio?: boolean;
  submissoes: { id: number; status: string; dataEnvio: string }[];
};

type StatusFiltro = "todos" | "a-entregar" | "enviada" | "aprovada" | "reprovada" | "corrigida";
type TipoMaterialFiltro = "todos" | "pdf" | "audio" | "video" | "link";

function statusAluno(a: Atividade): { label: string; key: StatusFiltro } {
  const s = a.submissoes?.[0];
  if (!s) return { label: "A entregar", key: "a-entregar" };
  if (s.status === "corrigido") return { label: "Corrigida", key: "corrigida" };
  if (s.status === "aprovado") return { label: "Aprovada", key: "aprovada" };
  if (s.status === "reprovado") return { label: "Reprovada", key: "reprovada" };
  return { label: "Enviada · aguardando correção", key: "enviada" };
}

function statusCor(key: StatusFiltro): string {
  if (key === "aprovada") return "text-success-ink";
  if (key === "reprovada") return "text-danger-ink";
  if (key === "corrigida") return "text-grape";
  if (key === "enviada") return "text-sun-ink";
  return "text-grape";
}

function ChipFiltro({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
        ativo
          ? "bg-grape text-white"
          : "bg-gray-100 text-ink-soft hover:bg-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

const tiposMaterial: { valor: TipoMaterialFiltro; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "pdf", label: "PDF" },
  { valor: "audio", label: "Áudio" },
  { valor: "video", label: "Vídeo" },
  { valor: "link", label: "Link" },
];

const statusFiltros: { valor: StatusFiltro; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "a-entregar", label: "A entregar" },
  { valor: "enviada", label: "Enviada" },
  { valor: "aprovada", label: "Aprovada" },
  { valor: "reprovada", label: "Reprovada" },
  { valor: "corrigida", label: "Corrigida" },
];

export default function AlunoTurmaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [filtroMaterial, setFiltroMaterial] = useState<TipoMaterialFiltro>("todos");
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("todos");

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

      const [resA, resM, resAv] = await Promise.all([
        apiFetch(`/turmas/${id}/atividades`),
        apiFetch(`/turmas/${id}/materiais`),
        apiFetch(`/turmas/${id}/avisos`),
      ]);
      if (cancelled) return;

      const ats: Atividade[] = resA.ok ? await resA.json() : [];
      const mats: Material[] = resM.ok ? await resM.json() : [];
      const avs: Aviso[] = resAv.ok ? await resAv.json() : [];

      setTurma(t);
      // Mais recente primeiro (maior id = criado mais recentemente)
      setAtividades([...ats].sort((a, b) => b.id - a.id));
      setMateriais(mats);
      setAvisos(avs);
      setCarregando(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [id, router]);

  if (carregando) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-ink-soft">Carregando…</p>
      </div>
    );
  }

  if (erro || !turma) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <p className="text-danger-ink">{erro || "Turma não encontrada."}</p>
        <Button href="/aluno/turmas" variant="secondary" size="md">
          Voltar às turmas
        </Button>
      </div>
    );
  }

  const materiaisFiltrados = filtroMaterial === "todos"
    ? materiais
    : materiais.filter((m) => m.tipo === filtroMaterial);

  const atividadesFiltradas = filtroStatus === "todos"
    ? atividades
    : atividades.filter((a) => statusAluno(a).key === filtroStatus);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/aluno/turmas"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-4"
        >
          ← Minhas turmas
        </Link>
        <h1 className="text-2xl font-bold text-ink">{turma.nome}</h1>
        <p className="text-ink-soft mt-1">Professor {turma.professor.nome}</p>
        {turma.descricao && (
          <p className="text-sm text-ink-soft mt-3 max-w-2xl">{turma.descricao}</p>
        )}
      </div>

      {/* Mural de Avisos */}
      {avisos.length > 0 && (
        <section className="rounded-xl border border-grape/20 bg-grape-mist overflow-hidden">
          <div className="px-6 py-4 border-b border-grape/15 flex items-center gap-2">
            <span>📌</span>
            <h2 className="text-base font-bold text-ink">Mural de Avisos</h2>
          </div>
          <ul className="divide-y divide-grape/10">
            {avisos.map((av) => (
              <li key={av.id} className="px-6 py-4 space-y-1">
                <p className="font-semibold text-ink">{av.titulo}</p>
                {av.conteudo && (
                  <p className="text-sm text-ink-soft">{av.conteudo}</p>
                )}
                {av.link && (
                  <a
                    href={av.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-grape hover:underline break-all"
                  >
                    🔗 {av.link}
                  </a>
                )}
                <p className="text-xs text-ink-soft">
                  {new Date(av.criadoEm).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Materiais */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-bold text-ink">Materiais</h2>
          {materiais.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {tiposMaterial.map((t) => (
                <ChipFiltro
                  key={t.valor}
                  ativo={filtroMaterial === t.valor}
                  onClick={() => setFiltroMaterial(t.valor)}
                >
                  {t.label}
                </ChipFiltro>
              ))}
            </div>
          )}
        </div>

        {materiais.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum material publicado.</p>
        ) : materiaisFiltrados.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhum material do tipo selecionado.</p>
        ) : (
          <ul className="space-y-2">
            {materiaisFiltrados.map((m) => {
              const href = m.urlArquivo || null;
              return (
                <li key={m.id}>
                  {href ? (
                    <ArquivoBotao
                      url={href}
                      nome={m.arquivo?.nomeOriginal}
                      className="text-sm font-medium text-grape hover:opacity-80 flex items-center gap-2 text-left"
                    >
                      <FileText aria-hidden className="h-[16px] w-[16px] shrink-0" />
                      {m.titulo}{" "}
                      <span className="text-ink-soft font-normal capitalize">({m.tipo})</span>
                    </ArquivoBotao>
                  ) : (
                    <span className="text-sm text-ink">{m.titulo}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Atividades */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-bold text-ink">Atividades</h2>
          {atividades.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {statusFiltros.map((f) => (
                <ChipFiltro
                  key={f.valor}
                  ativo={filtroStatus === f.valor}
                  onClick={() => setFiltroStatus(f.valor)}
                >
                  {f.label}
                </ChipFiltro>
              ))}
            </div>
          )}
        </div>

        {atividades.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhuma atividade nesta turma.</p>
        ) : atividadesFiltradas.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhuma atividade com esse status.</p>
        ) : (
          <ul className="space-y-3">
            {atividadesFiltradas.map((a) => {
              const status = statusAluno(a);
              return (
                <li
                  key={a.id}
                  className="p-4 rounded-lg border border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{a.titulo}</p>
                    <p className="text-xs text-ink-soft mt-1 line-clamp-2">{a.descricao}</p>
                    <p className="text-xs text-ink-soft mt-2">
                      Entrega: {new Date(a.dataEntrega).toLocaleString("pt-BR")}
                    </p>
                    {a.arquivoObrigatorio && (
                      <p className="text-xs text-sun-ink mt-1 font-medium">
                        Arquivo obrigatório na entrega
                      </p>
                    )}
                    <p className={`text-xs font-medium mt-1 ${statusCor(status.key)}`}>
                      {status.label}
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
