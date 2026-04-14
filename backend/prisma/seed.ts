import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/database/client.js';
import { StatusSubmissao } from '../src/database/generated/prisma/client.js';

const PDF_WORKSHEET = '/uploads/1773977192408-Present_Simple_Worksheet.pdf';

async function main() {
  const senhaHash = await bcrypt.hash('senha123', 10);

  // ─── Usuários ──────────────────────────────────────────────────────────────

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

  // ─── Turmas ────────────────────────────────────────────────────────────────

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

  // ─── Matrículas ────────────────────────────────────────────────────────────
  // Turma 1: Ana, Bruno, Carla
  // Turma 2: Ana, Bruno

  await Promise.all([
    prisma.matricula.upsert({ where: { alunoId_turmaId: { alunoId: aluno1.id, turmaId: turma1.id } }, update: {}, create: { alunoId: aluno1.id, turmaId: turma1.id } }),
    prisma.matricula.upsert({ where: { alunoId_turmaId: { alunoId: aluno2.id, turmaId: turma1.id } }, update: {}, create: { alunoId: aluno2.id, turmaId: turma1.id } }),
    prisma.matricula.upsert({ where: { alunoId_turmaId: { alunoId: aluno3.id, turmaId: turma1.id } }, update: {}, create: { alunoId: aluno3.id, turmaId: turma1.id } }),
    prisma.matricula.upsert({ where: { alunoId_turmaId: { alunoId: aluno1.id, turmaId: turma2.id } }, update: {}, create: { alunoId: aluno1.id, turmaId: turma2.id } }),
    prisma.matricula.upsert({ where: { alunoId_turmaId: { alunoId: aluno2.id, turmaId: turma2.id } }, update: {}, create: { alunoId: aluno2.id, turmaId: turma2.id } }),
  ]);

  // ─── Atividades ────────────────────────────────────────────────────────────

  const prazo1 = new Date();
  prazo1.setDate(prazo1.getDate() + 7);

  const prazo2 = new Date();
  prazo2.setDate(prazo2.getDate() + 14);

  const [atividade1, atividade2, atividade3, atividade4] = await Promise.all([
    // Turma 1 — texto livre
    prisma.atividade.create({
      data: {
        titulo: 'Apresentação pessoal',
        descricao: 'Escreva um parágrafo em inglês se apresentando (nome, idade, profissão, hobbies).',
        dataEntrega: prazo1,
        arquivoObrigatorio: false,
        turmaId: turma1.id,
      },
    }),
    // Turma 1 — com envio de arquivo
    prisma.atividade.create({
      data: {
        titulo: 'Simple Present — Worksheet',
        descricao: 'Complete o worksheet de Simple Present disponível nos materiais e envie o arquivo respondido.',
        dataEntrega: prazo1,
        arquivoObrigatorio: true,
        turmaId: turma1.id,
      },
    }),
    // Turma 2 — texto livre
    prisma.atividade.create({
      data: {
        titulo: 'Daily Routine — Writing',
        descricao: 'Describe your daily routine using Simple Present. Write at least 8 sentences.',
        dataEntrega: prazo2,
        arquivoObrigatorio: false,
        turmaId: turma2.id,
      },
    }),
    // Turma 2 — com envio de arquivo
    prisma.atividade.create({
      data: {
        titulo: 'Verb To Be — Exercises',
        descricao: 'Complete os exercícios do worksheet sobre Verb To Be e envie o arquivo preenchido.',
        dataEntrega: prazo2,
        arquivoObrigatorio: true,
        turmaId: turma2.id,
      },
    }),
  ]);

  // ─── Submissões ────────────────────────────────────────────────────────────

  // Atividade 1 (Apresentação pessoal) — Ana: corrigido, Bruno: pendente, Carla: pendente
  const submissaoAna1 = await prisma.submissao.create({
    data: {
      atividadeId: atividade1.id,
      alunoId: aluno1.id,
      conteudo: 'My name is Ana. I am 25 years old. I work as a designer. I like reading and traveling.',
      status: StatusSubmissao.corrigido,
    },
  });

  await prisma.feedback.create({
    data: {
      submissaoId: submissaoAna1.id,
      professorId: professor.id,
      comentario: 'Very good, Ana! Great use of Simple Present. Pay attention to "I like reading" (gerund) — perfect here. Keep it up!',
      nota: 9.0,
    },
  });

  await prisma.submissao.create({
    data: {
      atividadeId: atividade1.id,
      alunoId: aluno2.id,
      conteudo: 'Hi! My name is Bruno. I am 22 years old. I study computer science and I love play video games and listen music.',
      status: StatusSubmissao.pendente,
    },
  });

  await prisma.submissao.create({
    data: {
      atividadeId: atividade1.id,
      alunoId: aluno3.id,
      conteudo: 'My name is Carla. I have 28 years. I am a nurse. I like cook and watch series on weekends.',
      status: StatusSubmissao.pendente,
    },
  });

  // Atividade 2 (Simple Present Worksheet) — Ana: aprovado, Bruno: pendente (com arquivo)
  const submissaoAna2 = await prisma.submissao.create({
    data: {
      atividadeId: atividade2.id,
      alunoId: aluno1.id,
      arquivoUrl: PDF_WORKSHEET,
      status: StatusSubmissao.aprovado,
    },
  });

  await prisma.feedback.create({
    data: {
      submissaoId: submissaoAna2.id,
      professorId: professor.id,
      comentario: 'Excellent work! All exercises correct. Your understanding of Simple Present is solid.',
      nota: 10.0,
    },
  });

  await prisma.submissao.create({
    data: {
      atividadeId: atividade2.id,
      alunoId: aluno2.id,
      arquivoUrl: PDF_WORKSHEET,
      status: StatusSubmissao.pendente,
    },
  });

  await prisma.submissao.create({
    data: {
      atividadeId: atividade2.id,
      alunoId: aluno3.id,
      arquivoUrl: PDF_WORKSHEET,
      status: StatusSubmissao.pendente,
    },
  });

  // Atividade 3 (Daily Routine) — Ana: pendente, Bruno: pendente
  await prisma.submissao.create({
    data: {
      atividadeId: atividade3.id,
      alunoId: aluno1.id,
      conteudo: 'I wake up at 7am. I take a shower and have breakfast. I go to work by bus. I usually eat lunch at the office...',
      status: StatusSubmissao.pendente,
    },
  });

  await prisma.submissao.create({
    data: {
      atividadeId: atividade3.id,
      alunoId: aluno2.id,
      conteudo: 'I get up at 8am. I dont have breakfast. I go to university by car. I study in the afternoon and play games at night.',
      status: StatusSubmissao.pendente,
    },
  });

  // Atividade 4 (Verb To Be Worksheet) — Ana: pendente (com arquivo)
  await prisma.submissao.create({
    data: {
      atividadeId: atividade4.id,
      alunoId: aluno1.id,
      arquivoUrl: PDF_WORKSHEET,
      status: StatusSubmissao.pendente,
    },
  });

  // ─── Avisos ────────────────────────────────────────────────────────────────

  await prisma.aviso.createMany({
    data: [
      {
        titulo: 'Bem-vindos à turma!',
        conteudo: 'Olá turma! Estou animada para começarmos juntos. Não se esqueçam de entregar as atividades até o prazo.',
        turmaId: turma1.id,
      },
      {
        titulo: 'Material extra disponível',
        conteudo: 'Adicionei um worksheet de Simple Present nos materiais. Usem como referência para a atividade 2.',
        turmaId: turma1.id,
      },
      {
        titulo: 'Boas-vindas ao Intermediário!',
        conteudo: 'Parabéns por chegarem até aqui! Nesse módulo vamos aprofundar gramática e praticar conversação.',
        turmaId: turma2.id,
      },
    ],
  });

  // ─── Materiais de Apoio ────────────────────────────────────────────────────

  await prisma.materialApoio.createMany({
    data: [
      // Turma 1
      {
        titulo: 'Present Simple — Worksheet',
        tipo: 'pdf',
        urlArquivo: PDF_WORKSHEET,
        turmaId: turma1.id,
      },
      {
        titulo: 'Pronúncia do TH em inglês',
        tipo: 'video',
        urlArquivo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        turmaId: turma1.id,
      },
      {
        titulo: 'Duolingo — prática diária',
        tipo: 'link',
        urlArquivo: 'https://www.duolingo.com',
        turmaId: turma1.id,
      },
      // Turma 2
      {
        titulo: 'Present Simple — Worksheet',
        tipo: 'pdf',
        urlArquivo: PDF_WORKSHEET,
        turmaId: turma2.id,
      },
      {
        titulo: 'BBC Learning English — Podcasts',
        tipo: 'audio',
        urlArquivo: 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
        turmaId: turma2.id,
      },
      {
        titulo: 'Cambridge Dictionary Online',
        tipo: 'link',
        urlArquivo: 'https://dictionary.cambridge.org',
        turmaId: turma2.id,
      },
    ],
  });

  // ─── Resumo ────────────────────────────────────────────────────────────────

  console.log('Seed concluído:');
  console.log('  - 1 professor, 3 alunos');
  console.log('  - 2 turmas, 5 matrículas');
  console.log('  - 4 atividades (2 por turma, sendo 1 com arquivo obrigatório cada)');
  console.log('  - 8 submissões: 2 corrigidas/aprovadas com feedback, 6 pendentes de avaliação');
  console.log('  - 3 avisos (2 na turma 1, 1 na turma 2)');
  console.log('  - 6 materiais de apoio (3 por turma, PDF real incluído)');
  console.log('  Contas: professor@sweetway.com | ana@email.com | bruno@email.com | carla@email.com');
  console.log('  Senha: senha123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
