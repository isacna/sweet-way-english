import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../types/index.js';
import { comArquivo } from '../arquivoPublico.js';
import { id, texto, validar } from '../validacao.js';
import * as feedbacks from '../../services/feedbacks.js';

const paramsSubmissao = z.object({ id: id() });
const MSG_NOTA = 'Nota inválida';
const novoFeedbackSchema = z.object({
  comentario: texto('Comentário é obrigatório'),
  // O formulário manda a nota como texto ("8.5"); JSON pode mandar número
  nota: z
    .union([z.number(), z.string().trim().min(1, MSG_NOTA)], { error: MSG_NOTA })
    .transform(Number)
    .pipe(z.number({ error: MSG_NOTA }).refine((n) => Number.isFinite(n) && n >= 0, MSG_NOTA)),
});

/** POST /submissoes/:id/feedback — requireRole('professor') */
export async function createFeedback(req: AuthRequest, res: Response) {
  const { id: submissaoId } = validar(paramsSubmissao, req.params);
  const dados = validar(novoFeedbackSchema, req.body);
  res.status(201).json(await feedbacks.criarFeedback(req.user.id, submissaoId, dados));
}

/** GET /alunos/me/feedbacks — requireRole('aluno') */
export async function getMyFeedbacks(req: AuthRequest, res: Response) {
  const lista = await feedbacks.feedbacksDoAluno(req.user.id);
  res.json(lista.map((f) => ({ ...f, submissao: comArquivo(f.submissao) })));
}
