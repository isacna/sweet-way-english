"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { rotuloStatus, type StatusConteudo } from "@/lib/curso";
import { tempoRelativoPt } from "@/lib/timePt";
import type { ModuloPainel, PainelConteudo } from "@/components/conteudo/tipos";
import {
  ConfirmDialog,
  StatusBadge,
  classeBotaoLink,
  classeBotaoPrimario,
  classeBotaoSecundario,
  formatarData,
} from "@/components/conteudo/ui";

type AcaoModulo = { modulo: ModuloPainel; status: StatusConteudo };

const STATUS: StatusConteudo[] = ["rascunho", "revisao", "publicado"];

export default function ProfessorConteudoPage() {
  const router = useRouter();
  const [painel, setPainel] = useState<PainelConteudo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [soPendentes, setSoPendentes] = useState(false);
  const [confirmando, setConfirmando] = useState<AcaoModulo | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [publicandoLicao, setPublicandoLicao] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setErro("");
    const res = await apiFetch("/conteudo").catch(() => null);
    if (!res) {
      setErro("Sem conexão com o servidor.");
      setCarregando(false);
      return;
    }
    if (res.status === 401 || res.status === 403) {
      router.replace("/login?tipo=professor");
      return;
    }
    if (!res.ok) {
      setErro("Não foi possível carregar o conteúdo do curso.");
      setCarregando(false);
      return;
    }
    setPainel((await res.json()) as PainelConteudo);
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => {
      void carregar();
    });
  }, [carregar]);

  const niveisVisiveis = useMemo(() => {
    if (!painel) return [];
    if (!soPendentes) return painel.niveis;
    return painel.niveis
      .map((n) => ({
        ...n,
        modulos: n.modulos
          .map((m) => ({ ...m, licoes: m.licoes.filter((l) => l.status !== "publicado") }))
          .filter((m) => m.status !== "publicado" || m.licoes.length > 0),
      }))
      .filter((n) => n.modulos.length > 0);
  }, [painel, soPendentes]);

  const totais = useMemo(() => {
    const t: Record<StatusConteudo, number> = { rascunho: 0, revisao: 0, publicado: 0 };
    painel?.niveis.forEach((n) => n.modulos.forEach((m) => m.licoes.forEach((l) => (t[l.status] += 1))));
    return t;
  }, [painel]);

  async function mudarStatusModulo() {
    if (!confirmando) return;
    setOcupado(true);
    const publicar = confirmando.status === "publicado";
    const res = await apiFetch(`/conteudo/modulos/${confirmando.modulo.id}/status`, {
      method: "PATCH",
      body: JSON.stringify(publicar ? { status: "publicado", incluirLicoes: true } : { status: confirmando.status }),
    }).catch(() => null);
    setOcupado(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setErro(data.error ?? "Não foi possível alterar o status do módulo.");
      setConfirmando(null);
      return;
    }
    setConfirmando(null);
    void carregar();
  }

  async function publicarLicao(id: number) {
    setPublicandoLicao(id);
    const res = await apiFetch(`/conteudo/licoes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "publicado" }),
    }).catch(() => null);
    setPublicandoLicao(null);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setErro(data.error ?? "Não foi possível publicar a lição.");
      return;
    }
    void carregar();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <Link
          href="/professor"
          className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-2"
        >
          ← Voltar ao painel
        </Link>
        <h1 className="text-2xl font-bold text-ink">Conteúdo do curso</h1>
        <p className="text-ink-soft mt-1">
          Revise e publique as lições do curso autoguiado. O conteúdo é o mesmo para todas as turmas.
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-sky/20 bg-sky-soft/70 px-5 py-4 text-sm text-ink space-y-1">
        <p className="font-semibold">Nada aparece para os alunos antes de ser publicado.</p>
        <p className="text-ink-soft">
          Um aluno só vê uma lição quando ela <strong>e</strong> o módulo dela estão com o status
          &quot;Publicado&quot;. Abra cada lição, confira a explicação e o gabarito dos exercícios e publique quando
          estiver tudo certo.
        </p>
      </div>

      {erro && <p className="text-sm text-danger-ink bg-danger-soft px-4 py-3 rounded-2xl font-medium">{erro}</p>}

      {painel && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2 text-sm">
            {STATUS.map((s) => (
              <span key={s} className="inline-flex items-center gap-2 rounded-xl bg-white border border-line px-3 py-1.5 shadow-sm">
                <StatusBadge status={s} />
                <span className="font-semibold text-ink">{totais[s]}</span>
                <span className="text-ink-soft">{totais[s] === 1 ? "lição" : "lições"}</span>
              </span>
            ))}
          </div>
          <label className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} />
            Mostrar só o que falta revisar
          </label>
        </div>
      )}

      {carregando ? (
        <p className="p-8 rounded-xl bg-white border border-gray-100 text-ink-soft">Carregando conteúdo…</p>
      ) : painel && painel.niveis.length === 0 ? (
        <p className="p-8 rounded-xl bg-white border border-gray-100 text-ink-soft">
          Nenhum conteúdo importado ainda. Rode <code>npm run conteudo:importar</code> no backend.
        </p>
      ) : soPendentes && niveisVisiveis.length === 0 ? (
        <p className="p-8 rounded-xl bg-white border border-gray-100 text-center text-ink-soft">
          Tudo revisado e publicado.
        </p>
      ) : (
        niveisVisiveis.map((nivel) => (
          <section key={nivel.id} className="space-y-4">
            <h2 className="text-lg font-bold text-ink">
              {nivel.codigo} · {nivel.nome}
            </h2>
            {nivel.modulos.map((m) => {
              const original = painel?.niveis.flatMap((n) => n.modulos).find((x) => x.id === m.id) ?? m;
              const contagem: Record<StatusConteudo, number> = { rascunho: 0, revisao: 0, publicado: 0 };
              original.licoes.forEach((l) => (contagem[l.status] += 1));
              const tudoPublicado = m.status === "publicado" && contagem.publicado === original.licoes.length;
              return (
                <div key={m.id} className="card overflow-hidden">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 px-5 py-4 border-b border-gray-100">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-ink-soft">Módulo {m.ordem}</span>
                        <StatusBadge status={m.status} />
                      </div>
                      <h3 className="text-base font-bold text-ink mt-1">{m.titulo}</h3>
                      <p className="text-sm text-ink-soft">{m.tema}</p>
                      <p className="text-xs text-ink-soft mt-2">
                        {original.licoes.length} {original.licoes.length === 1 ? "lição" : "lições"}:{" "}
                        {STATUS.map((s) => `${contagem[s]} ${rotuloStatus[s].toLowerCase()}`).join(" · ")}
                      </p>
                      {m.status !== "publicado" && contagem.publicado > 0 && (
                        <p className="text-xs text-amber-800 mt-1">
                          O módulo não está publicado: os alunos ainda não veem nenhuma lição dele.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link href={`/professor/conteudo/modulo/${m.id}/teste`} className={classeBotaoSecundario}>
                        Ver teste ({m.totalItensTeste} itens)
                      </Link>
                      {!tudoPublicado && (
                        <button
                          type="button"
                          onClick={() => setConfirmando({ modulo: original, status: "publicado" })}
                          className={classeBotaoPrimario}
                        >
                          Publicar módulo inteiro
                        </button>
                      )}
                      {m.status === "publicado" && (
                        <button
                          type="button"
                          onClick={() => setConfirmando({ modulo: original, status: "rascunho" })}
                          className="inline-flex min-h-[40px] items-center justify-center font-semibold rounded-xl border-2 border-danger-bright/40 text-danger-ink px-4 py-2 text-sm hover:bg-danger-soft"
                        >
                          Despublicar
                        </button>
                      )}
                    </div>
                  </div>
                  {m.licoes.length > 0 && (
                    <ul className="divide-y divide-gray-100">
                      {m.licoes.map((l) => (
                        <li
                          key={l.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3 hover:bg-gray-50/80"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink">
                              {l.ordem}. {l.titulo}
                            </p>
                            <p className="text-xs text-ink-soft">
                              {l.totalExercicios} exercícios · atualizada {tempoRelativoPt(l.atualizadoEm).toLowerCase()}
                              {l.revisadoEm && ` · revisada em ${formatarData(l.revisadoEm)}`}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 shrink-0">
                            <StatusBadge status={l.status} />
                            <Link href={`/professor/conteudo/licao/${l.id}`} className={classeBotaoLink}>
                              {l.status === "publicado" ? "Editar" : "Revisar e editar"}
                            </Link>
                            {l.status !== "publicado" && (
                              <button
                                type="button"
                                disabled={publicandoLicao === l.id}
                                onClick={() => void publicarLicao(l.id)}
                                className={classeBotaoLink}
                              >
                                {publicandoLicao === l.id ? "Publicando…" : "Publicar"}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        ))
      )}

      {confirmando && (
        <ConfirmDialog
          titulo={confirmando.status === "publicado" ? "Publicar módulo inteiro" : "Despublicar módulo"}
          rotuloConfirmar={confirmando.status === "publicado" ? "Publicar módulo e lições" : "Despublicar"}
          perigo={confirmando.status !== "publicado"}
          ocupado={ocupado}
          onConfirmar={() => void mudarStatusModulo()}
          onCancelar={() => setConfirmando(null)}
        >
          {confirmando.status === "publicado" ? (
            <>
              <p>
                O módulo <strong>{confirmando.modulo.titulo}</strong> e todas as suas{" "}
                {confirmando.modulo.licoes.length} lições ficarão visíveis para os alunos, e você ficará registrada
                como revisora.
              </p>
              {confirmando.modulo.licoes.some((l) => l.status !== "revisao" && l.status !== "publicado") && (
                <p className="text-amber-800">
                  Atenção: há lições ainda em rascunho neste módulo. Confirme apenas se já revisou todas.
                </p>
              )}
            </>
          ) : (
            <p>
              O módulo <strong>{confirmando.modulo.titulo}</strong> deixará de aparecer para os alunos. O progresso
              deles é mantido e as lições continuam com o status atual.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
