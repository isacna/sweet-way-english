import type { Request, Response } from 'express';
import { z } from 'zod';
import { validar } from '../validacao.js';
import { cancelarLembretes } from '../../services/lembretes.js';

export const MSG_LEMBRETES_CANCELADOS = 'Pronto! Você não vai mais receber lembretes de estudo por e-mail.';
const ERRO_LINK = 'Link inválido ou expirado. Entre na sua conta para desligar os lembretes no painel.';

const cancelarSchema = z.object({ token: z.string({ error: ERRO_LINK }).trim().min(1, ERRO_LINK).max(2000, ERRO_LINK) });

/**
 * POST /lembretes/cancelar (público): desliga os lembretes de quem é dono do token do e-mail.
 * O token vem no corpo (página /lembretes/cancelar) ou na query (botão "cancelar inscrição" do provedor de e-mail,
 * que faz um POST sem JSON no endereço do cabeçalho List-Unsubscribe).
 */
export async function cancelar(req: Request, res: Response) {
  const corpo = (req.body ?? {}) as { token?: unknown };
  const { token } = validar(cancelarSchema, { token: corpo.token ?? req.query?.token });
  await cancelarLembretes(token);
  res.json({ message: MSG_LEMBRETES_CANCELADOS });
}
