// Conquistas do aprendiz (funções puras, sem banco). Nada é gravado: a lista é derivada do que já existe
// (perfil, lições concluídas, testes aprovados), então nunca fica fora de sincronia com o progresso.
// Quem monta os dados conta só conteúdo publicado.

export interface NivelDoAluno {
  codigo: string; // "A1"
  nome: string;
  /** Módulos publicados do nível. */
  totalModulos: number;
  /** Módulos publicados do nível com teste aprovado. */
  modulosAprovados: number;
}

export interface DadosConquistas {
  xp: number;
  ofensivaMaxima: number;
  licoesConcluidas: number;
  /** Lições cujo melhor quiz foi 100%. */
  licoesNotaMaxima: number;
  /** Só níveis com módulos publicados, na ordem da trilha. */
  niveis: NivelDoAluno[];
}

export interface Conquista {
  id: string;
  titulo: string;
  descricao: string;
  obtida: boolean;
  /** Só nas conquistas de contagem (alvo > 1); `atual` nunca passa de `alvo`. */
  progresso?: { atual: number; alvo: number };
}

/** Nível concluído: tem módulos publicados e o teste de todos eles foi aprovado. */
export function nivelConcluido(nivel: { totalModulos: number; modulosAprovados: number }): boolean {
  return nivel.totalModulos > 0 && nivel.modulosAprovados >= nivel.totalModulos;
}

function contagem(id: string, titulo: string, descricao: string, valor: number, alvo: number): Conquista {
  const atual = Math.max(0, Math.min(Math.floor(valor), alvo));
  return { id, titulo, descricao, obtida: atual >= alvo, ...(alvo > 1 ? { progresso: { atual, alvo } } : {}) };
}

/** Lista fixa, da mais fácil para a mais difícil dentro de cada grupo; uma conquista por nível no fim. */
export function calcularConquistas(d: DadosConquistas): Conquista[] {
  const modulosAprovados = d.niveis.reduce((s, n) => s + n.modulosAprovados, 0);

  return [
    contagem('primeira-licao', 'Primeiro passo', 'Conclua sua primeira lição.', d.licoesConcluidas, 1),
    contagem('dez-licoes', 'Ritmo de estudo', 'Conclua 10 lições.', d.licoesConcluidas, 10),
    contagem('quiz-perfeito', 'Nota máxima', 'Acerte 100% do quiz de uma lição.', d.licoesNotaMaxima, 1),
    contagem('primeiro-modulo', 'Módulo vencido', 'Passe no teste de um módulo.', modulosAprovados, 1),
    contagem('ofensiva-3', 'Três dias seguidos', 'Estude 3 dias seguidos.', d.ofensivaMaxima, 3),
    contagem('ofensiva-7', 'Uma semana inteira', 'Estude 7 dias seguidos.', d.ofensivaMaxima, 7),
    contagem('ofensiva-30', 'Um mês sem falhar', 'Estude 30 dias seguidos.', d.ofensivaMaxima, 30),
    contagem('xp-500', '500 XP', 'Some 500 XP no curso.', d.xp, 500),
    contagem('xp-2000', '2.000 XP', 'Some 2.000 XP no curso.', d.xp, 2000),
    ...d.niveis
      .filter((n) => n.totalModulos > 0)
      .map((n) =>
        contagem(
          `nivel-${n.codigo.toLowerCase()}`,
          `Nível ${n.codigo} completo`,
          `Passe no teste de todos os módulos do nível ${n.nome.includes(n.codigo) ? n.nome : `${n.codigo} — ${n.nome}`}.`,
          n.modulosAprovados,
          n.totalModulos,
        ),
      ),
  ];
}
