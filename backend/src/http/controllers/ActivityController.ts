import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types/index.js';
import { anexoDaRequisicao } from '../middlewares/upload.js';
import { comArquivo } from '../arquivoPublico.js';
import { booleano, id, lerBooleano, texto, validar } from '../validacao.js';
import * as atividades from '../../services/atividades.js';
import type { EdicaoAtividade } from '../../services/atividades.js';

const paramsTurma = z.object({ turmaId: id('Turma inválida') });
const paramsAtividade = z.object({ id: id() });

const dataEntrega = z.coerce.date({ error: 'Data de entrega inválida' });
/** undefined = não mexe; null ou "" = sem link */
const link = z
  .union([z.string(), z.null()], { error: 'Link inválido' })
  .optional()
  .transform((v) => (v === undefined ? undefined : v?.trim() || null));
const opcional = <T extends z.ZodType>(s: T) => z.preprocess((v) => v ?? undefined, s.optional());

// JSON ou multipart (com o anexo opcional da professora no campo `arquivo`)
const novaAtividadeSchema = z.object({
  titulo: texto('Título é obrigatório'),
  descricao: texto('Descrição é obrigatória'),
  dataEntrega,
  arquivoObrigatorio: booleano,
  link: link.transform((v) => v ?? null),
});

const edicaoSchema = z.object({
  titulo: opcional(texto('Título não pode ser vazio')),
  descricao: opcional(texto('Descrição não pode ser vazia')),
  dataEntrega: opcional(dataEntrega),
  arquivoObrigatorio: z.unknown().transform((v) => (v === undefined ? undefined : lerBooleano(v))),
  link,
  removerArquivo: booleano,
});

/** POST /turmas/:turmaId/atividades — requireRole('professor') */
export async function createActivity(req: AuthRequest, res: Response) {
  const { turmaId } = validar(paramsTurma, req.params);
  const dados = validar(novaAtividadeSchema, req.body);
  const atividade = await atividades.criarAtividade(req.user.id, turmaId, dados, anexoDaRequisicao(req, req.user.id));
  res.status(201).json(comArquivo(atividade));
}

/** PATCH /professor/atividades/:id — requireRole('professor') */
export async function updateActivity(req: AuthRequest, res: Response) {
  const { id } = validar(paramsAtividade, req.params);
  const corpo = validar(edicaoSchema, req.body);
  // Só os campos enviados entram no update
  const edicao = Object.fromEntries(Object.entries(corpo).filter(([, v]) => v !== undefined)) as EdicaoAtividade;
  const atividade = await atividades.atualizarAtividade(req.user.id, id, edicao, anexoDaRequisicao(req, req.user.id));
  res.json(comArquivo(atividade));
}

/** GET /turmas/:turmaId/atividades */
export async function listActivitiesByClass(req: AuthRequest, res: Response) {
  const { turmaId } = validar(paramsTurma, req.params);
  const lista = await atividades.listarAtividades(req.user, turmaId);
  res.json(lista.map((a) => ({ ...comArquivo(a), submissoes: a.submissoes.map(comArquivo) })));
}
