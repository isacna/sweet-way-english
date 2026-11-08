import { Response } from 'express';
import { prisma } from '../../database/client.js';
import { TipoMaterial } from '../../database/generated/prisma/client.js';
import { AuthRequest } from '../../types/index.js';
import { apagarArquivos, removerDoDisco } from '../../storage/arquivos.js';
import { arquivoRecebido, salvarArquivoRecebido } from '../middlewares/upload.js';
import { arquivoResumoSelect, materialPublico } from '../arquivoPublico.js';

const incluirArquivo = { arquivo: { select: arquivoResumoSelect } } as const;

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

  const { titulo, tipo } = req.body ?? {};
  const arquivo = arquivoRecebido(req);
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';

  if (!titulo || !tipo || (!arquivo && !url)) {
    res.status(400).json({ error: 'Informe título, tipo e um arquivo ou URL' });
    return;
  }
  // `tipo` é enum no banco: um valor desconhecido viraria erro 500 do Prisma
  if (!Object.values(TipoMaterial).includes(tipo)) {
    res.status(400).json({ error: `Tipo inválido. Use: ${Object.values(TipoMaterial).join(', ')}` });
    return;
  }
  if (!arquivo && !/^https?:\/\//i.test(url)) {
    res.status(400).json({ error: 'A URL precisa começar com http:// ou https://' });
    return;
  }

  // Com arquivo, a URL enviada junto é ignorada (o material é upload OU link: CHECK no banco)
  const material = arquivo
    ? await salvarArquivoRecebido(req, req.user.id, (tx, a) =>
        tx.materialApoio.create({ data: { titulo, tipo, turmaId, arquivoId: a.id }, include: incluirArquivo }),
      )
    : await prisma.materialApoio.create({ data: { titulo, tipo, turmaId, url }, include: incluirArquivo });
  res.status(201).json(materialPublico(material));
}

export async function deleteMaterial(req: AuthRequest, res: Response) {
  if (req.user.role !== 'professor') {
    res.status(403).json({ error: 'Acesso negado' });
    return;
  }

  // A rota é /turmas/:id/materiais/:materialId (o nome antigo do parâmetro era turmaId)
  const turmaId = parseInt(req.params.id ?? req.params.turmaId);
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

  const caminhos = await prisma.$transaction(async (tx) => {
    await tx.materialApoio.delete({ where: { id: materialId } });
    return apagarArquivos(tx, [material.arquivoId]);
  });
  await removerDoDisco(caminhos);
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

  const materiais = await prisma.materialApoio.findMany({ where: { turmaId }, include: incluirArquivo });
  res.json(materiais.map(materialPublico));
}
