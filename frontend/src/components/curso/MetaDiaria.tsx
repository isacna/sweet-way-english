"use client";

import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { AcoesDialogo, Dialogo } from "@/components/painel/Dialogo";
import { CaixaMarcar, classeBotao, Contagem, Mensagem } from "@/components/painel/ui";
import type { PerfilAprendiz } from "@/lib/curso";
import { METAS_DIARIAS, salvarPerfil } from "@/lib/trilha";

/** As três opções de meta como botões de rádio grandes. Usado nas boas-vindas e no ajuste da meta. */
export function EscolhaMeta({
  valor,
  onChange,
  nome = "meta-diaria",
}: {
  valor: number;
  onChange: (xp: number) => void;
  nome?: string;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Meta diária</legend>
      <div className="grid gap-2.5">
        {METAS_DIARIAS.map((m) => {
          const ativo = valor === m.xp;
          return (
            <label
              key={m.xp}
              className={`flex min-h-[64px] cursor-pointer items-center gap-3.5 rounded-2xl border-2 px-4 py-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-grape-bright ${
                ativo ? "border-grape bg-grape-soft" : "border-line bg-card hover:border-line-strong"
              }`}
            >
              <input type="radio" name={nome} value={m.xp} checked={ativo} onChange={() => onChange(m.xp)} className="sr-only" />
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  ativo ? "border-grape bg-grape text-white" : "border-line-strong"
                }`}
              >
                {ativo && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{m.nome}</span>
                <span className="block text-sm text-ink-soft">{m.detalhe}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-soft">{m.xp} XP</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Anel de progresso (0 a 1). */
function Anel({ fracao, tamanho = 36 }: { fracao: number; tamanho?: number }) {
  const r = (tamanho - 6) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fracao));
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden className="-rotate-90">
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" strokeWidth={5} className="stroke-gray-200" />
      <circle
        cx={tamanho / 2}
        cy={tamanho / 2}
        r={r}
        fill="none"
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - f)}
        className={`transition-[stroke-dashoffset] duration-700 ease-out ${f >= 1 ? "stroke-success-bright" : "stroke-sun"}`}
      />
    </svg>
  );
}

/** Cartão "Meta de hoje" do painel do aluno, com o ajuste da meta em um diálogo. */
export function CartaoMeta({ perfil, ordem = 0 }: { perfil: PerfilAprendiz | null; ordem?: number }) {
  const [aberto, setAberto] = useState(false);
  const [escolha, setEscolha] = useState(30);
  const [lembretes, setLembretes] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const meta = perfil?.metaDiariaXp ?? 30;
  const hoje = perfil?.xpHoje ?? 0;
  const batida = perfil !== null && hoje >= meta;

  async function salvar() {
    setSalvando(true);
    setErro("");
    const ok = await salvarPerfil({ metaDiariaXp: escolha, lembretesEmail: lembretes });
    setSalvando(false);
    if (ok) setAberto(false);
    else setErro("Não foi possível salvar. Tente de novo.");
  }

  return (
    <>
      <div className="card animate-pop-in p-4 sm:p-5" style={{ animationDelay: `${ordem * 70}ms` }}>
        <div className="mb-3 flex items-start justify-between">
          <Anel fracao={perfil ? hoje / meta : 0} />
          <button
            type="button"
            onClick={() => {
              setEscolha(meta);
              setLembretes(perfil?.lembretesEmail ?? false);
              setErro("");
              setAberto(true);
            }}
            disabled={!perfil}
            aria-label="Ajustar a meta diária"
            title="Ajustar a meta diária"
            className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink-faint hover:bg-gray-100 hover:text-ink disabled:opacity-50"
          >
            <SlidersHorizontal aria-hidden className="h-[18px] w-[18px]" />
          </button>
        </div>
        <p className="text-[1.7rem] font-semibold leading-none tabular-nums tracking-[-0.03em] text-ink sm:text-[2rem]">
          {perfil ? <Contagem valor={hoje} /> : "…"}
          <span className="text-base font-medium tracking-normal text-ink-faint sm:text-lg"> / {meta} XP</span>
        </p>
        <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">Meta de hoje</p>
        {perfil && (
          <p className={`mt-0.5 text-xs leading-snug ${batida ? "font-semibold text-success-ink" : "text-ink-soft"}`}>
            {batida ? "Meta batida!" : `Faltam ${meta - hoje} XP`} · {perfil.xp.toLocaleString("pt-BR")} XP no total
          </p>
        )}
      </div>

      {/* Fora do cartão: a animação de entrada dele prenderia o diálogo (position: fixed) dentro do cartão */}
      {aberto && (
        <Dialogo
          titulo="Meta diária"
          descricao="Quanto você quer estudar por dia? Dá para mudar a meta e os lembretes quando quiser."
          onFechar={() => setAberto(false)}
          largura="max-w-md"
          bloquearFechar={salvando}
        >
          <EscolhaMeta valor={escolha} onChange={setEscolha} nome="meta-diaria-ajuste" />
          <div className="mt-4">
            <CaixaMarcar id="lembretes-meta-diaria" checked={lembretes} onChange={setLembretes}>
              Quero receber lembretes de estudo por e-mail
              <span className="mt-0.5 block text-ink-soft">
                No máximo um por dia, e só quando você ficar sem estudar.
              </span>
            </CaixaMarcar>
          </div>
          {erro && (
            <Mensagem tom="erro" className="mt-4">
              {erro}
            </Mensagem>
          )}
          <AcoesDialogo>
            <button type="button" onClick={() => setAberto(false)} disabled={salvando} className={classeBotao("secundario")}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando}
              aria-busy={salvando}
              className={classeBotao("primario")}
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </AcoesDialogo>
        </Dialogo>
      )}
    </>
  );
}
