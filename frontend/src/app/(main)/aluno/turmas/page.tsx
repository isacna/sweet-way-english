"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FolderOpen, KeyRound, LogIn, UsersRound } from "lucide-react";
import { Cabecalho, Campo, Carregando, classeBotao, classeCampo, erroDaApi, Mensagem, RegiaoAoVivo } from "@/components/painel/ui";
import type { TurmaResumo } from "@/components/turmas/tipos";
import { apiFetch } from "@/lib/api";

export default function AlunoTurmasPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<TurmaResumo[] | null>(null);
  const [erro, setErro] = useState("");
  const [codigo, setCodigo] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erroCodigo, setErroCodigo] = useState("");
  const [sucesso, setSucesso] = useState<{ tom: "sucesso"; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const res = await apiFetch("/turmas").catch(() => null);
    if (res?.status === 401 || res?.status === 403) {
      router.replace("/login?tipo=aluno");
      return;
    }
    if (!res?.ok) {
      setErro(await erroDaApi(res, "Não foi possível carregar suas turmas."));
      setTurmas([]);
      return;
    }
    setTurmas(await res.json());
  }, [router]);

  useEffect(() => {
    queueMicrotask(() => void carregar());
  }, [carregar]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErroCodigo("");
    const c = codigo.trim().toUpperCase();
    if (!c) {
      setErroCodigo("Digite o código que o professor passou.");
      return;
    }
    setEntrando(true);
    const res = await apiFetch("/turmas/entrar", {
      method: "POST",
      body: JSON.stringify({ codigoConvite: c }),
    }).catch(() => null);
    setEntrando(false);
    if (!res?.ok) {
      setErroCodigo(
        res?.status === 404
          ? "Não encontramos uma turma com esse código. Confira as letras e os números."
          : await erroDaApi(res, "Não foi possível entrar na turma."),
      );
      return;
    }
    setCodigo("");
    setSucesso({ tom: "sucesso", texto: "Pronto! Você entrou na turma." });
    await carregar();
  }

  if (turmas === null) return <Carregando texto="Carregando suas turmas…" className="mx-auto max-w-4xl" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Cabecalho
        titulo="Minhas turmas"
        descricao={
          turmas.length > 0
            ? "Atividades, avisos e materiais do seu professor."
            : "Entre na turma do seu professor com o código de convite."
        }
      />

      {erro && <Mensagem tom="erro">{erro}</Mensagem>}
      <RegiaoAoVivo mensagem={sucesso} />

      {turmas.length === 0 && !erro && (
        <form onSubmit={entrar} className="card relative overflow-hidden p-5 sm:p-7" noValidate>
          <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-grape/25 blur-3xl" aria-hidden />
          <div className="relative">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-grape-soft text-grape" aria-hidden>
              <KeyRound className="h-6 w-6" />
            </span>
            <h2 className="text-xl font-semibold text-ink">Entrar em uma turma</h2>
            <p className="mt-1 text-sm text-ink-soft">
              O código parece com <span className="font-mono font-semibold text-ink">SWA1-2026</span>. Você só pode estar em
              uma turma por vez.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Campo id="codigo" rotulo="Código de convite" className="min-w-0 flex-1">
                <input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={erroCodigo ? true : undefined}
                  aria-describedby={erroCodigo ? "codigo-erro" : undefined}
                  className={`${classeCampo} font-mono uppercase tracking-wide`}
                />
              </Campo>
              <button type="submit" disabled={entrando} className={classeBotao("primario", "sm:min-w-[11rem]")}>
                <LogIn aria-hidden className="h-4 w-4" />
                {entrando ? "Entrando…" : "Entrar na turma"}
              </button>
            </div>
            {erroCodigo && (
              <div id="codigo-erro" className="mt-3">
                <Mensagem tom="erro">{erroCodigo}</Mensagem>
              </div>
            )}
          </div>
        </form>
      )}

      {turmas.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {turmas.map((t) => (
            <li key={t.id} className="card flex flex-col p-5">
              <Link href={`/aluno/turmas/${t.id}`} className="group -m-2 flex items-start gap-3 rounded-xl p-2 hover:bg-gray-50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-grape-soft text-grape" aria-hidden>
                  <UsersRound className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-lg font-semibold leading-snug text-ink">{t.nome}</h2>
                  <p className="text-sm text-ink-soft">Professor {t.professor?.nome ?? "—"}</p>
                </div>
                <ChevronRight aria-hidden className="mt-1 h-5 w-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
              </Link>
              {t.descricao && <p className="mt-3 line-clamp-3 text-sm text-ink-soft">{t.descricao}</p>}
              <div className="mt-4 flex gap-2 border-t border-line pt-4">
                <Link href={`/aluno/turmas/${t.id}`} className={classeBotao("primario", "flex-1")}>
                  Abrir turma
                </Link>
                <Link href={`/aluno/materiais?turma=${t.id}`} className={classeBotao("secundario")}>
                  <FolderOpen aria-hidden className="h-4 w-4" />
                  Materiais
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
