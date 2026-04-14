"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AssetPreview } from "@/components/AssetPreview";
import { apiFetch, assetUrl } from "@/lib/api";
import { tempoRelativoPt } from "@/lib/timePt";

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
  if (tipo === "pdf")
    return "/icons/file-document-red.svg";
  if (tipo === "audio") return "/icons/audio-blue.svg";
  if (tipo === "video") return "/icons/file-document-green.svg";
  return "/icons/file-document-green.svg";
}

function MateriaisPageContent() {
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
  const [uploadTitulo, setUploadTitulo] = useState("");
  const [uploadTipo, setUploadTipo] = useState("pdf");
  const [uploadUrl, setUploadUrl] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  const carregarTurmas = useCallback(async () => {
    setCarregandoTurmas(true);
    const res = await apiFetch("/turmas");
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (res.ok) {
      const data: Turma[] = await res.json();
      setTurmas(data);
    }
    setCarregandoTurmas(false);
  }, [router]);

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
    queueMicrotask(() => {
      void carregarTurmas();
    });
  }, [carregarTurmas]);

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
    if (q) {
      list = list.filter((m) => m.titulo.toLowerCase().includes(q));
    }
    return list;
  }, [materiais, tipoFiltro, search]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!turmaId) {
      setMsg("Selecione uma turma.");
      return;
    }
    if (!uploadTitulo.trim()) {
      setMsg("Informe o título do material.");
      return;
    }
    if (uploadTipo === "link" && !uploadUrl.trim()) {
      setMsg("Informe a URL do link.");
      return;
    }
    if (uploadTipo !== "link" && !arquivo && !uploadUrl.trim()) {
      setMsg("Envie um arquivo ou informe uma URL.");
      return;
    }

    setEnviando(true);
    const fd = new FormData();
    fd.append("titulo", uploadTitulo.trim());
    fd.append("tipo", uploadTipo);
    if (uploadUrl.trim()) fd.append("url", uploadUrl.trim());
    if (arquivo) fd.append("arquivo", arquivo);

    const res = await apiFetch(`/turmas/${turmaId}/materiais`, {
      method: "POST",
      body: fd,
    });
    setEnviando(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(err.error ?? "Erro ao enviar material.");
      return;
    }
    setUploadTitulo("");
    setUploadUrl("");
    setArquivo(null);
    setMsg("Material adicionado.");
    await carregarMateriais(turmaId);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Materiais de Apoio
          </h1>
          <p className="text-[#4A4A4A] mt-1">
            Materiais são organizados por turma (como na API).
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm space-y-3">
        <label className="block text-sm font-medium text-[#1A1A1A]">
          Turma
        </label>
        <select
          value={turmaId}
          onChange={(e) => setManualTurmaId(e.target.value)}
          disabled={carregandoTurmas}
          className="w-full max-w-md px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A]"
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
          <p className="text-sm text-[#4A4A4A]">
            <Link href="/professor/turmas/nova" className="text-[#1898DC]">
              Crie uma turma
            </Link>{" "}
            para enviar materiais.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Image
            src="/icons/search.svg"
            alt=""
            width={20}
            height={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
          />
          <input
            type="search"
            placeholder="Buscar materiais..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] placeholder:text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#1898DC]/20 focus:border-[#1898DC]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setActiveFilter(filter.label)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter.label
                  ? "bg-[#1898DC] text-white"
                  : "border border-gray-300 text-[#4A4A4A] hover:bg-gray-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {!turmaId ? (
          <p className="text-sm text-[#4A4A4A]">Selecione uma turma.</p>
        ) : carregandoMat ? (
          <p className="text-sm text-[#4A4A4A]">Carregando materiais…</p>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-[#4A4A4A]">
            Nenhum material nesta turma (ou nenhum resultado no filtro).
          </p>
        ) : (
          filtrados.map((mat) => {
            const href = assetUrl(mat.urlArquivo);
            return (
              <div
                key={mat.id}
                className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Image
                      src={iconeTipo(mat.tipo)}
                      alt=""
                      width={24}
                      height={24}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1A1A1A] truncate">
                      {mat.titulo}
                    </p>
                    <p className="text-sm text-[#4A4A4A]">
                      {mat.tipo.toUpperCase()} •{" "}
                      {tempoRelativoPt(mat.criadoEm)}
                    </p>
                  </div>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-[#4A4A4A] hover:text-[#1898DC] hover:bg-[#1898DC]/10 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Abrir material"
                    >
                      <Image
                        src="/icons/download.svg"
                        alt=""
                        width={20}
                        height={20}
                      />
                    </a>
                  )}
                </div>
                {href && (
                  <AssetPreview
                    fullUrl={href}
                    tipo={mat.tipo}
                    title={mat.titulo}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleUpload}
        className="p-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 space-y-4"
      >
        <div className="text-center mb-2">
          <Image
            src="/icons/upload-purple.svg"
            alt=""
            width={48}
            height={48}
            className="mx-auto mb-2 opacity-60"
          />
          <p className="font-medium text-[#1A1A1A]">Adicionar material</p>
          <p className="text-sm text-[#4A4A4A]">
            Arquivo ou link (tipo &quot;link&quot; usa só a URL).
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Título"
              value={uploadTitulo}
              onChange={(e) => setUploadTitulo(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
            />
          </div>
          <div>
            <select
              value={uploadTipo}
              onChange={(e) => setUploadTipo(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
            >
              <option value="pdf">PDF</option>
              <option value="audio">Áudio</option>
              <option value="video">Vídeo</option>
              <option value="link">Link</option>
            </select>
          </div>
          <div>
            <input
              type="url"
              placeholder="URL (opcional se enviar arquivo)"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300"
            />
          </div>
          <div className="sm:col-span-2">
            <input
              type="file"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[#4A4A4A]"
            />
          </div>
        </div>
        {msg && (
          <p
            className={`text-sm text-center ${msg.includes("Erro") || msg.includes("Selecione") || msg.includes("Informe") ? "text-red-600" : "text-green-700"}`}
          >
            {msg}
          </p>
        )}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={enviando || !turmaId}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1898DC] text-white font-medium px-6 py-3 hover:bg-[#147EB8] disabled:opacity-60"
          >
            <Image src="/icons/upload-white.svg" alt="" width={18} height={18} />
            {enviando ? "Enviando…" : "Enviar material"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function MateriaisPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-8 text-[#4A4A4A]">Carregando…</div>
      }
    >
      <MateriaisPageContent />
    </Suspense>
  );
}
