import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types/index.js';
import { id, texto, textoOpcional, validar } from '../validacao.js';
import * as avisos from '../../services/avisos.js';

const paramsTurma = z.object({ turmaId: id('Turma inválida') });
const paramsAviso = z.object({ turmaId: id(), avisoId: id() });
const novoAvisoSchema = z.object({
  titulo: texto('Título é obrigatório'),
  conteudo: textoOpcional('Conteúdo inválido').transform((v) => v || null),
  link: textoOpcional('Link inválido').transform((v) => v || null),
});

/** GET /turmas/:turmaId/avisos */
export async function listAvisos(req: AuthRequest, res: Response) {
  const { turmaId } = validar(paramsTurma, req.params);
  res.json(await avisos.listarAvisos(req.user, turmaId));
}

/** POST /turmas/:turmaId/avisos — requireRole('professor') */
export async function createAviso(req: AuthRequest, res: Response) {
  const { turmaId } = validar(paramsTurma, req.params);
  const dados = validar(novoAvisoSchema, req.body);
  res.status(201).json(await avisos.criarAviso(req.user.id, turmaId, dados));
}

/** DELETE /turmas/:turmaId/avisos/:avisoId — requireRole('professor') */
export async function deleteAviso(req: AuthRequest, res: Response) {
  const { turmaId, avisoId } = validar(paramsAviso, req.params);
  await avisos.apagarAviso(req.user.id, turmaId, avisoId);
  res.status(204).send();
}
