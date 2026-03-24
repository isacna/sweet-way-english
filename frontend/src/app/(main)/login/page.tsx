"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { API_URL } from "@/lib/api";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const tipo = searchParams.get("tipo") ?? "aluno";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao fazer login");
        setCarregando(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "professor") {
        window.location.href = "/professor";
      } 

      if(data.user.role === "aluno") {
        window.location.href = "/aluno";
      }
    } catch {
      setErro("Não foi possível conectar ao servidor.");
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F8FA]">
      <main className="pt-12 pb-20 px-8 max-w-6xl mx-auto">
        <div className="flex justify-center mb-12">
          <Link href="/home">
            <Image
              src="/logo-sweet.png"
              alt="Sweet Way English - Learn. Speak. Achieve."
              width={340}
              height={340}
              className="w-auto h-auto max-w-[min(92vw,380px)] sm:max-w-[440px] md:max-w-[500px] object-contain"
              priority
            />
          </Link>
        </div>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Esquerda: box da cidade (contido, não maximizado) */}
          <div className="relative order-2 lg:order-1 hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[3/4] max-h-[560px]">
            <Image
              src="/hero-city.png"
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            </div>
            <div className="absolute -bottom-6 -left-4 lg:left-0 right-4 lg:right-auto max-w-xs p-5 rounded-2xl bg-white shadow-lg border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-[#8A4FF7]/10 flex items-center justify-center mb-3">
                <Image src="/icons/star.svg" alt="" width={24} height={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-1">
                Feedback em tempo real
              </h3>
              <p className="text-sm text-[#4A4A4A]">
                Acompanhe o progresso dos seus alunos com avaliações detalhadas e
                notas.
              </p>
            </div>
          </div>

          {/* Direita: formulário */}
          <div className="flex flex-col justify-center order-1 lg:order-2">
            <div className="max-w-md w-full mx-auto lg:mx-0">
              <Link
                href="/home"
                className="inline-flex items-center gap-2 text-[#4A4A4A] hover:text-[#1A1A1A] mb-12 transition-colors"
              >
                <span className="text-lg">←</span>
                Voltar
              </Link>

              <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
                Entrar
              </h1>
              <p className="text-[#4A4A4A] mb-8">
                {tipo === "professor"
                  ? "Acesse sua conta de professor"
                  : "Acesse sua conta de aluno"}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#1A1A1A] mb-2"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8A4FF7] focus:border-transparent"
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="senha"
                  className="block text-sm font-medium text-[#1A1A1A] mb-2"
                >
                  Senha
                </label>
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-[#1A1A1A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8A4FF7] focus:border-transparent"
                  autoComplete="current-password"
                />
              </div>

              {erro && (
                <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-3 rounded-xl bg-[#8A4FF7] text-white font-medium hover:bg-[#7742e0] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F8FA]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
