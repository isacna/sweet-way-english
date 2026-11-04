"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, assetUrl, getStoredUser } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";
import { Download, Search } from "lucide-react";

type Turma = { id: number; nome: string };

type Material = {
  id: number;
  titulo: string;
  tipo: string;
  urlArquivo: string;
  criadoEm: string;
};

const FILTROS = [
  { label: "Todos", tipo: null as string | null },
  { label: "PDFs", tipo: "pdf" },
  { label: "Áudio", tipo: "audio" },
  { label: "Vídeos", tipo: "video" },
  { label: "Links", tipo: "link" },
];

function iconeTipo(tipo: string) {
  if (tipo === "pdf") return "/icons/file-document-red.svg";
  if (tipo === "audio") return "/icons/audio-blue.svg";
  return "/icons/file-document-green.svg";
}

function MateriaisAlunoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turmaQuery = searchParams.get("turma");

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [manualTurmaId, setManualTurmaId] = useState("");
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [carregandoTurmas, setCarregandoTurmas] = useState(true);
  const [carregandoMat, setCarregandoMat] = useState(false);

  const carregarMateriais = useCallback(async (id: string) => {
    if (!id) {
      setMateriais([]);
      return;
    }
    setCarregandoMat(true);
    const res = await apiFetch(`/turmas/${id}/materiais`);
    if (res.ok) {
      const data: Material[] = await res.json();
      setMateriais(data);
    } else {
      setMateriais([]);
    }
    setCarregandoMat(false);
  }, []);

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }

    let cancelled = false;

    async function loadTurmas() {
      setCarregandoTurmas(true);
      const res = await apiFetch("/turmas");
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (res.ok) {
        const data: Turma[] = await res.json();
        setTurmas(data);
      }
      setCarregandoTurmas(false);
    }

    void loadTurmas();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const turmaId = useMemo(() => {
    if (turmaQuery && turmas.some((t) => String(t.id) === turmaQuery))
      return turmaQuery;
    if (turmas.length === 1) return String(turmas[0].id);
    return manualTurmaId;
  }, [turmaQuery, turmas, manualTurmaId]);

  useEffect(() => {
    if (!turmaId) return;
    queueMicrotask(() => {
      void carregarMateriais(turmaId);
    });
  }, [turmaId, carregarMateriais]);

  const tipoFiltro = FILTROS.find((f) => f.label === activeFilter)?.tipo;

  const filtrados = useMemo(() => {
    let list = materiais;
    if (tipoFiltro) {
      list = list.filter(
        (m) => m.tipo.toLowerCase() === tipoFiltro.toLowerCase()
      );
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((m) => m.titulo.toLowerCase().includes(q));
    return list;
  }, [materiais, tipoFiltro, search]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Materiais</h1>
        <p className="text-ink-soft mt-1">
          Arquivos e links compartilhados pelo professor na turma.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <label className="block text-sm font-medium text-ink">
          Turma
        </label>
        <select
          value={turmaId}
          onChange={(e) => setManualTurmaId(e.target.value)}
          disabled={carregandoTurmas}
          className="w-full max-w-md px-4 py-3 rounded-lg border border-gray-300 text-ink"
        >
          <option value="">
            {carregandoTurmas ? "Carregando…" : "Selecione a turma"}
          </option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        {turmas.length === 0 && !carregandoTurmas && (
          <p className="text-sm text-ink-soft">
            <Link href="/aluno/turmas" className="text-accent">
              Entre em uma turma
            </Link>{" "}
            para ver materiais.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search aria-hidden className="h-[20px] w-[20px] shrink-0 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
          <input
            type="search"
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-ink focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setActiveFilter(f.label)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeFilter === f.label
                  ? "bg-accent text-white"
                  : "border border-gray-300 text-ink-soft hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!turmaId ? (
        <p className="text-sm text-ink-soft">Selecione uma turma.</p>
      ) : carregandoMat ? (
        <p className="text-sm text-ink-soft">Carregando materiais…</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum material encontrado.</p>
      ) : (
        <div className="space-y-4">
          {filtrados.map((mat) => {
            const href = assetUrl(mat.urlArquivo);
            return (
              <div
                key={mat.id}
                className="card flex items-center gap-4 p-4"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <Image
                    src={iconeTipo(mat.tipo)}
                    alt=""
                    width={24}
                    height={24}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">
                    {mat.titulo}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {mat.tipo.toUpperCase()} · {tempoRelativoPt(mat.criadoEm)}
                  </p>
                </div>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-ink-soft hover:text-accent rounded-lg shrink-0"
                    aria-label="Abrir"
                  >
                    <Download aria-hidden className="h-[20px] w-[20px] shrink-0" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AlunoMateriaisPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-8 text-ink-soft">Carregando…</div>
      }
    >
      <MateriaisAlunoContent />
    </Suspense>
  );
}
