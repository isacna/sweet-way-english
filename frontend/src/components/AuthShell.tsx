import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark, LogoSwirl } from "./BrandMark";

const bolhas = [
  { en: "Hi! I'm Ana.", pt: "Oi! Eu sou a Ana.", pos: "left-[8%] top-[18%] -rotate-3", cor: "bg-white" },
  { en: "Nice to meet you!", pt: "Prazer em te conhecer!", pos: "right-[6%] top-[40%] rotate-2", cor: "bg-sky-soft" },
  { en: "See you tomorrow.", pt: "Até amanhã.", pos: "left-[14%] bottom-[16%] rotate-1", cor: "bg-candy-soft" },
];

/**
 * Moldura das telas de entrada (login e cadastro).
 * Desktop: painel "algodão-doce" à esquerda + formulário à direita. Mobile: faixa com a marca + cartão do formulário.
 */
export function AuthShell({
  voltarHref,
  children,
}: {
  voltarHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-cotton min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Painel decorativo (desktop) */}
      <aside
        className="relative hidden overflow-hidden bg-gradient-to-br from-grape via-grape to-sky lg:block"
        aria-hidden
      >
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-candy-bright/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-sky-bright/40 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <LogoSwirl size={56} className="shadow-lg ring-4 ring-white/70" />
            <span className="font-display text-2xl font-semibold">Sweet Way English</span>
          </div>
          <div className="relative h-[22rem]">
            {bolhas.map((b) => (
              <div
                key={b.en}
                className={`absolute max-w-[16rem] rounded-3xl rounded-bl-md px-5 py-3.5 text-ink shadow-lg ${b.pos} ${b.cor}`}
              >
                <p className="font-display text-xl font-semibold" lang="en">
                  {b.en}
                </p>
                <p className="text-sm text-ink-soft">{b.pt}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="font-display text-4xl font-semibold leading-tight">
              Aprenda inglês de um jeito <span className="text-candy-bright">doce</span> e eficiente.
            </p>
            <p className="mt-3 max-w-md text-white/85">
              Lições curtas com explicação em português, prática guiada e revisão para fixar de verdade.
            </p>
          </div>
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex min-h-screen flex-col px-4 pb-10 pt-4 sm:px-8 lg:min-h-0 lg:justify-center lg:py-12">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          <Link
            href={voltarHref}
            className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
          <Link href="/home" className="rounded-xl lg:hidden">
            <BrandMark size="sm" />
          </Link>
        </div>
        <div className="mx-auto mt-4 w-full max-w-md animate-rise sm:mt-8">
          <div className="card p-5 shadow-lg sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
