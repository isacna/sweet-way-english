import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { AuthRequest } from '../../types/index.js';

export async function listAvisos(req: AuthRequest, res: Response) {
  const turmaId = parseInt(req.params.turmaId, 10);
  if (Number.isNaN(turmaId)) {
    res.status(400).json({ error: 'Turma inválida' });
    return;
  }

  // Verificar acesso: professor dono ou aluno matriculado
  if (req.user.role === 'professor') {
    const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId: req.user.id } });
    if (!turma) { res.status(403).json({ error: 'Acesso negado' }); return; }
  } else {
    const matricula = await prisma.matricula.findFirst({ where: { turmaId, alunoId: req.user.id } });
    if (!matricula) { res.status(403).json({ error: 'Acesso negado' }); return; }
  }

  const avisos = await prisma.aviso.findMany({
    where: { turmaId },
    orderBy: { criadoEm: 'desc' },
  });

  res.json(avisos);
}

export async function createAviso(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const turmaId = parseInt(req.params.turmaId, 10);
  if (Number.isNaN(turmaId)) {
    res.status(400).json({ error: 'Turma inválida' });
    return;
  }

  const turma = await prisma.turma.findFirst({ where: { id: turmaId, professorId: req.user.id } });
  if (!turma) { res.status(403).json({ error: 'Turma não encontrada' }); return; }

  const { titulo, conteudo, link } = req.body;
  if (!titulo || !String(titulo).trim()) {
    res.status(400).json({ error: 'Título é obrigatório' });
    return;
  }

  const aviso = await prisma.aviso.create({
    data: {
      titulo: String(titulo).trim(),
      conteudo: conteudo ? String(conteudo).trim() : null,
      link: link ? String(link).trim() : null,
      turmaId,
    },
  });

  res.status(201).json(aviso);
}

export async function deleteAviso(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  const turmaId = parseInt(req.params.turmaId, 10);
  const avisoId = parseInt(req.params.avisoId, 10);
  if (Number.isNaN(turmaId) || Number.isNaN(avisoId)) {
    res.status(400).json({ error: 'ID inválido' });
    return;
  }

  const aviso = await prisma.aviso.findFirst({
    where: { id: avisoId, turmaId, turma: { professorId: req.user.id } },
  });
  if (!aviso) { res.status(404).json({ error: 'Aviso não encontrado' }); return; }

  await prisma.aviso.delete({ where: { id: avisoId } });
  res.status(204).send();
}
