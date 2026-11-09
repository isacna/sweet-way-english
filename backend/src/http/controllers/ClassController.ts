import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types/index.js';
import { comArquivo, materialPublico } from '../arquivoPublico.js';
import { id, texto, textoOpcional, validar } from '../validacao.js';
import * as turmas from '../../services/turmas.js';

const novaTurmaSchema = z.object({
  nome: texto('Nome da turma é obrigatório'),
  descricao: textoOpcional('Descrição inválida'),
});
const paramsTurma = z.object({ id: id() });
// Maiúsculas: o aluno pode digitar o código em minúsculas
const entrarSchema = z.object({ codigoConvite: texto('Informe o código de convite').transform((c) => c.toUpperCase()) });

/** POST /turmas — requireRole('professor') */
export async function createClass(req: AuthRequest, res: Response) {
  const dados = validar(novaTurmaSchema, req.body);
  res.status(201).json(await turmas.criarTurma(req.user.id, dados));
}

/** GET /turmas */
export async function listClasses(req: AuthRequest, res: Response) {
  res.json(await turmas.listarTurmas(req.user));
}

/** GET /turmas/:id */
export async function getClassById(req: AuthRequest, res: Response) {
  const { id } = validar(paramsTurma, req.params);
  const turma = await turmas.detalharTurma(req.user, id);
  res.json({ ...turma, atividades: turma.atividades.map(comArquivo), materiais: turma.materiais.map(materialPublico) });
}

/** POST /turmas/entrar — requireRole('aluno') */
export async function joinClass(req: AuthRequest, res: Response) {
  const { codigoConvite } = validar(entrarSchema, req.body);
  await turmas.entrarNaTurma(req.user.id, codigoConvite);
  res.json({ message: 'Matriculado com sucesso' });
}
