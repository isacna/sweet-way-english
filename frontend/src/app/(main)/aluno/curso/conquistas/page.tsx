"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Award, ChevronRight, Lock, ScrollText } from "lucide-react";
import { dataPorExtenso, nomeDoNivel } from "@/components/conquistas/apoio";
import { Medalha } from "@/components/conquistas/Medalha";
import { Cabecalho, Carregando, classeBotao, Mensagem } from "@/components/painel/ui";
import { apiFetch } from "@/lib/api";
import type { CertificadoNivel, Conquista } from "@/lib/curso";

type Dados = { conquistas: Conquista[]; niveis: CertificadoNivel[] };

/** Um nível na seção de certificados: emitido (abre o certificado) ou o que ainda falta. */
function LinhaCertificado({ item }: { item: CertificadoNivel }) {
  const { nivel, certificado } = item;
  const faltam = Math.max(item.totalModulos - item.modulosAprovados, 0);
  const titulo = `Nível ${nomeDoNivel(nivel)}`;

  if (certificado) {
    return (
      <li className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[conic-gradient(from_210deg,var(--color-candy-bright),var(--color-grape-bright),var(--color-sky-bright),var(--color-candy-bright))] text-white shadow-md"
          aria-hidden
        >
          <ScrollText className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-success-ink">Certificado emitido</p>
          <h3 className="mt-0.5 font-semibold leading-snug text-ink">{titulo}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">Emitido em {dataPorExtenso(certificado.emitidoEm)}.</p>
        </div>
        <Link href={`/aluno/curso/certificado/${certificado.codigo}`} className={classeBotao("primario", "shrink-0")}>
          Ver certificado
          <ChevronRight aria-hidden className="h-4 w-4" />
        </Link>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-4 rounded-[1.25rem] border border-dashed border-line-strong p-4 sm:flex-row sm:items-center sm:p-5">
      <span
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line-strong bg-gray-50 text-ink-faint"
        aria-hidden
      >
        <Lock className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-ink-faint">Certificado</p>
        <h3 className="mt-0.5 font-semibold leading-snug text-ink-soft">{titulo}</h3>
        {item.concluido ? (
          <p className="mt-0.5 text-sm text-ink-soft">Nível concluído. O certificado está sendo preparado: recarregue a página.</p>
        ) : (
          <>
            <p className="mt-0.5 text-sm text-ink-soft">
              {faltam === 1 ? "Falta passar no teste de 1 módulo" : `Falta passar no teste de ${faltam} módulos`} para receber
              o certificado.
            </p>
            <div className="mt-2.5 flex items-center gap-2.5">
              <div
                role="progressbar"
                aria-label={`Módulos aprovados no nível ${nivel.codigo}`}
                aria-valuemin={0}
                aria-valuemax={item.totalModulos}
                aria-valuenow={item.modulosAprovados}
                className="h-1.5 min-w-0 max-w-xs flex-1 overflow-hidden rounded-full bg-gray-100"
              >
                <div
                  className="h-full rounded-full bg-grape-bright"
                  style={{ width: `${item.totalModulos ? Math.round((item.modulosAprovados / item.totalModulos) * 100) : 0}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-soft">
                {item.modulosAprovados} de {item.totalModulos} módulos
              </span>
            </div>
          </>
        )}
      </div>
      <Link href="/aluno/curso" className={classeBotao("secundario", "shrink-0")}>
        Ir para a trilha
      </Link>
    </li>
  );
}

export default function ConquistasPage() {
  const router = useRouter();
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [resConquistas, resCertificados] = await Promise.all([
        apiFetch("/curso/conquistas").catch(() => null),
        apiFetch("/curso/certificados").catch(() => null),
      ]);
      if (cancelled) return;
      if (resConquistas?.status === 401 || resCertificados?.status === 401) {
        router.replace("/login?tipo=aluno");
        return;
      }
      if (!resConquistas?.ok || !resCertificados?.ok) {
        setErro("Não foi possível carregar suas conquistas. Tente de novo em instantes.");
        return;
      }
      const { conquistas } = (await resConquistas.json()) as { conquistas: Conquista[] };
      const { niveis } = (await resCertificados.json()) as { niveis: CertificadoNivel[] };
      if (!cancelled) setDados({ conquistas, niveis });
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const obtidas = dados?.conquistas.filter((c) => c.obtida).length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Cabecalho
        voltar={{ href: "/aluno/curso", rotulo: "Trilha do curso" }}
        eyebrow="Curso"
        titulo="Conquistas"
        descricao={
          dados
            ? obtidas === 0
              ? "Cada marco do curso vira uma conquista. A primeira vem com a sua primeira lição."
              : `Você já tem ${obtidas} de ${dados.conquistas.length} conquistas.`
            : "Os marcos do seu caminho no curso."
        }
      />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}
      {!dados && !erro && <Carregando />}

      {dados && (
        <>
          <section aria-labelledby="titulo-certificados" className="space-y-3">
            <h2 id="titulo-certificados" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em] text-ink">
              <ScrollText aria-hidden className="h-5 w-5 text-grape" />
              Certificados
            </h2>
            {dados.niveis.length === 0 ? (
              <p className="text-sm text-ink-soft">Os certificados aparecem aqui quando o curso tiver níveis publicados.</p>
            ) : (
              <ul className="space-y-3">
                {dados.niveis.map((n) => (
                  <LinhaCertificado key={n.nivel.id} item={n} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="titulo-medalhas" className="space-y-3">
            <h2 id="titulo-medalhas" className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em] text-ink">
              <Award aria-hidden className="h-5 w-5 text-grape" />
              Medalhas
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {dados.conquistas.map((c, i) => (
                <Medalha key={c.id} conquista={c} ordem={i} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
