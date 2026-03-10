"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/Button";

const materials = [
  {
    type: "pdf",
    title: "Grammar Guide - Simple Past.pdf",
    category: "Grammar",
    size: "2.4 MB",
    time: "Há 2 dias",
      },
  {
    type: "audio",
    title: "Audio Lesson 4 - Listening.mp3",
    category: "Listening",
    size: "15.8 MB",
    time: "Há 5 dias",
  },
  {
    type: "spreadsheet",
    title: "Business English Vocabulary.xlsx",
    category: "Vocabulary",
    size: "1.2 MB",
    time: "Há 1 semana",
  },
];

const filters = ["Todos", "PDFs", "Áudio", "Vídeos"];

export default function MateriaisPage() {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [search, setSearch] = useState("");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            Materiais de Apoio
          </h1>
          <p className="text-[#4A4A4A] mt-1">
            Repositório de arquivos e conteúdos compartilhados.
          </p>
        </div>
        <Button href="#" variant="primary" size="md">
          <Image src="/icons/upload-white.svg" alt="" width={18} height={18} />
          Upload de Arquivo
        </Button>
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
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] placeholder:text-[#4A4A4A] focus:outline-none focus:ring-2 focus:ring-[#8A4FF7]/20 focus:border-[#8A4FF7]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-[#8A4FF7] text-white"
                  : "border border-gray-300 text-[#4A4A4A] hover:bg-gray-50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {materials.map((mat) => (
          <div
            key={mat.title}
            className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
          >
            <div
              className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"
            >
              {mat.type === "pdf" && (
                <Image src="/icons/file-document-red.svg" alt="" width={24} height={24} />
              )}
              {mat.type === "audio" && (
                <Image src="/icons/audio-blue.svg" alt="" width={24} height={24} />
              )}
              {mat.type === "spreadsheet" && (
                <Image src="/icons/file-document-green.svg" alt="" width={24} height={24} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#1A1A1A] truncate">{mat.title}</p>
              <p className="text-sm text-[#4A4A4A]">
                {mat.category} • {mat.size} • {mat.time}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                className="p-2 text-[#4A4A4A] hover:text-[#8A4FF7] hover:bg-[#8A4FF7]/10 rounded-lg transition-colors"
                aria-label="Download"
              >
                <Image src="/icons/download.svg" alt="" width={20} height={20} />
              </button>
              <button
                type="button"
                className="p-2 text-[#4A4A4A] hover:text-[#1A1A1A] hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Opções"
              >
                <Image src="/icons/more-vertical.svg" alt="" width={20} height={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-12 rounded-xl border-2 border-dashed border-gray-200 bg-[#F8F9FA] text-center">
        <Image
          src="/icons/upload-purple.svg"
          alt=""
          width={64}
          height={64}
          className="mx-auto mb-4 opacity-60"
        />
        <p className="font-medium text-[#1A1A1A] mb-1">
          Arraste arquivos aqui
        </p>
        <p className="text-sm text-[#4A4A4A] mb-4">
          Ou clique para selecionar arquivos do seu computador
        </p>
        <Button variant="primary" size="md">
          Selecionar Arquivos
        </Button>
      </div>
    </div>
  );
}
