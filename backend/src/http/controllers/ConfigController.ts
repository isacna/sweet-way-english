import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../database/client.js';
import { env } from '../../config/env.js';
import {
  apagarArquivos,
  caminhoAbsoluto,
  gravarNoDisco,
  idsArquivosDasTurmas,
  removerDoDisco,
} from '../../storage/arquivos.js';
import { arquivoRecebido } from '../middlewares/upload.js';
import { AuthRequest } from '../../types/index.js';
import { iniciarSessao } from '../sessao.js';

const SENHA_MIN = 6; // mesma regra do cadastro público (AuthController)
const ERRO_SENHA = `A senha precisa ter pelo menos ${SENHA_MIN} caracteres`;
const senhaCurta = (senha: unknown) => String(senha).trim().length < SENHA_MIN;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getOrCreateConfig() {
  return prisma.configuracaoApp.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

// ─── Configuração da aplicação ──────────────────────────────────────────────

/** URL pública e absoluta da logo; `v` muda a cada troca, então o navegador pode guardar em cache. */
function urlDaLogo(config: { logoCaminho: string | null; atualizadoEm: Date }) {
  if (!config.logoCaminho) return null;
  return `${env.APP_URL.replace(/\/$/, '')}/api/configuracoes/logo?v=${config.atualizadoEm.getTime()}`;
}

export async function getConfig(_req: Request, res: Response) {
  const config = await getOrCreateConfig();
  res.json({ logoUrl: urlDaLogo(config) });
}

/** A logo é o único upload público (aparece antes do login). Os demais passam por GET /api/arquivos/:id. */
export async function getLogo(_req: Request, res: Response) {
  const config = await prisma.configuracaoApp.findUnique({ where: { id: 1 } });
  if (!config?.logoCaminho) {
    res.status(404).json({ error: 'Nenhuma logo definida' });
    return;
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(caminhoAbsoluto(config.logoCaminho), { maxAge: '1d', dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Logo não encontrada' });
  });
}

export async function uploadLogo(req: AuthRequest, res: Response) {
  // receberArquivo('logo', { somenteImagem: true }) já conferiu que é PNG/JPEG/GIF/WebP pelos bytes
  const arquivo = arquivoRecebido(req);
  if (!arquivo) {
    res.status(400).json({ error: 'Nenhum arquivo enviado' });
    return;
  }

  const anterior = await getOrCreateConfig();
  const caminho = await gravarNoDisco(arquivo.buffer, arquivo.ext);
  let config;
  try {
    config = await prisma.configuracaoApp.update({ where: { id: 1 }, data: { logoCaminho: caminho } });
  } catch (err) {
    await removerDoDisco([caminho]);
    throw err;
  }
  if (anterior.logoCaminho && anterior.logoCaminho !== caminho) await removerDoDisco([anterior.logoCaminho]);

  res.json({ logoUrl: urlDaLogo(config) });
}

// ─── Perfil do professor logado ─────────────────────────────────────────────

export async function getProfessorMe(req: AuthRequest, res: Response) {
  const professor = await prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: { id: true, nome: true, email: true, criadoEm: true },
  });

  if (!professor) {
    res.status(404).json({ error: 'Professor não encontrado' });
    return;
  }

  res.json(professor);
}

export async function updateProfessorMe(req: AuthRequest, res: Response) {
  const { nome, email, senha } = req.body;
  const data: { nome?: string; email?: string; senha?: string; versaoToken?: { increment: number } } = {};

  if (nome !== undefined) {
    const n = String(nome).trim();
    if (!n) { res.status(400).json({ error: 'Nome não pode ser vazio' }); return; }
    data.nome = n;
  }
  if (email !== undefined) {
    const e = String(email).trim().toLowerCase();
    if (!e) { res.status(400).json({ error: 'Email não pode ser vazio' }); return; }
    data.email = e;
  }
  if (senha !== undefined && String(senha).trim()) {
    if (senhaCurta(senha)) { res.status(400).json({ error: ERRO_SENHA }); return; }
    data.senha = await bcrypt.hash(String(senha).trim(), 10);
    // Senha nova derruba as sessões abertas com a antiga
    data.versaoToken = { increment: 1 };
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Envie ao menos um campo: nome, email ou senha' });
    return;
  }

  try {
    const { papel, admin, versaoToken, ...professor } = await prisma.usuario.update({
      where: { id: req.user.id },
      data,
      select: { id: true, nome: true, email: true, criadoEm: true, papel: true, admin: true, versaoToken: true },
    });
    // Trocou a própria senha: as outras sessões caem, mas esta continua com um cookie novo
    if (data.versaoToken) iniciarSessao(res, { id: professor.id, nome: professor.nome, email: professor.email, papel, admin, versaoToken });
    res.json(professor);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

// ─── Gestão de professores (admin) ──────────────────────────────────────────

export async function listAllProfessors(req: AuthRequest, res: Response) {
  const professores = await prisma.usuario.findMany({
    where: { papel: 'professor' },
    select: { id: true, nome: true, email: true, admin: true, criadoEm: true },
    orderBy: { nome: 'asc' },
  });

  res.json(professores);
}

export async function createProfessorAdmin(req: AuthRequest, res: Response) {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    return;
  }
  if (senhaCurta(senha)) {
    res.status(400).json({ error: ERRO_SENHA });
    return;
  }

  try {
    const hashedSenha = await bcrypt.hash(String(senha), 10);
    const professor = await prisma.usuario.create({
      data: { nome: String(nome).trim(), email: String(email).trim().toLowerCase(), senha: hashedSenha, papel: 'professor' },
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    res.status(201).json(professor);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado' });
  }
}

export async function updateProfessorAdmin(req: AuthRequest, res: Response) {
  const targetId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  if (targetId === req.user.id) {
    res.status(400).json({ error: 'Use /professor/me para editar seu próprio perfil' });
    return;
  }

  const { nome, email, senha } = req.body;
  const data: { nome?: string; email?: string; senha?: string; versaoToken?: { increment: number } } = {};

  if (nome !== undefined) {
    const n = String(nome).trim();
    if (!n) { res.status(400).json({ error: 'Nome não pode ser vazio' }); return; }
    data.nome = n;
  }
  if (email !== undefined) {
    const e = String(email).trim().toLowerCase();
    if (!e) { res.status(400).json({ error: 'Email não pode ser vazio' }); return; }
    data.email = e;
  }
  if (senha !== undefined && String(senha).trim()) {
    if (senhaCurta(senha)) { res.status(400).json({ error: ERRO_SENHA }); return; }
    data.senha = await bcrypt.hash(String(senha).trim(), 10);
    // Senha nova derruba as sessões abertas com a antiga
    data.versaoToken = { increment: 1 };
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Envie ao menos um campo: nome, email ou senha' });
    return;
  }

  try {
    const professor = await prisma.usuario.update({
      where: { id: targetId, papel: 'professor' },
      data,
      select: { id: true, nome: true, email: true, criadoEm: true },
    });
    res.json(professor);
  } catch {
    res.status(400).json({ error: 'Email já cadastrado ou professor não encontrado' });
  }
}

export async function deleteProfessorAdmin(req: AuthRequest, res: Response) {
  const targetId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  if (targetId === req.user.id) {
    res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    return;
  }

  const professor = await prisma.usuario.findFirst({ where: { id: targetId, papel: 'professor' } });
  if (!professor) {
    res.status(404).json({ error: 'Professor não encontrado' });
    return;
  }

  const caminhos = await prisma.$transaction(async (tx) => {
    // Apagar feedbacks do professor
    await tx.feedback.deleteMany({ where: { professorId: targetId } });
    // Apagar turmas e tudo relacionado
    const turmas = await tx.turma.findMany({ where: { professorId: targetId }, select: { id: true } });
    // Arquivos das turmas (inclusive entregas dos alunos) e os do próprio professor (ex.: entregas de quando era aluno)
    const arquivos = [
      ...(await idsArquivosDasTurmas(tx, turmas.map((t) => t.id))),
      ...(await tx.arquivo.findMany({ where: { donoId: targetId }, select: { id: true } })).map((a) => a.id),
    ];
    await tx.submissao.deleteMany({ where: { alunoId: targetId } });
    for (const t of turmas) {
      await tx.feedback.deleteMany({ where: { submissao: { atividade: { turmaId: t.id } } } });
      await tx.submissao.deleteMany({ where: { atividade: { turmaId: t.id } } });
      await tx.atividade.deleteMany({ where: { turmaId: t.id } });
      await tx.materialApoio.deleteMany({ where: { turmaId: t.id } });
      await tx.aviso.deleteMany({ where: { turmaId: t.id } });
      await tx.matricula.deleteMany({ where: { turmaId: t.id } });
    }
    await tx.turma.deleteMany({ where: { professorId: targetId } });
    const remover = await apagarArquivos(tx, arquivos);
    await tx.usuario.delete({ where: { id: targetId } });
    return remover;
  });
  await removerDoDisco(caminhos);

  res.status(204).send();
}

// ─── Promoção de aluno para professor ───────────────────────────────────────

/**
 * Muda o papel para professor. Submissões e feedbacks ficam como histórico;
 * só as matrículas saem, para ele não aparecer como aluno nas turmas.
 */
export async function promoteAluno(req: AuthRequest, res: Response) {
  const alunoId = parseInt(req.params.id, 10);
  if (Number.isNaN(alunoId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const aluno = await prisma.usuario.findFirst({ where: { id: alunoId, papel: 'aluno' } });
  if (!aluno) {
    res.status(404).json({ error: 'Aluno não encontrado' });
    return;
  }

  const novoProfessor = await prisma.$transaction(async (tx) => {
    await tx.matricula.deleteMany({ where: { alunoId } });
    return tx.usuario.update({
      where: { id: alunoId },
      // O papel vai no token: a sessão antiga (de aluno) deixa de valer
      data: { papel: 'professor', versaoToken: { increment: 1 } },
      select: { id: true, nome: true, email: true },
    });
  });

  res.status(201).json({ professor: novoProfessor });
}
