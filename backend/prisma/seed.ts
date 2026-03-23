import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/database/client.js';
import { StatusSubmissao } from '../src/database/generated/prisma/client.js';

async function main() {
  const senhaHash = await bcrypt.hash('senha123', 10);

  const professor = await prisma.professor.upsert({
    where: { email: 'professor@sweetway.com' },
    update: {},
    create: {
      nome: 'Maria Silva',
      email: 'professor@sweetway.com',
      senha: senhaHash,
    },
  });

  const [aluno1, aluno2, aluno3] = await Promise.all([
    prisma.aluno.upsert({
      where: { email: 'ana@email.com' },
      update: {},
      create: { nome: 'Ana Costa', email: 'ana@email.com', senha: senhaHash },
    }),
    prisma.aluno.upsert({
      where: { email: 'bruno@email.com' },
      update: {},
      create: { nome: 'Bruno Lima', email: 'bruno@email.com', senha: senhaHash },
    }),
    prisma.aluno.upsert({
      where: { email: 'carla@email.com' },
      update: {},
      create: { nome: 'Carla Santos', email: 'carla@email.com', senha: senhaHash },
    }),
  ]);

  const turma1 = await prisma.turma.upsert({
    where: { codigoConvite: 'SWB1-2025' },
    update: {},
    create: {
      nome: 'Inglês Básico - Turma 1',
      descricao: 'Introdução ao inglês para iniciantes',
      codigoConvite: 'SWB1-2025',
      professorId: professor.id,
    },
  });

  const turma2 = await prisma.turma.upsert({
    where: { codigoConvite: 'SWI1-2025' },
    update: {},
    create: {
      nome: 'Inglês Intermediário',
      descricao: 'Gramática e conversação para nível intermediário',
      codigoConvite: 'SWI1-2025',
      professorId: professor.id,
    },
  });

  await prisma.matricula.createMany({
    data: [
      { alunoId: aluno1.id, turmaId: turma1.id },
      { alunoId: aluno2.id, turmaId: turma1.id },
      { alunoId: aluno3.id, turmaId: turma1.id },
      { alunoId: aluno1.id, turmaId: turma2.id },
    ],
  });

  const dataEntrega = new Date();
  dataEntrega.setDate(dataEntrega.getDate() + 7);

  const [atividade1, atividade2] = await Promise.all([
    prisma.atividade.create({
      data: {
        titulo: 'Apresentação pessoal',
        descricao: 'Escreva um parágrafo em inglês se apresentando (nome, idade, profissão, hobbies)',
        dataEntrega,
        turmaId: turma1.id,
      },
    }),
    prisma.atividade.create({
      data: {
        titulo: 'Simple Present - Exercícios',
        descricao: 'Complete os exercícios sobre Simple Present no material em anexo',
        dataEntrega,
        turmaId: turma1.id,
      },
    }),
  ]);

  const submissao1 = await prisma.submissao.create({
    data: {
      atividadeId: atividade1.id,
      alunoId: aluno1.id,
      conteudo: 'My name is Ana. I am 25 years old. I work as a designer. I like to read and travel.',
      status: StatusSubmissao.corrigido,
    },
  });

  await prisma.feedback.create({
    data: {
      submissaoId: submissao1.id,
      professorId: professor.id,
      comentario: 'Muito bem! Use "I am" instead of "I is" when referring to yourself. Keep practicing!',
      nota: 8.5,
    },
  });

  await prisma.materialApoio.createMany({
    data: [
      { titulo: 'Guia de Verbos - Simple Present', tipo: 'pdf', urlArquivo: '/materiais/verbos-simple-present.pdf', turmaId: turma1.id },
      { titulo: 'Vídeo - Pronúncia do TH', tipo: 'video', urlArquivo: 'https://youtube.com/watch?v=exemplo', turmaId: turma1.id },
      { titulo: 'Links úteis para estudo', tipo: 'link', urlArquivo: 'https://sweetway.com/links', turmaId: turma1.id },
    ],
  });

  console.log('Seed concluído:');
  console.log(`  - 1 professor, 3 alunos`);
  console.log(`  - 2 turmas, 4 matrículas`);
  console.log(`  - 2 atividades, 1 submissão com feedback`);
  console.log(`  - 3 materiais de apoio`);
  console.log(`  - Login: professor@sweetway.com / ana@email.com | Senha: senha123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
