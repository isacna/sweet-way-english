// Alunos das turmas da professora: listar, criar (já matriculado), editar e excluir.
import bcrypt from 'bcryptjs';
import { prisma } from '../database/client.js';
import { ehMenor } from '../domain/idade.js';
import { normalizarEmail } from '../domain/email.js';
import { apagarArquivos, removerDoDisco } from '../storage/arquivos.js';
import { ehErroPrisma, ErroNaoEncontrado, ErroValidacao } from './erros.js';

export async function listarAlunos(professorId: number) {
  const matriculas = await prisma.matricula.findMany({
    where: { turma: { professorId } },
    include: {
      aluno: { select: { id: true, nome: true, email: true, criadoEm: true } },
      turma: { select: { id: true, nome: true } },
    },
    orderBy: { dataMatricula: 'desc' },
  });

  const porAluno = new Map<
    number,
    { id: number; nome: string; email: string; criadoEm: Date; turmas: Map<number, { id: number; nome: string }> }
  >();
  for (const m of matriculas) {
    const a = m.aluno;
    let linha = porAluno.get(a.id);
    if (!linha) {
      linha = { id: a.id, nome: a.nome, email: a.email, criadoEm: a.criadoEm, turmas: new Map() };
      porAluno.set(a.id, linha);
    }
    linha.turmas.set(m.turma.id, { id: m.turma.id, nome: m.turma.nome });
  }

  return Array.from(porAluno.values())
    .map((r) => ({ id: r.id, nome: r.nome, email: r.email, criadoEm: r.criadoEm, turmas: Array.from(r.turmas.values()) }))
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
}

export interface NovoAluno {
  nome: string;
  email: string;
  senha: string;
  turmaId: number;
  dataNascimento?: Date;
  responsavelNome?: string;
  responsavelEmail?: string;
}

/** Cria o aluno já matriculado numa turma da professora. Menores guardam o responsável e o consentimento. */
export async function criarAluno(professorId: number, dados: NovoAluno) {
  const turma = await prisma.turma.findFirst({ where: { id: dados.turmaId, professorId } });
  if (!turma) throw new ErroValidacao('Turma inválida');

  const menor = dados.dataNascimento ? ehMenor(dados.dataNascimento) : false;
  const senha = await bcrypt.hash(dados.senha, 10);
  try {
    return await prisma.$transaction(async (tx) => {
      const aluno = await tx.usuario.create({
        data: {
          nome: dados.nome,
          email: normalizarEmail(dados.email),
          senha,
          papel: 'aluno',
          ...(dados.dataNascimento && { dataNascimento: dados.dataNascimento }),
          ...(menor && {
            responsavelNome: dados.responsavelNome,
            responsavelEmail: dados.responsavelEmail,
            consentimentoResponsavelEm: new Date(),
          }),
        },
      });
      await tx.matricula.create({ data: { alunoId: aluno.id, turmaId: dados.turmaId } });
      return { id: aluno.id, nome: aluno.nome, email: aluno.email };
    });
  } catch (err) {
    if (ehErroPrisma(err, 'P2002')) throw new ErroValidacao('Email já cadastrado ou aluno já está nesta turma');
    throw err;
  }
}

/** O aluno precisa estar numa turma da professora; senão é 404 (não revela alunos de outras turmas). */
async function garantirAlunoDaProfessora(professorId: number, alunoId: number) {
  const vinculo = await prisma.matricula.findFirst({ where: { alunoId, turma: { professorId } } });
  if (!vinculo) throw new ErroNaoEncontrado('Aluno não encontrado');
}

export interface EdicaoAluno {
  nome?: string;
  email?: string;
  senha?: string;
}

export async function atualizarAluno(professorId: number, alunoId: number, edicao: EdicaoAluno) {
  await garantirAlunoDaProfessora(professorId, alunoId);

  const data: { nome?: string; email?: string; senha?: string; versaoToken?: { increment: number } } = {};
  if (edicao.nome !== undefined) data.nome = edicao.nome;
  if (edicao.email !== undefined) data.email = normalizarEmail(edicao.email);
  if (edicao.senha !== undefined) {
    data.senha = await bcrypt.hash(edicao.senha, 10);
    // Senha nova derruba as sessões abertas do aluno
    data.versaoToken = { increment: 1 };
  }
  if (Object.keys(data).length === 0) throw new ErroValidacao('Envie ao menos um campo: nome, email ou senha');

  try {
    return await prisma.usuario.update({
      where: { id: alunoId, papel: 'aluno' },
      data,
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
  } catch (err) {
    // P2025: o vínculo existe mas o usuário já não é aluno (resposta antiga mantida)
    if (ehErroPrisma(err, 'P2002') || ehErroPrisma(err, 'P2025')) throw new ErroValidacao('Email já cadastrado');
    throw err;
  }
}

/** Exclui o aluno com entregas, matrículas e arquivos (os arquivos saem do disco depois do commit). */
export async function excluirAluno(professorId: number, alunoId: number) {
  await garantirAlunoDaProfessora(professorId, alunoId);

  // Arquivo.dono é Restrict justamente para não sobrar nada no disco
  const caminhos = await prisma.$transaction(async (tx) => {
    const arquivos = await tx.arquivo.findMany({ where: { donoId: alunoId }, select: { id: true } });
    await tx.feedback.deleteMany({ where: { submissao: { alunoId } } });
    await tx.submissao.deleteMany({ where: { alunoId } });
    await tx.matricula.deleteMany({ where: { alunoId } });
    const remover = await apagarArquivos(tx, arquivos.map((a) => a.id));
    await tx.usuario.delete({ where: { id: alunoId } });
    return remover;
  });
  await removerDoDisco(caminhos);
}
