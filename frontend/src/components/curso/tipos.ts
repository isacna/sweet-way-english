import type { ConteudoExercicio, Resposta, Resultado } from "@/lib/curso";

/** Interface comum dos renderizadores de exercício (um componente por `tipo`). */
export type PropsRenderizador<T extends ConteudoExercicio["tipo"]> = {
  /** Usado para gerar ids únicos de campos (acessibilidade). */
  id: number;
  conteudo: Extract<ConteudoExercicio, { tipo: T }>["conteudo"];
  value: Resposta | undefined;
  onChange: (valor: Resposta) => void;
  disabled?: boolean;
  /** Correção já recebida — os renderizadores podem destacar acerto/erro. */
  feedback?: Resultado | null;
  /** Chamado com Enter nos campos de texto, quando faz sentido enviar. */
  onSubmit?: () => void;
};
