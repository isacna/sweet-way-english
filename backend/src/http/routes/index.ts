import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/client.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';

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
  const { titulo, tipo, url } = req.body;
  const material = await prisma.materialApoio.create({
    data: {
      titulo,
      tipo,
      urlArquivo: req.file ? `/uploads/${req.file.filename}` : url,
      turmaId: parseInt(req.params.id)
    }
  });
  res.status(201).json(material);
});

router.get('/turmas/:id/materiais', authenticateToken, async (req: any, res) => {
  const materiais = await prisma.materialApoio.findMany({
    where: { turmaId: parseInt(req.params.id) }
  });
  res.json(materiais);
});

export { router };
