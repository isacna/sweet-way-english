import { Response } from 'express';
import { z } from 'zod';
import { TipoMaterial } from '../../database/generated/prisma/client.js';
import { AuthRequest } from '../../types/index.js';
import { anexoDaRequisicao } from '../middlewares/upload.js';
import { materialPublico } from '../arquivoPublico.js';
import { id, texto, validar } from '../validacao.js';
import * as materiais from '../../services/materiais.js';

const MSG_FALTA = 'Informe título, tipo e um arquivo ou URL';
const TIPOS = Object.values(TipoMaterial) as [TipoMaterial, ...TipoMaterial[]];

// A rota é /turmas/:id/materiais
const paramsTurma = z.object({ id: id('Turma inválida') });
const paramsMaterial = z.object({ id: id('Turma inválida'), materialId: id() });
const novoMaterialSchema = z.object({
  titulo: texto(MSG_FALTA),
  // `tipo` é enum no banco: um valor desconhecido viraria erro 500 do Prisma
  tipo: z
    .string({ error: MSG_FALTA })
    .min(1, MSG_FALTA)
    .pipe(z.enum(TIPOS, { error: `Tipo inválido. Use: ${TIPOS.join(', ')}` })),
  url: z.unknown().transform((v) => (typeof v === 'string' ? v.trim() : '')),
});

/** POST /turmas/:id/materiais — requireRole('professor'); multipart com `arquivo` ou JSON com `url` */
export async function createMaterial(req: AuthRequest, res: Response) {
  const { id: turmaId } = validar(paramsTurma, req.params);
  const dados = validar(novoMaterialSchema, req.body);
  const material = await materiais.criarMaterial(req.user.id, turmaId, dados, anexoDaRequisicao(req, req.user.id));
  res.status(201).json(materialPublico(material));
}

/** DELETE /turmas/:id/materiais/:materialId — requireRole('professor') */
export async function deleteMaterial(req: AuthRequest, res: Response) {
  const { id: turmaId, materialId } = validar(paramsMaterial, req.params);
  await materiais.apagarMaterial(req.user.id, turmaId, materialId);
  res.status(204).send();
}

/** GET /turmas/:id/materiais */
export async function listMaterialsByClass(req: AuthRequest, res: Response) {
  const { id: turmaId } = validar(paramsTurma, req.params);
  const lista = await materiais.listarMateriais(req.user, turmaId);
  res.json(lista.map(materialPublico));
}
