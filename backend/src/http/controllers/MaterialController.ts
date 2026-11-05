import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';
import { idParam } from './cursoApoio.js';

const TIPOS_MATERIAL = new Set(['pdf', 'audio', 'video', 'link']);

/** Só links http(s): evita `javascript:` e apontar para o upload de outra pessoa (que o delete apagaria). */
function urlExterna(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  try {
    const url = new URL(valor.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function createMaterial(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const turmaId = idParam(req.params.id);
  if (!turmaId) {
    res.status(400).json({ error: 'Turma inválida' });
    return;
  }
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }
  if (turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const { titulo, tipo, url } = req.body;
  const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
  const urlArquivo = file ? `/uploads/${file.filename}` : urlExterna(url);

  if (typeof titulo !== 'string' || !titulo.trim() || !TIPOS_MATERIAL.has(tipo) || !urlArquivo) {
    res.status(400).json({ error: 'Informe título, tipo e um arquivo ou URL' });
    return;
  }

  const material = await prisma.materialApoio.create({ data: { titulo, tipo, urlArquivo, turmaId } });
  res.status(201).json(material);
}

export async function deleteMaterial(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  // Montado em /turmas/:id/materiais
  const turmaId = idParam(req.params.id);
  const materialId = idParam(req.params.materialId);
  if (!turmaId || !materialId) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }
  if (turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const material = await prisma.materialApoio.findFirst({ where: { id: materialId, turmaId } });
  if (!material) {
    res.status(404).json({ error: 'Material não encontrado' });
    return;
  }

  if (material.urlArquivo.startsWith('/uploads/')) {
    const filePath = path.join('uploads', path.basename(material.urlArquivo));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await prisma.materialApoio.delete({ where: { id: materialId } });
  res.status(204).send();
}

export async function listMaterialsByClass(req: AuthRequest, res: Response) {
  const turmaId = idParam(req.params.id);
  if (!turmaId) {
    res.status(400).json({ error: 'Turma inválida' });
    return;
  }
  const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
  if (!turma) {
    res.status(404).json({ error: 'Turma não encontrada' });
    return;
  }

  if (req.user.role === 'professor' && turma.professorId !== req.user.id) {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }
  if (req.user.role === 'aluno') {
    const enrolled = await prisma.matricula.findFirst({ where: { turmaId, alunoId: req.user.id } });
    if (!enrolled) { res.status(403).json({ error: 'Acesso negado' }); return; }
  }

  const materiais = await prisma.materialApoio.findMany({ where: { turmaId } });
  res.json(materiais);
}
