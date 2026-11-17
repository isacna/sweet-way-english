"use client";

import type { ItemRenderizavel, Resposta, Resultado } from "@/lib/curso";
import { MidiaLicao } from "./MidiaLicao";
import { ExercicioSequence } from "./ExercicioSequence";
import { ExercicioCloze } from "./ExercicioCloze";
import { ExercicioDictation } from "./ExercicioDictation";
import { ExercicioMatch } from "./ExercicioMatch";
import { ExercicioMcq } from "./ExercicioMcq";
import { ExercicioTexto } from "./ExercicioTexto";
import { ExercicioWordOrder } from "./ExercicioWordOrder";

type Props = {
  item: ItemRenderizavel;
  value: Resposta | undefined;
  onChange: (valor: Resposta) => void;
  disabled?: boolean;
  feedback?: Resultado | null;
  onSubmit?: () => void;
  /** Prefixo do enunciado, ex.: "3." no quiz. */
  numero?: string;
  /** Deixa o aluno pular um item que o navegador não consegue tocar (ditado sem voz em inglês). */
  onPular?: () => void;
};

/** Enunciado + renderizador do tipo certo. Usado na prática, no quiz, na revisão e no teste. */
export function Exercicio({ item, value, onChange, disabled, feedback, onSubmit, numero, onPular }: Props) {
  const comum = { id: item.id, value, onChange, disabled, feedback, onSubmit };
  let corpo: React.ReactNode;
  switch (item.tipo) {
    case "sequence":
      corpo = <ExercicioSequence {...comum} conteudo={item.conteudo} />;
      break;
    case "mcq":
      corpo = <ExercicioMcq {...comum} conteudo={item.conteudo} />;
      break;
    case "cloze":
      corpo = <ExercicioCloze {...comum} conteudo={item.conteudo} />;
      break;
    case "word_order":
      corpo = <ExercicioWordOrder {...comum} conteudo={item.conteudo} />;
      break;
    case "match":
      corpo = <ExercicioMatch {...comum} conteudo={item.conteudo} />;
      break;
    case "translate":
      corpo = <ExercicioTexto {...comum} tipo="translate" conteudo={item.conteudo} />;
      break;
    case "error_correction":
      corpo = <ExercicioTexto {...comum} tipo="error_correction" conteudo={item.conteudo} />;
      break;
    case "dictation":
      corpo = <ExercicioDictation {...comum} conteudo={item.conteudo} onPular={onPular} />;
      break;
  }
  return (
    <div className="space-y-5">
      <p id={`enunciado-${item.id}`} className="break-words font-display text-xl font-medium leading-snug text-ink sm:text-[1.35rem]">
        {numero && <span className="mr-1.5 text-grape">{numero}</span>}
        {item.enunciado}
      </p>
      {item.conteudo.midia && <MidiaLicao key={item.id} midia={item.conteudo.midia} />}
      {corpo}
    </div>
  );
}
