import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types/index.js';
import { anexoDaRequisicao } from '../middlewares/upload.js';
import { comArquivo } from '../arquivoPublico.js';
import { id, validar } from '../validacao.js';
import * as submissoes from '../../services/submissoes.js';

const paramsNovaEntrega = z.object({ id: id('Atividade inválida') });
const paramsId = z.object({ id: id() });
// Texto da entrega (opcional); outro tipo é ignorado, como antes
const novaEntregaSchema = z.object({
  conteudo: z.unknown().transform((v) => (typeof v === 'string' ? v : undefined)),
});
const MSG_STATUS = 'Envie status: "aprovado" ou "reprovado"';
const avaliacaoSchema = z.object({ status: z.enum(['aprovado', 'reprovado'], { error: MSG_STATUS }) });

/** POST /atividades/:id/submissoes — requireRole('aluno'); multipart com `arquivo` opcional */
export async function createSubmission(req: AuthRequest, res: Response) {
  const { id: atividadeId } = validar(paramsNovaEntrega, req.params);
  const { conteudo } = validar(novaEntregaSchema, req.body);
  const submissao = await submissoes.criarSubmissao(req.user.id, atividadeId, conteudo, anexoDaRequisicao(req, req.user.id));
  res.status(201).json(comArquivo(submissao));
}

/** GET /atividades/:id/submissoes — requireRole('professor') */
export async function listSubmissionsByActivity(req: AuthRequest, res: Response) {
  const { id: atividadeId } = validar(paramsId, req.params);
  const lista = await submissoes.listarSubmissoes(req.user.id, atividadeId);
  res.json(lista.map(comArquivo));
}

/** PATCH /professor/submissoes/:id — requireRole('professor') */
export async function updateSubmissionStatus(req: AuthRequest, res: Response) {
  const { id } = validar(paramsId, req.params);
  const { status } = validar(avaliacaoSchema, req.body);
  res.json(comArquivo(await submissoes.avaliarSubmissao(req.user.id, id, status)));
}
