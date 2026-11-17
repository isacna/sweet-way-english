"use client";

import { useMemo, useState } from "react";
import { rotuloEtapa, type Etapa, type TipoExercicio } from "@/lib/curso";
import {
  MARCADOR_LACUNA,
  ORDEM_ETAPAS,
  TIPOS,
  DITADO_MAX_PALAVRAS,
  avisosExercicio,
  contarLacunas,
  exercicioParaPayload,
  montarMatch,
  palavrasDoBanco,
  rotuloTipo,
  type ExercicioForm,
} from "./formulario";
import { EditorMidia, novaMidia } from "./EditorMidia";
import { BotaoOuvir } from "../curso/BotaoOuvir";
import { TestarExercicio } from "./TestarExercicio";
import { CaixaGabarito, Campo, classeBotaoLink, classeInput } from "./ui";

type Props = {
  numero: number;
  valor: ExercicioForm;
  onChange: (v: ExercicioForm) => void;
  onRemover: () => void;
  onSubir?: () => void;
  onDescer?: () => void;
};

export function EditorExercicio({ numero, valor, onChange, onRemover, onSubir, onDescer }: Props) {
  const [testando, setTestando] = useState(false);
  const [aberto, setAberto] = useState(!valor.id);
  const set = <K extends keyof ExercicioForm>(k: K, v: ExercicioForm[K]) => onChange({ ...valor, [k]: v });
  const payload = useMemo(() => exercicioParaPayload(valor), [valor]);
  const avisos = useMemo(() => avisosExercicio(valor), [valor]);
  const idBase = `ex-${valor.chave}`;

  return (
    <article className="rounded-2xl border border-line bg-card shadow-sm">
      <header className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-line">
        <span className="text-xs font-semibold text-ink-soft">#{numero}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
          {rotuloTipo[valor.tipo]}
        </span>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="flex-1 min-w-0 text-left text-sm font-medium text-ink truncate hover:text-accent"
          aria-expanded={aberto}
        >
          {valor.enunciado || <span className="text-ink-soft italic">(sem enunciado)</span>}
        </button>
        {avisos.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-sun-soft text-sun-ink">
            {avisos.length} pendência{avisos.length > 1 ? "s" : ""}
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSubir}
            disabled={!onSubir}
            className="px-2 py-1 rounded text-sm hover:bg-gray-100 disabled:opacity-30"
            aria-label="Mover para cima"
            title="Mover para cima"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onDescer}
            disabled={!onDescer}
            className="px-2 py-1 rounded text-sm hover:bg-gray-100 disabled:opacity-30"
            aria-label="Mover para baixo"
            title="Mover para baixo"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            className="px-2 py-1 rounded text-xs font-medium text-accent hover:bg-gray-100"
          >
            {aberto ? "Recolher" : "Editar"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Remover este exercício? A remoção vale ao salvar a lição.")) onRemover();
            }}
            className="px-2 py-1 rounded text-xs font-medium text-danger-ink hover:bg-danger-soft"
          >
            Remover
          </button>
        </div>
      </header>

      {aberto && (
        <div className="p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Etapa" htmlFor={`${idBase}-etapa`}>
              <select
                id={`${idBase}-etapa`}
                value={valor.etapa}
                onChange={(e) => set("etapa", e.target.value as Etapa)}
                className={classeInput}
              >
                {ORDEM_ETAPAS.map((e) => (
                  <option key={e} value={e}>
                    {rotuloEtapa[e]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Tipo" htmlFor={`${idBase}-tipo`}>
              <select
                id={`${idBase}-tipo`}
                value={valor.tipo}
                onChange={(e) => set("tipo", e.target.value as TipoExercicio)}
                className={classeInput}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {rotuloTipo[t]}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo rotulo="Enunciado" htmlFor={`${idBase}-enunciado`} dica="Instrução mostrada ao aluno.">
            <input
              id={`${idBase}-enunciado`}
              value={valor.enunciado}
              onChange={(e) => set("enunciado", e.target.value)}
              className={classeInput}
            />
          </Campo>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Mídia para esta atividade</legend>
            {valor.tipo === "dictation" ? <p className="text-xs text-ink-soft">O ditado não usa mídia: a frase é falada pela voz do navegador do aluno.</p> : valor.midia ? <><EditorMidia valor={valor.midia} onChange={(v) => set("midia", v)} /><button type="button" className={classeBotaoLink} onClick={() => set("midia", undefined)}>Remover mídia</button></> : <button type="button" className={classeBotaoLink} onClick={() => set("midia", novaMidia())}>+ Adicionar áudio, vídeo ou música</button>}
          </fieldset>

          <FormularioTipo valor={valor} onChange={onChange} idBase={idBase} />

          <Campo
            rotulo="Explicação"
            htmlFor={`${idBase}-explicacao`}
            dica="Feedback em português mostrado ao aluno depois que ele responde."
          >
            <textarea
              id={`${idBase}-explicacao`}
              rows={2}
              value={valor.explicacao}
              onChange={(e) => set("explicacao", e.target.value)}
              className={classeInput}
            />
          </Campo>

          <Campo
            rotulo="Tags de erro (opcional)"
            htmlFor={`${idBase}-tags`}
            dica="Separadas por vírgula, ex.: verbo-to-be, terceira-pessoa."
          >
            <input
              id={`${idBase}-tags`}
              value={valor.tagsErro}
              onChange={(e) => set("tagsErro", e.target.value)}
              className={classeInput}
            />
          </Campo>

          {avisos.length > 0 && (
            <ul className="text-xs text-sun-ink bg-sun-soft border border-sun/40 rounded-lg px-3 py-2 list-disc list-inside">
              {avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}

          <div>
            {testando ? (
              <TestarExercicio key={valor.tipo} item={payload} />
            ) : (
              <button type="button" onClick={() => setTestando(true)} className={classeBotaoLink}>
                Testar este exercício
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function FormularioTipo({
  valor,
  onChange,
  idBase,
}: {
  valor: ExercicioForm;
  onChange: (v: ExercicioForm) => void;
  idBase: string;
}) {
  const set = <K extends keyof ExercicioForm>(k: K, v: ExercicioForm[K]) => onChange({ ...valor, [k]: v });

  switch (valor.tipo) {
    case "sequence":
      return <Campo rotulo="Acontecimentos ou falas na ordem correta" dica="De 3 a 8 trechos, um por linha. O aluno ver? os trechos embaralhados."><textarea aria-label="Acontecimentos na ordem correta" rows={6} className={classeInput} value={valor.palavras} onChange={(e) => set("palavras", e.target.value)} /></Campo>;
    case "mcq":
      return (
        <div className="space-y-3">
          <Campo
            rotulo="Texto de apoio (opcional)"
            htmlFor={`${idBase}-apoio`}
            dica="Frase ou trecho que acompanha a pergunta (ex.: leitura)."
          >
            <textarea
              id={`${idBase}-apoio`}
              rows={2}
              value={valor.textoApoio}
              onChange={(e) => set("textoApoio", e.target.value)}
              className={classeInput}
            />
          </Campo>
          <CaixaGabarito titulo="Opções (marque a correta)">
            {valor.opcoes.map((o, i) => {
              const certa = valor.correta === i;
              return (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${idBase}-correta`}
                    checked={certa}
                    onChange={() => set("correta", i)}
                    aria-label={`Opção ${i + 1} é a correta`}
                  />
                  <input
                    aria-label={`Opção ${i + 1}`}
                    value={o}
                    onChange={(e) =>
                      set(
                        "opcoes",
                        valor.opcoes.map((x, j) => (j === i ? e.target.value : x))
                      )
                    }
                    className={`${classeInput} ${certa ? "border-success bg-success-soft font-medium" : ""}`}
                  />
                  {certa && <span className="text-xs font-semibold text-success-ink shrink-0">Correta</span>}
                  <button
                    type="button"
                    disabled={valor.opcoes.length <= 2}
                    onClick={() => {
                      const opcoes = valor.opcoes.filter((_, j) => j !== i);
                      const correta =
                        valor.correta === i ? 0 : valor.correta > i ? valor.correta - 1 : valor.correta;
                      onChange({ ...valor, opcoes, correta });
                    }}
                    className="shrink-0 px-2 text-sm text-danger-ink disabled:opacity-30"
                    aria-label={`Remover opção ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {valor.opcoes.length < 5 && (
              <button
                type="button"
                onClick={() => set("opcoes", [...valor.opcoes, ""])}
                className={classeBotaoLink}
              >
                + Adicionar opção
              </button>
            )}
          </CaixaGabarito>
        </div>
      );

    case "cloze": {
      const n = contarLacunas(valor.textoCloze);
      const setLacuna = (campo: "respostasLacunas" | "opcoesLacunas", i: number, v: string) => {
        const arr = Array.from({ length: Math.max(n, valor[campo].length) }, (_, j) => valor[campo][j] ?? "");
        arr[i] = v;
        set(campo, arr);
      };
      return (
        <div className="space-y-3">
          <Campo
            rotulo="Texto com lacunas"
            htmlFor={`${idBase}-cloze`}
            dica={`Marque cada lacuna com ${MARCADOR_LACUNA} (três sublinhados). Lacunas encontradas: ${n}.`}
          >
            <textarea
              id={`${idBase}-cloze`}
              rows={2}
              value={valor.textoCloze}
              onChange={(e) => set("textoCloze", e.target.value)}
              className={classeInput}
            />
          </Campo>
          <label className="inline-flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={valor.usarOpcoesLacuna}
              onChange={(e) => set("usarOpcoesLacuna", e.target.checked)}
            />
            Mostrar lista de opções em cada lacuna (em vez de campo livre)
          </label>
          {n === 0 ? (
            <p className="text-xs text-ink-soft">Adicione {MARCADOR_LACUNA} no texto para configurar as respostas.</p>
          ) : (
            Array.from({ length: n }, (_, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-2">
                <CaixaGabarito titulo={`Lacuna ${i + 1}: respostas aceitas`}>
                  <textarea
                    aria-label={`Respostas aceitas da lacuna ${i + 1}`}
                    rows={2}
                    placeholder="Uma por linha"
                    value={valor.respostasLacunas[i] ?? ""}
                    onChange={(e) => setLacuna("respostasLacunas", i, e.target.value)}
                    className={classeInput}
                  />
                </CaixaGabarito>
                {valor.usarOpcoesLacuna && (
                  <Campo rotulo={`Lacuna ${i + 1}: opções`} dica="Uma por linha, incluindo a correta.">
                    <textarea
                      aria-label={`Opções da lacuna ${i + 1}`}
                      rows={3}
                      value={valor.opcoesLacunas[i] ?? ""}
                      onChange={(e) => setLacuna("opcoesLacunas", i, e.target.value)}
                      className={classeInput}
                    />
                  </Campo>
                )}
              </div>
            ))
          )}
        </div>
      );
    }

    case "word_order": {
      const palavras = palavrasDoBanco(valor.palavras);
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            rotulo="Banco de palavras"
            htmlFor={`${idBase}-palavras`}
            dica="Uma por linha (ou todas numa linha, separadas por espaço). Aparecem para o aluno nesta ordem."
          >
            <textarea
              id={`${idBase}-palavras`}
              rows={4}
              value={valor.palavras}
              onChange={(e) => set("palavras", e.target.value)}
              className={classeInput}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {palavras.map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-100">
                  {p}
                </span>
              ))}
            </div>
            {palavras.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const embaralhadas = [...palavras];
                  for (let i = embaralhadas.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [embaralhadas[i], embaralhadas[j]] = [embaralhadas[j], embaralhadas[i]];
                  }
                  set("palavras", embaralhadas.join("\n"));
                }}
                className={`${classeBotaoLink} mt-2`}
              >
                Embaralhar
              </button>
            )}
          </Campo>
          <CaixaGabarito titulo="Frases aceitas">
            <textarea
              aria-label="Frases aceitas"
              rows={4}
              placeholder="Uma por linha"
              value={valor.aceitas}
              onChange={(e) => set("aceitas", e.target.value)}
              className={classeInput}
            />
            <p className="text-xs text-ink-soft">Cada frase precisa usar exatamente as palavras do banco.</p>
          </CaixaGabarito>
        </div>
      );
    }

    case "match": {
      const montado = montarMatch(valor.pares);
      const atualizar = (i: number, campo: "esquerda" | "direita", v: string) =>
        set(
          "pares",
          valor.pares.map((p, j) => (j === i ? { ...p, [campo]: v } : p))
        );
      return (
        <div className="space-y-3">
          <CaixaGabarito titulo="Pares corretos (esquerda ↔ direita)">
            {valor.pares.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
                <input
                  aria-label={`Esquerda ${i + 1}`}
                  value={p.esquerda}
                  onChange={(e) => atualizar(i, "esquerda", e.target.value)}
                  className={classeInput}
                />
                <span aria-hidden className="text-success-ink">
                  ↔
                </span>
                <input
                  aria-label={`Direita ${i + 1}`}
                  value={p.direita}
                  onChange={(e) => atualizar(i, "direita", e.target.value)}
                  className={classeInput}
                />
                <button
                  type="button"
                  disabled={valor.pares.length <= 2}
                  onClick={() => set("pares", valor.pares.filter((_, j) => j !== i))}
                  className="px-2 text-sm text-danger-ink disabled:opacity-30"
                  aria-label={`Remover par ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
            {valor.pares.length < 8 && (
              <button
                type="button"
                onClick={() => set("pares", [...valor.pares, { esquerda: "", direita: "" }])}
                className={classeBotaoLink}
              >
                + Adicionar par
              </button>
            )}
          </CaixaGabarito>
          {montado.direita.length > 0 && (
            <p className="text-xs text-ink-soft">
              A coluna da direita é embaralhada automaticamente ao salvar. Ordem que o aluno verá:{" "}
              {montado.direita.join(" · ")}
            </p>
          )}
        </div>
      );
    }

    case "translate":
    case "error_correction": {
      const traducao = valor.tipo === "translate";
      return (
        <div className="space-y-3">
          <div className={traducao ? "grid gap-3 sm:grid-cols-[1fr_12rem]" : ""}>
            <Campo
              rotulo={traducao ? "Frase para traduzir" : "Frase com erro"}
              htmlFor={`${idBase}-frase`}
              dica={traducao ? undefined : "A frase que o aluno deve corrigir (com um erro)."}
            >
              <input
                id={`${idBase}-frase`}
                value={valor.frase}
                onChange={(e) => set("frase", e.target.value)}
                className={classeInput}
              />
            </Campo>
            {traducao && (
              <Campo rotulo="Direção" htmlFor={`${idBase}-direcao`}>
                <select
                  id={`${idBase}-direcao`}
                  value={valor.direcao}
                  onChange={(e) => set("direcao", e.target.value as "pt-en" | "en-pt")}
                  className={classeInput}
                >
                  <option value="pt-en">Português → Inglês</option>
                  <option value="en-pt">Inglês → Português</option>
                </select>
              </Campo>
            )}
          </div>
          <CaixaGabarito titulo={traducao ? "Traduções aceitas" : "Correções aceitas"}>
            <textarea
              aria-label={traducao ? "Traduções aceitas" : "Correções aceitas"}
              rows={3}
              placeholder="Uma por linha"
              value={valor.aceitas}
              onChange={(e) => set("aceitas", e.target.value)}
              className={classeInput}
            />
            <p className="text-xs text-ink-soft">
              Maiúsculas, pontuação final e contrações (isn&apos;t = is not) já são equivalentes. Outras variações
              precisam estar listadas.
            </p>
          </CaixaGabarito>
        </div>
      );
    }

    case "dictation":
      return (
        <div className="space-y-3">
          <Campo
            rotulo="Frase falada (em inglês)"
            htmlFor={`${idBase}-frase`}
            dica={`Curta (até ${DITADO_MAX_PALAVRAS} palavras) e já ensinada na lição. O aluno só ouve: a frase não aparece escrita antes da resposta. Números por extenso.`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={`${idBase}-frase`}
                lang="en"
                value={valor.frase}
                onChange={(e) => set("frase", e.target.value)}
                className={`${classeInput} min-w-0 flex-1`}
              />
              {valor.frase.trim() && <BotaoOuvir texto={valor.frase.trim()} comLento />}
            </div>
          </Campo>
          <Campo
            rotulo="Dica (opcional)"
            htmlFor={`${idBase}-dica`}
            dica="Em português, mostrada junto do campo de resposta. Não pode conter a frase."
          >
            <input
              id={`${idBase}-dica`}
              value={valor.dica}
              onChange={(e) => set("dica", e.target.value)}
              className={classeInput}
            />
          </Campo>
          <CaixaGabarito titulo="Respostas aceitas">
            <textarea
              aria-label="Respostas aceitas"
              rows={3}
              placeholder="Uma por linha. Em branco, vale a própria frase falada."
              value={valor.aceitas}
              onChange={(e) => set("aceitas", e.target.value)}
              className={classeInput}
            />
            <p className="text-xs text-ink-soft">
              A frase falada precisa ser aceita. Maiúsculas, pontuação final e contrações (isn&apos;t = is not) já são
              equivalentes; liste o resto, como vírgulas opcionais e números em algarismos (eighteen / 18).
            </p>
          </CaixaGabarito>
          <p className="text-xs text-ink-soft">
            O ditado só vale na prática (não entra no mini-quiz nem em teste de módulo) e o aluno pode pulá-lo se o
            navegador não tiver voz em inglês.
          </p>
        </div>
      );
  }
}
