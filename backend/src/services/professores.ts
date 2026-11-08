// Professores: o próprio perfil e a gestão pelo admin (criar, editar, excluir, promover aluno).
import bcrypt from 'bcryptjs';
import { prisma } from '../database/client.js';
import { apagarArquivos, idsArquivosDasTurmas, removerDoDisco } from '../storage/arquivos.js';
import { ehErroPrisma, ErroNaoEncontrado, ErroValidacao } from './erros.js';

export interface EdicaoPerfil {
  nome?: string;
  email?: string;
  senha?: string;
}

const perfilSelect = { id: true, nome: true, email: true, criadoEm: true } as const;

/** Monta o `data` do update; senha nova incrementa `versaoToken` (derruba as sessões abertas com a antiga). */
async function dadosDaEdicao(edicao: EdicaoPerfil) {
  const data: { nome?: string; email?: string; senha?: string; versaoToken?: { increment: number } } = {};
  if (edicao.nome !== undefined) data.nome = edicao.nome;
  if (edicao.email !== undefined) data.email = edicao.email;
  if (edicao.senha !== undefined) {
    data.senha = await bcrypt.hash(edicao.senha, 10);
    data.versaoToken = { increment: 1 };
  }
  if (Object.keys(data).length === 0) throw new ErroValidacao('Envie ao menos um campo: nome, email ou senha');
  return data;
}

export async function perfil(id: number) {
  const professor = await prisma.usuario.findUnique({ where: { id }, select: perfilSelect });
  if (!professor) throw new ErroNaoEncontrado('Professor não encontrado');
  return professor;
}

/**
 * Atualiza o próprio perfil. Devolve também `sessao` quando a senha mudou: o controller emite um cookie novo
 * para que esta sessão continue valendo (as outras caem).
 */
export async function atualizarPerfil(id: number, edicao: EdicaoPerfil) {
  const data = await dadosDaEdicao(edicao);
  try {
    const { papel, admin, versaoToken, ...professor } = await prisma.usuario.update({
      where: { id },
      data,
      select: { ...perfilSelect, papel: true, admin: true, versaoToken: true },
    });
    const sessao = data.versaoToken
      ? { id: professor.id, nome: professor.nome, email: professor.email, papel, admin, versaoToken }
      : null;
    return { professor, sessao };
  } catch (err) {
    if (ehErroPrisma(err, 'P2002')) throw new ErroValidacao('Email já cadastrado');
    throw err;
  }
}

export async function listarProfessores() {
  return prisma.usuario.findMany({
    where: { papel: 'professor' },
    select: { id: true, nome: true, email: true, admin: true, criadoEm: true },
    orderBy: { nome: 'asc' },
  });
}

export async function criarProfessor(dados: { nome: string; email: string; senha: string }) {
  try {
    const senha = await bcrypt.hash(dados.senha, 10);
    return await prisma.usuario.create({
      data: { nome: dados.nome, email: dados.email, senha, papel: 'professor' },
      select: perfilSelect,
    });
  } catch (err) {
    if (ehErroPrisma(err, 'P2002')) throw new ErroValidacao('Email já cadastrado');
    throw err;
  }
}

export async function atualizarProfessor(adminId: number, alvoId: number, edicao: EdicaoPerfil) {
  if (alvoId === adminId) throw new ErroValidacao('Use /professor/me para editar seu próprio perfil');
  const data = await dadosDaEdicao(edicao);
  try {
    return await prisma.usuario.update({ where: { id: alvoId, papel: 'professor' }, data, select: perfilSelect });
  } catch (err) {
    if (ehErroPrisma(err, 'P2002') || ehErroPrisma(err, 'P2025')) {
      throw new ErroValidacao('Email já cadastrado ou professor não encontrado');
    }
    throw err;
  }
}

/** Exclui o professor com as turmas (e tudo dentro delas), as notas que deu e os arquivos. */
export async function excluirProfessor(adminId: number, alvoId: number) {
  if (alvoId === adminId) throw new ErroValidacao('Você não pode deletar sua própria conta');

  const professor = await prisma.usuario.findFirst({ where: { id: alvoId, papel: 'professor' } });
  if (!professor) throw new ErroNaoEncontrado('Professor não encontrado');

  const caminhos = await prisma.$transaction(async (tx) => {
    // Feedback.professor é Restrict: as notas dadas saem antes
    await tx.feedback.deleteMany({ where: { professorId: alvoId } });
    const turmas = await tx.turma.findMany({ where: { professorId: alvoId }, select: { id: true } });
    // Arquivos das turmas (inclusive entregas dos alunos) e os do próprio professor (ex.: entregas de quando era aluno)
    const arquivos = [
      ...(await idsArquivosDasTurmas(tx, turmas.map((t) => t.id))),
      ...(await tx.arquivo.findMany({ where: { donoId: alvoId }, select: { id: true } })).map((a) => a.id),
    ];
    await tx.submissao.deleteMany({ where: { alunoId: alvoId } });
    for (const t of turmas) {
      await tx.feedback.deleteMany({ where: { submissao: { atividade: { turmaId: t.id } } } });
      await tx.submissao.deleteMany({ where: { atividade: { turmaId: t.id } } });
      await tx.atividade.deleteMany({ where: { turmaId: t.id } });
      await tx.materialApoio.deleteMany({ where: { turmaId: t.id } });
      await tx.aviso.deleteMany({ where: { turmaId: t.id } });
      await tx.matricula.deleteMany({ where: { turmaId: t.id } });
    }
    await tx.turma.deleteMany({ where: { professorId: alvoId } });
    const remover = await apagarArquivos(tx, arquivos);
    await tx.usuario.delete({ where: { id: alvoId } });
    return remover;
  });
  await removerDoDisco(caminhos);
}

/**
 * Muda o papel para professor. Submissões e feedbacks ficam como histórico;
 * só as matrículas saem, para ele não aparecer como aluno nas turmas.
 */
export async function promoverAluno(alunoId: number) {
  const aluno = await prisma.usuario.findFirst({ where: { id: alunoId, papel: 'aluno' } });
  if (!aluno) throw new ErroNaoEncontrado('Aluno não encontrado');

  return prisma.$transaction(async (tx) => {
    await tx.matricula.deleteMany({ where: { alunoId } });
    return tx.usuario.update({
      where: { id: alunoId },
      // O papel vai no token: a sessão antiga (de aluno) deixa de valer
      data: { papel: 'professor', versaoToken: { increment: 1 } },
      select: { id: true, nome: true, email: true },
    });
  });
}
