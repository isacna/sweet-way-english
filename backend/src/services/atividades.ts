// Atividades das turmas (com anexo opcional da professora).
import { prisma } from '../database/client.js';
import { arquivoResumoSelect } from '../http/arquivoPublico.js';
import { apagarArquivos, removerDoDisco } from '../storage/arquivos.js';
import { ErroNaoEncontrado, ErroProibido, ErroValidacao } from './erros.js';
import { garantirAcessoTurma } from './turmas.js';
import type { GravarAnexo, UsuarioSessao } from './tipos.js';

const incluirArquivo = { arquivo: { select: arquivoResumoSelect } } as const;

export interface NovaAtividade {
  titulo: string;
  descricao: string;
  dataEntrega: Date;
  arquivoObrigatorio: boolean;
  link: string | null;
}

export async function criarAtividade(professorId: number, turmaId: number, dados: NovaAtividade, anexo: GravarAnexo | null) {
  const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId } });
  if (!turma) throw new ErroNaoEncontrado('Turma não encontrada');

  const data = { ...dados, turmaId };
  return anexo
    ? anexo((tx, a) => tx.atividade.create({ data: { ...data, arquivoId: a.id }, include: incluirArquivo }))
    : prisma.atividade.create({ data, include: incluirArquivo });
}

export interface EdicaoAtividade {
  titulo?: string;
  descricao?: string;
  dataEntrega?: Date;
  arquivoObrigatorio?: boolean;
  /** null tira o link */
  link?: string | null;
  removerArquivo?: boolean;
}

/** Atualiza; um anexo novo substitui o anterior e `removerArquivo` tira o anexo (o arquivo sai do disco). */
export async function atualizarAtividade(professorId: number, id: number, edicao: EdicaoAtividade, anexo: GravarAnexo | null) {
  const existente = await prisma.atividade.findUnique({
    where: { id },
    include: { turma: { select: { professorId: true } } },
  });
  if (!existente) throw new ErroNaoEncontrado('Atividade não encontrada');
  if (existente.turma.professorId !== professorId) throw new ErroProibido();

  const { removerArquivo, ...data } = edicao;
  const tirarAnexo = !anexo && !!removerArquivo && !!existente.arquivoId;
  if (Object.keys(data).length === 0 && !anexo && !tirarAnexo) {
    throw new ErroValidacao('Envie titulo, descricao, dataEntrega, arquivoObrigatorio, link e/ou arquivo');
  }

  let descartar: string[] = [];
  const atividade = anexo
    ? await anexo(async (tx, a) => {
        const r = await tx.atividade.update({ where: { id }, data: { ...data, arquivoId: a.id }, include: incluirArquivo });
        descartar = await apagarArquivos(tx, [existente.arquivoId]);
        return r;
      })
    : await prisma.$transaction(async (tx) => {
        const r = await tx.atividade.update({
          where: { id },
          data: tirarAnexo ? { ...data, arquivoId: null } : data,
          include: incluirArquivo,
        });
        if (tirarAnexo) descartar = await apagarArquivos(tx, [existente.arquivoId]);
        return r;
      });
  await removerDoDisco(descartar);
  return atividade;
}

/** Atividades da turma; o aluno vê só as próprias entregas (com feedback), a professora vê todas. */
export async function listarAtividades(usuario: UsuarioSessao, turmaId: number) {
  await garantirAcessoTurma(usuario, turmaId);

  const submissoes =
    usuario.role === 'aluno'
      ? {
          where: { alunoId: usuario.id },
          include: {
            aluno: { select: { nome: true } },
            feedback: { include: { professor: { select: { nome: true } } } },
            ...incluirArquivo,
          },
          orderBy: { dataEnvio: 'desc' as const },
        }
      : {
          include: { aluno: { select: { nome: true } }, ...incluirArquivo },
          orderBy: { dataEnvio: 'desc' as const },
        };

  return prisma.atividade.findMany({
    where: { turmaId },
    include: { submissoes, ...incluirArquivo },
  });
}
