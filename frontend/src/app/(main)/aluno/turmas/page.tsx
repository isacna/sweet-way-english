"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { apiFetch, getStoredUser } from "@/lib/api";

type Turma = {
  id: number;
  nome: string;
  descricao: string | null;
  codigoConvite: string;
  professor?: { nome: string };
};

export default function AlunoTurmasPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [codigo, setCodigo] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [msgConvite, setMsgConvite] = useState("");

  async function recarregar() {
    const res = await apiFetch("/turmas");
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=aluno");
      return;
    }
    if (res.ok) {
      const data: Turma[] = await res.json();
      setTurmas(data);
    }
  }

  useEffect(() => {
    const u = getStoredUser();
    if (!u || u.role !== "aluno") {
      router.replace("/login?tipo=aluno");
      return;
    }

    let cancelled = false;

    async function load() {
      const res = await apiFetch("/turmas");
      if (cancelled) return;
      if (res.status === 401 || res.status === 403) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!res.ok) {
        setErro("Não foi possível carregar suas turmas.");
        setCarregando(false);
        return;
      }
      const data: Turma[] = await res.json();
      if (cancelled) return;
      setTurmas(data);
      setCarregando(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault();
    if (turmas.length > 0) return;
    setMsgConvite("");
    setErro("");
    const c = codigo.trim();
    if (!c) {
      setMsgConvite("Informe o código de convite.");
      return;
    }
    setEntrando(true);
    const res = await apiFetch("/turmas/entrar", {
      method: "POST",
      body: JSON.stringify({ codigoConvite: c }),
    });
    setEntrando(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsgConvite(data.error ?? "Não foi possível entrar na turma.");
      return;
    }
    setCodigo("");
    setMsgConvite("Você entrou na turma com sucesso.");
    await recarregar();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Minhas turmas</h1>
        {!carregando && (
          <p className="text-[#4A4A4A] mt-1">
            {turmas.length > 0
              ? "Suas turmas matriculadas. Não é possível entrar em outra turma enquanto estiver em uma."
              : "Use o código que o professor passou para se matricular."}
          </p>
        )}
      </div>

      {!carregando && turmas.length === 0 && (
        <>
          <form
            onSubmit={handleEntrar}
            className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="codigo"
                className="block text-sm font-medium text-[#1A1A1A] mb-2"
              >
                Código de convite
              </label>
              <input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex.: SWB1-2025"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#8A4FF7]/20 focus:border-[#8A4FF7]"
              />
            </div>
            <button
              type="submit"
              disabled={entrando}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8A4FF7] text-white font-medium px-6 py-3 hover:bg-[#7742e0] disabled:opacity-70"
            >
              {entrando ? (
                "Entrando…"
              ) : (
                <>
                  <Image
                    src="/icons/plus-white.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Entrar na turma
                </>
              )}
            </button>
          </form>
          {msgConvite && (
            <p
              className={`text-sm px-4 py-3 rounded-xl ${msgConvite.includes("sucesso") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
            >
              {msgConvite}
            </p>
          )}
        </>
      )}
      {erro && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-[#4A4A4A]">Carregando…</p>
      ) : turmas.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {turmas.map((t) => (
            <article
              key={t.id}
              className="p-6 rounded-xl bg-white border border-gray-100 shadow-sm flex flex-col"
            >
              <h3 className="font-bold text-[#1A1A1A] mb-2">{t.nome}</h3>
              {t.descricao && (
                <p className="text-sm text-[#4A4A4A] mb-3 line-clamp-3">
                  {t.descricao}
                </p>
              )}
              <p className="text-sm text-[#4A4A4A] mb-4">
                Professor:{" "}
                <span className="font-medium text-[#1A1A1A]">
                  {t.professor?.nome ?? "—"}
                </span>
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <Button
                  href={`/aluno/turmas/${t.id}`}
                  variant="primary"
                  size="md"
                >
                  Abrir turma
                </Button>
                <Link
                  href={`/aluno/materiais?turma=${t.id}`}
                  className="text-center text-sm font-medium text-[#8A4FF7] hover:text-[#7742e0]"
                >
                  Materiais
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
