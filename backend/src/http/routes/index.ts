import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/client.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'sweet-way-secret-key';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

export const authenticateToken = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

const router = Router();

// --- Auth Routes ---
router.post('/auth/register/professor', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    await prisma.professor.create({
      data: { nome, email, senha: hashedSenha }
    });
    res.status(201).json({ message: 'Professor criado com sucesso' });
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
});

router.post('/auth/register/aluno', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    await prisma.aluno.create({
      data: { nome, email, senha: hashedSenha }
    });
    res.status(201).json({ message: 'Aluno criado com sucesso' });
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, senha } = req.body;
  console.log(email, senha);
  let user: any = await prisma.professor.findUnique({ where: { email } });
  let role = 'professor';

  if (!user) {
    user = await prisma.aluno.findUnique({ where: { email } });
    role = 'aluno';
  }

  if (!user || !(await bcrypt.compare(senha, user.senha))) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role } });
});

router.get('/professor/alunos', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });

  const matriculas = await prisma.matricula.findMany({
    where: { turma: { professorId: req.user.id } },
    include: {
      aluno: { select: { id: true, nome: true, email: true, criadoEm: true } },
      turma: { select: { id: true, nome: true } }
    },
    orderBy: { dataMatricula: 'desc' }
  });

  const byAluno = new Map<
    number,
    {
      id: number;
      nome: string;
      email: string;
      criadoEm: Date;
      turmas: Map<number, { id: number; nome: string }>;
    }
  >();

  for (const m of matriculas) {
    const a = m.aluno;
    let row = byAluno.get(a.id);
    if (!row) {
      row = {
        id: a.id,
        nome: a.nome,
        email: a.email,
        criadoEm: a.criadoEm,
        turmas: new Map()
      };
      byAluno.set(a.id, row);
    }
    row.turmas.set(m.turma.id, { id: m.turma.id, nome: m.turma.nome });
  }

  const list = Array.from(byAluno.values()).map((r) => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
    criadoEm: r.criadoEm,
    turmas: Array.from(r.turmas.values())
  }));
  list.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
  res.json(list);
});

router.post('/professor/alunos', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const { nome, email, senha, turmaId } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }
  const tid = parseInt(String(turmaId), 10);
  if (Number.isNaN(tid)) {
    return res.status(400).json({ error: 'Selecione uma turma para vincular o aluno' });
  }
  const turma = await prisma.turma.findFirst({
    where: { id: tid, professorId: req.user.id }
  });
  if (!turma) return res.status(400).json({ error: 'Turma inválida' });

  try {
    const hashedSenha = await bcrypt.hash(senha, 10);
    const aluno = await prisma.$transaction(async (tx) => {
      const a = await tx.aluno.create({
        data: { nome, email, senha: hashedSenha }
      });
      await tx.matricula.create({
        data: { alunoId: a.id, turmaId: tid }
      });
      return a;
    });
    res.status(201).json({
      message: 'Aluno criado com sucesso',
      aluno: { id: aluno.id, nome: aluno.nome, email: aluno.email }
    });
  } catch {
    res.status(400).json({ error: 'Email já cadastrado ou aluno já está nesta turma' });
  }
});

router.patch('/professor/alunos/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const alunoId = parseInt(req.params.id);
  if (Number.isNaN(alunoId)) return res.status(400).json({ error: 'ID inválido' });

  const vinculo = await prisma.matricula.findFirst({
    where: { alunoId, turma: { professorId: req.user.id } }
  });
  if (!vinculo) return res.status(404).json({ error: 'Aluno não encontrado' });

  const { nome, email, senha } = req.body;
  const data: { nome?: string; email?: string; senha?: string } = {};
  if (nome !== undefined) data.nome = nome;
  if (email !== undefined) data.email = email;
  if (senha !== undefined && senha !== '') {
    data.senha = await bcrypt.hash(senha, 10);
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'Envie ao menos um campo: nome, email ou senha' });
  }

  try {
    const aluno = await prisma.aluno.update({
      where: { id: alunoId },
      data,
      select: { id: true, nome: true, email: true, criadoEm: true }
    });
    res.json(aluno);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
});

router.delete('/professor/alunos/:id', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const alunoId = parseInt(req.params.id);
  if (Number.isNaN(alunoId)) return res.status(400).json({ error: 'ID inválido' });

  const vinculo = await prisma.matricula.findFirst({
    where: { alunoId, turma: { professorId: req.user.id } }
  });
  if (!vinculo) return res.status(404).json({ error: 'Aluno não encontrado' });

  const submissoes = await prisma.submissao.findMany({
    where: { alunoId },
    select: { arquivoUrl: true }
  });

  await prisma.$transaction(async (tx) => {
    await tx.feedback.deleteMany({ where: { submissao: { alunoId } } });
    await tx.submissao.deleteMany({ where: { alunoId } });
    await tx.matricula.deleteMany({ where: { alunoId } });
    await tx.aluno.delete({ where: { id: alunoId } });
  });

  for (const s of submissoes) {
    if (s.arquivoUrl?.startsWith('/uploads/')) {
      const filePath = path.join('uploads', path.basename(s.arquivoUrl));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }

  res.status(204).send();
});

// --- Turmas Routes ---
router.post('/turmas', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const { nome, descricao, nivel } = req.body;

  const year = new Date().getFullYear();
  const count = await prisma.turma.count();
  const codigoConvite = `SW${nivel || 'B'}${count + 1}-${year}`;

  try {
    const turma = await prisma.turma.create({
      data: {
        nome,
        descricao,
        codigoConvite,
        professorId: req.user.id
      }
    });
    res.status(201).json(turma);
  } catch {
    res.status(400).json({ error: 'Erro ao criar turma' });
  }
});

router.get('/turmas', authenticateToken, async (req: any, res) => {
  if (req.user.role === 'professor') {
    const turmas = await prisma.turma.findMany({
      where: { professorId: req.user.id },
      include: { _count: { select: { matriculas: true } } }
    });
    res.json(turmas);
  } else {
    const matriculas = await prisma.matricula.findMany({
      where: { alunoId: req.user.id },
      include: { turma: { include: { professor: { select: { nome: true } } } } }
    });
    res.json(matriculas.map(m => m.turma));
  }
});

router.get('/turmas/:id', authenticateToken, async (req: any, res) => {
  const id = parseInt(req.params.id);
  const turma = await prisma.turma.findUnique({
    where: { id },
    include: {
      professor: { select: { nome: true } },
      atividades: true,
      materiais: true,
      matriculas: { include: { aluno: { select: { id: true, nome: true, email: true } } } }
    }
  });
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
  if (req.user.role === 'professor' && turma.professorId !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.user.role === 'aluno') {
    const matriculado = await prisma.matricula.findFirst({
      where: { turmaId: id, alunoId: req.user.id }
    });
    if (!matriculado) return res.status(403).json({ error: 'Acesso negado' });
  }
  res.json(turma);
});

router.post('/turmas/entrar', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
  const { codigoConvite } = req.body;

  const jaMatriculado = await prisma.matricula.findFirst({
    where: { alunoId: req.user.id }
  });
  if (jaMatriculado) {
    return res.status(400).json({
      error: 'Você já está em uma turma. Não é possível entrar em outra.'
    });
  }

  const turma = await prisma.turma.findUnique({ where: { codigoConvite } });
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });

  try {
    await prisma.matricula.create({
      data: {
        alunoId: req.user.id,
        turmaId: turma.id
      }
    });
    res.json({ message: 'Matriculado com sucesso' });
  } catch {
    res.status(400).json({ error: 'Você já está nesta turma' });
  }
});

// --- Atividades Routes ---
router.post('/turmas/:turmaId/atividades', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const { titulo, descricao, dataEntrega } = req.body;
  const atividade = await prisma.atividade.create({
    data: {
      titulo,
      descricao,
      dataEntrega: new Date(dataEntrega),
      turmaId: parseInt(req.params.turmaId)
    }
  });
  res.status(201).json(atividade);
});

router.get('/turmas/:turmaId/atividades', authenticateToken, async (req: any, res) => {
  const turmaId = parseInt(req.params.turmaId);
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
  if (req.user.role === 'professor' && turma.professorId !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.user.role === 'aluno') {
    const matriculado = await prisma.matricula.findFirst({
      where: { turmaId, alunoId: req.user.id }
    });
    if (!matriculado) return res.status(403).json({ error: 'Acesso negado' });
  }

  const submissoesInclude =
    req.user.role === 'aluno'
      ? {
          where: { alunoId: req.user.id },
          include: { aluno: { select: { nome: true } } },
          orderBy: { dataEnvio: 'desc' as const }
        }
      : {
          include: { aluno: { select: { nome: true } } },
          orderBy: { dataEnvio: 'desc' as const }
        };

  const atividades = await prisma.atividade.findMany({
    where: { turmaId },
    include: { submissoes: submissoesInclude }
  });
  res.json(atividades);
});

// --- Submissões Routes ---
router.post('/atividades/:id/submissoes', authenticateToken, upload.single('arquivo'), async (req: any, res) => {
  if (req.user.role !== 'aluno') return res.status(403).json({ error: 'Acesso negado' });
  const { conteudo } = req.body;
  const submissao = await prisma.submissao.create({
    data: {
      atividadeId: parseInt(req.params.id),
      alunoId: req.user.id,
      conteudo,
      arquivoUrl: req.file ? `/uploads/${req.file.filename}` : null
    }
  });
  res.status(201).json(submissao);
});

router.get('/atividades/:id/submissoes', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const submissoes = await prisma.submissao.findMany({
    where: { atividadeId: parseInt(req.params.id) },
    include: { aluno: { select: { nome: true } }, feedback: true }
  });
  res.json(submissoes);
});

// --- Feedbacks Routes ---
router.post('/submissoes/:id/feedback', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const { comentario, nota } = req.body;
  const feedback = await prisma.feedback.create({
    data: {
      submissaoId: parseInt(req.params.id),
      professorId: req.user.id,
      comentario,
      nota: parseFloat(nota)
    }
  });
  await prisma.submissao.update({
    where: { id: parseInt(req.params.id) },
    data: { status: 'corrigido' }
  });
  res.status(201).json(feedback);
});

router.get('/alunos/me/feedbacks', authenticateToken, async (req: any, res) => {
  const feedbacks = await prisma.feedback.findMany({
    where: { submissao: { alunoId: req.user.id } },
    include: { submissao: { include: { atividade: true } }, professor: { select: { nome: true } } }
  });
  res.json(feedbacks);
});

// --- Materiais Routes ---
router.post('/turmas/:id/materiais', authenticateToken, upload.single('arquivo'), async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const turmaId = parseInt(req.params.id);
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
  if (turma.professorId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

  const { titulo, tipo, url } = req.body;
  const urlArquivo = req.file ? `/uploads/${req.file.filename}` : url;
  if (!titulo || !tipo || !urlArquivo) {
    return res.status(400).json({ error: 'Informe título, tipo e um arquivo ou URL' });
  }

  const material = await prisma.materialApoio.create({
    data: {
      titulo,
      tipo,
      urlArquivo,
      turmaId
    }
  });
  res.status(201).json(material);
});

router.delete('/turmas/:turmaId/materiais/:materialId', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'professor') return res.status(403).json({ error: 'Acesso negado' });
  const turmaId = parseInt(req.params.turmaId);
  const materialId = parseInt(req.params.materialId);

  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
  if (turma.professorId !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

  const material = await prisma.materialApoio.findFirst({
    where: { id: materialId, turmaId }
  });
  if (!material) return res.status(404).json({ error: 'Material não encontrado' });

  if (material.urlArquivo.startsWith('/uploads/')) {
    const filePath = path.join('uploads', path.basename(material.urlArquivo));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.materialApoio.delete({ where: { id: materialId } });
  res.status(204).send();
});

router.get('/turmas/:id/materiais', authenticateToken, async (req: any, res) => {
  const turmaId = parseInt(req.params.id);
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada' });
  if (req.user.role === 'professor' && turma.professorId !== req.user.id) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  if (req.user.role === 'aluno') {
    const matriculado = await prisma.matricula.findFirst({
      where: { turmaId, alunoId: req.user.id }
    });
    if (!matriculado) return res.status(403).json({ error: 'Acesso negado' });
  }

  const materiais = await prisma.materialApoio.findMany({
    where: { turmaId }
  });
  res.json(materiais);
});

export { router };
