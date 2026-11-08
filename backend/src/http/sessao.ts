// Sessão: o JWT vai num cookie httpOnly (o frontend não consegue ler) e continua aceito como Bearer para clientes de API.
import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Papel } from '../types/index.js';

export const COOKIE_SESSAO = 'sw_sessao';

/** Campos do usuário usados para emitir o token e montar a resposta do login/`/auth/me`. */
export interface UsuarioSessao {
  id: number;
  nome: string;
  email: string;
  papel: Papel;
  admin: boolean;
  versaoToken: number;
}

function opcoesCookie(): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure: env.cookieSecure };
}

/** O objeto `user` devolvido pelo login e por `GET /auth/me`. */
export function usuarioPublico(u: UsuarioSessao) {
  return { id: u.id, nome: u.nome, email: u.email, role: u.papel, admin: u.admin };
}

/** Assina o JWT (com `v` = versaoToken) e grava o cookie de sessão. Devolve o token para clientes de API. */
export function iniciarSessao(res: Response, u: UsuarioSessao): string {
  const token = jwt.sign(
    { id: u.id, email: u.email, role: u.papel, admin: u.admin, v: u.versaoToken },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
  );
  res.cookie(COOKIE_SESSAO, token, { ...opcoesCookie(), maxAge: env.sessaoMaxAgeMs });
  return token;
}

export function encerrarSessao(res: Response) {
  res.clearCookie(COOKIE_SESSAO, opcoesCookie());
}
