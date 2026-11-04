import {
  BookOpenCheck,
  ChartNoAxesColumnIncreasing,
  FolderOpen,
  GraduationCap,
  LayoutGrid,
  MessageSquareText,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/** Ícones das navegações (aluno e professora). */
export const iconesNav: Record<string, LucideIcon> = {
  painel: LayoutGrid,
  curso: GraduationCap,
  turmas: UsersRound,
  alunos: UserRound,
  feedbacks: MessageSquareText,
  materiais: FolderOpen,
  conteudo: BookOpenCheck,
  progresso: ChartNoAxesColumnIncreasing,
};
