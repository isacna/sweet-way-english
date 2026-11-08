import type { TomSelo } from "@/components/painel/ui";
import type { Entrega, StatusEntrega } from "./tipos";

/** Selo da entrega na visão da professora. */
export function seloEntregaProfessora(status: StatusEntrega | string): { rotulo: string; tom: TomSelo } {
  switch (status) {
    case "pendente":
      return { rotulo: "Para corrigir", tom: "sol" };
    case "corrigido":
      return { rotulo: "Corrigida com nota", tom: "accent" };
    case "aprovado":
      return { rotulo: "Aprovada", tom: "sucesso" };
    case "reprovado":
      return { rotulo: "Reprovada", tom: "perigo" };
    default:
      return { rotulo: status, tom: "neutro" };
  }
}

export type SituacaoAluno = "a-entregar" | "enviada" | "corrigida" | "aprovada" | "reprovada";

/** Situação da atividade para o aluno, a partir das entregas dele (a mais recente vem primeiro na API). */
export function situacaoAluno(submissoes: Pick<Entrega, "status">[] | undefined): {
  chave: SituacaoAluno;
  rotulo: string;
  tom: TomSelo;
} {
  const ultima = submissoes?.[0];
  if (!ultima) return { chave: "a-entregar", rotulo: "A entregar", tom: "chama" };
  switch (ultima.status) {
    case "corrigido":
      return { chave: "corrigida", rotulo: "Corrigida", tom: "accent" };
    case "aprovado":
      return { chave: "aprovada", rotulo: "Aprovada", tom: "sucesso" };
    case "reprovado":
      return { chave: "reprovada", rotulo: "Refazer", tom: "perigo" };
    default:
      return { chave: "enviada", rotulo: "Aguardando correção", tom: "sol" };
  }
}

/** O aluno só envia de novo depois de uma reprovação (regra do backend). */
export function podeEnviar(submissoes: Pick<Entrega, "status">[] | undefined) {
  const ultima = submissoes?.[0];
  return !ultima || ultima.status === "reprovado";
}

/** "12/11 às 19:00" */
export function dataHoraCurta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const outroAno = d.getFullYear() !== new Date().getFullYear();
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", ...(outroAno && { year: "numeric" }) });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora}`;
}

/** Prazo com texto relativo: "vence hoje", "vence em 3 dias", "encerrado há 2 dias". */
export function prazo(iso: string): { texto: string; relativo: string; vencido: boolean; proximo: boolean } {
  const fim = new Date(iso).getTime();
  const agora = Date.now();
  const diff = fim - agora;
  const dia = 86_400_000;
  const vencido = diff < 0;
  let relativo: string;
  if (vencido) {
    const dias = Math.floor(-diff / dia);
    relativo = dias === 0 ? "encerrado hoje" : dias === 1 ? "encerrado ontem" : `encerrado há ${dias} dias`;
  } else {
    const dias = Math.floor(diff / dia);
    relativo = dias === 0 ? "vence hoje" : dias === 1 ? "vence amanhã" : `vence em ${dias} dias`;
  }
  return { texto: dataHoraCurta(iso), relativo, vencido, proximo: !vencido && diff < 2 * dia };
}
