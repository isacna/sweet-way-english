import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';

export async function createMaterial(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const turmaId = parseInt(req.params.id);
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
  const urlArquivo = file ? `/uploads/${file.filename}` : url;

  if (!titulo || !tipo || !urlArquivo) {
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

  const turmaId = parseInt(req.params.turmaId);
  const materialId = parseInt(req.params.materialId);

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
  const turmaId = parseInt(req.params.id);
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
