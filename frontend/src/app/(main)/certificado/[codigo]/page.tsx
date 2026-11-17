import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleAlert, SearchX } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { dataPorExtenso, formatarCodigo, nomeDoNivel } from "@/components/conquistas/apoio";
import type { CertificadoPublico } from "@/lib/curso";

// A página mostra o nome de uma pessoa: não deve ser indexada
export const metadata: Metadata = {
  title: "Conferir certificado · Sweet Way English",
  robots: { index: false, follow: false },
};

type Consulta = { situacao: "valido"; certificado: CertificadoPublico } | { situacao: "ausente" } | { situacao: "falha" };

/**
 * Server component: chama o backend direto (`BACKEND_URL`), como o layout da professora. Assim um código
 * inexistente não vira um 404 de rede no console de quem está conferindo.
 */
async function consultar(codigo: string): Promise<Consulta> {
  try {
    const base = (process.env.BACKEND_URL ?? "http://localhost:3333").replace(/\/$/, "");
    const res = await fetch(`${base}/api/certificados/${encodeURIComponent(codigo)}`, { cache: "no-store" });
    if (res.status === 404) return { situacao: "ausente" };
    if (!res.ok) return { situacao: "falha" };
    return { situacao: "valido", certificado: (await res.json()) as CertificadoPublico };
  } catch {
    return { situacao: "falha" };
  }
}

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="eyebrow shrink-0 text-ink-faint sm:w-44">{rotulo}</dt>
      <dd className="min-w-0 break-words font-semibold text-ink">{children}</dd>
    </div>
  );
}

export default async function ConferirCertificadoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const consulta = await consultar(codigo);
  const codigoLimpo = codigo.toUpperCase().replace(/[\s-]/g, "");

  return (
    <div className="bg-cotton flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/home" aria-label="Sweet Way English: página inicial" className="rounded-xl transition-opacity hover:opacity-85">
          <BrandMark />
        </Link>
        <span className="eyebrow text-ink-faint">Conferência de certificado</span>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-16 sm:px-8">
        {consulta.situacao === "valido" ? (
          <section className="card animate-rise overflow-hidden shadow-lg" aria-labelledby="titulo-conferencia">
            <div className="h-1.5 bg-gradient-to-r from-candy-bright via-grape-bright to-sky-bright" aria-hidden />
            <div className="p-6 sm:p-10">
              <p className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3.5 py-1.5 text-sm font-semibold text-success-ink">
                <BadgeCheck aria-hidden className="h-[1.125rem] w-[1.125rem]" />
                Certificado válido
              </p>
              <h1
                id="titulo-conferencia"
                className="mt-5 break-words text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[2.75rem]"
              >
                {consulta.certificado.nomeAluno}
              </h1>
              <p className="mt-3 max-w-xl text-lg text-ink-soft">
                concluiu o nível{" "}
                <strong className="font-semibold text-ink">
                  {nomeDoNivel(consulta.certificado.nivel)}
                </strong>{" "}
                do curso de inglês Sweet Way English.
              </p>

              <dl className="mt-7 divide-y divide-line border-y border-line">
                <Dado rotulo="Emitido em">{dataPorExtenso(consulta.certificado.emitidoEm)}</Dado>
                <Dado rotulo="Código de verificação">
                  <span className="font-mono tracking-wider">{formatarCodigo(codigoLimpo)}</span>
                </Dado>
                <Dado rotulo="Emitido por">Sweet Way English</Dado>
              </dl>

              <p className="mt-6 text-sm text-ink-soft">
                Este registro confirma que o certificado foi emitido pela plataforma. Confira se o nome e o nível acima são os
                mesmos do documento que você recebeu.
              </p>
            </div>
          </section>
        ) : (
          <section className="card animate-rise p-6 text-center shadow-lg sm:p-10" aria-labelledby="titulo-conferencia">
            <span
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                consulta.situacao === "ausente" ? "bg-danger-soft text-danger-ink" : "bg-sun-soft text-sun-ink"
              }`}
              aria-hidden
            >
              {consulta.situacao === "ausente" ? <SearchX className="h-7 w-7" /> : <CircleAlert className="h-7 w-7" />}
            </span>
            <h1 id="titulo-conferencia" className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-ink">
              {consulta.situacao === "ausente" ? "Certificado não encontrado" : "Não foi possível conferir agora"}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-ink-soft">
              {consulta.situacao === "ausente"
                ? "Nenhum certificado foi emitido com este código. Confira se o endereço foi digitado como aparece no documento."
                : "O serviço de conferência não respondeu. Tente de novo em alguns minutos."}
            </p>
            <p className="mt-5 inline-block max-w-full break-all rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-sm text-ink-soft">
              {codigo.slice(0, 40)}
            </p>
          </section>
        )}

        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link href="/home" className="font-semibold text-accent underline underline-offset-2">
            Conheça o curso Sweet Way English
          </Link>
        </p>
      </main>
    </div>
  );
}
