import Image from "next/image";
import Link from "next/link";
import { FolderOpen, MessageSquareText, Star, UsersRound, Volume2, Zap } from "lucide-react";
import { AlternatingTitle } from "@/components/AlternatingTitle";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";

const recursos = [
  {
    icone: FolderOpen,
    titulo: "Materiais Centralizados",
    texto: "Tudo em um só lugar. Acesse exercícios, leituras e recursos quando precisar.",
    cor: "bg-sky-soft text-sky-ink",
  },
  {
    icone: UsersRound,
    titulo: "Turmas Organizadas",
    texto: "Crie turmas, adicione alunos e gerencie suas aulas de forma simples.",
    cor: "bg-grape-soft text-grape",
  },
  {
    icone: Star,
    titulo: "Avaliações Detalhadas",
    texto: "Feedback em tempo real para acompanhar a evolução de cada aluno.",
    cor: "bg-candy-soft text-candy",
  },
];

export default function HomePage() {
  return (
    <div className="bg-cotton min-h-screen overflow-x-hidden">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link href="/home" className="rounded-xl">
          <BrandMark />
        </Link>
        <Link
          href="/login?tipo=aluno"
          className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-semibold text-ink-soft transition-colors hover:bg-white hover:text-ink"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-8 sm:pt-10">
        <section className="mb-20 grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="animate-rise">
            <p className="eyebrow mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-grape shadow-sm ring-1 ring-line">
              <span className="h-2 w-2 rounded-full bg-candy-bright" aria-hidden />
              Learn · Speak · Achieve
            </p>
            <AlternatingTitle />
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              Sweet Way English reúne um curso de inglês no seu ritmo, do básico ao intermediário, com as turmas,
              materiais, atividades e feedbacks da sua professora. Crie sua conta e comece agora, ou entre com o
              acesso que recebeu na sua turma.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/login?tipo=aluno" variant="primary" size="md" className="!rounded-2xl text-[1.05rem]">
                Entrar como Aluno
              </Button>
              <Button href="/login?tipo=professor" variant="secondary" size="md" className="!rounded-2xl text-[1.05rem]">
                Entrar como Professor
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div
              className="absolute -inset-4 rotate-3 rounded-[2.5rem] bg-gradient-to-br from-candy-bright/50 via-grape-bright/40 to-sky-bright/50"
              aria-hidden
            />
            <div className="relative aspect-[4/5] max-h-[560px] overflow-hidden rounded-[2rem] shadow-lg ring-4 ring-white">
              <Image
                src="/hero-city.png"
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Bolha de fala */}
            <div
              className="absolute -right-2 top-6 max-w-[13rem] animate-pop-in rounded-3xl rounded-br-md bg-white px-4 py-3 shadow-lg sm:-right-6"
              aria-hidden
            >
              <p className="flex items-center gap-2 font-display text-lg font-semibold text-ink" lang="en">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky text-white">
                  <Volume2 className="h-4 w-4" />
                </span>
                Nice to meet you!
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">Prazer em te conhecer!</p>
            </div>

            <div className="absolute -bottom-6 left-2 right-10 max-w-xs rounded-3xl bg-white p-4 shadow-lg sm:-left-6 sm:right-auto sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun text-ink">
                  <Zap className="h-5 w-5 fill-current" aria-hidden />
                </div>
                <div>
                  <h3 className="mb-0.5 font-semibold text-ink">Feedback em tempo real</h3>
                  <p className="text-sm text-ink-soft">
                    Acompanhe o progresso dos seus alunos com avaliações detalhadas e notas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
            {recursos.map(({ icone: Icone, titulo, texto, cor }) => (
              <article key={titulo} className="card p-6 transition-shadow hover:shadow-md">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${cor}`}>
                  <Icone className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-ink">{titulo}</h3>
                <p className="leading-relaxed text-ink-soft">{texto}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-col items-start gap-4 rounded-[1.75rem] bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-candy-bright">
              <MessageSquareText className="h-6 w-6" aria-hidden />
            </span>
            <p className="font-display text-xl font-semibold leading-snug sm:text-2xl">
              Ainda não tem conta? Crie a sua e comece o curso A1.
            </p>
          </div>
          <Link
            href="/cadastro"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-white px-6 font-display text-[1.05rem] font-semibold text-ink transition-colors hover:bg-grape-soft sm:w-auto"
          >
            Criar conta
          </Link>
        </section>
      </main>
    </div>
  );
}
