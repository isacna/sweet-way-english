// Validação de entrada das rotas (zod). Os controllers chamam `validar(schema, req.body | req.params | req.query)`:
// se falhar, lança ErroValidacao (400) com a mensagem da primeira falha, que o errorHandler devolve como
// `{ error: mensagem }`. As mensagens são as mesmas que as rotas antigas já devolviam.
import { z } from 'zod';
import { ErroValidacao } from '../services/erros.js';

export function validar<S extends z.ZodType>(schema: S, valor: unknown): z.output<S> {
  const r = schema.safeParse(valor ?? {});
  if (!r.success) throw new ErroValidacao(r.error.issues[0]?.message ?? 'Dados inválidos');
  return r.data;
}

/** Maior valor de uma coluna `Int` do Postgres: acima disso o Prisma falharia com 500. */
const INT_MAX = 2_147_483_647;

/** Id numérico vindo da URL: inteiro positivo, só dígitos (nada de "1abc", "1.5", " 1"). */
export function id(mensagem = 'ID inválido') {
  return z
    .string({ error: mensagem })
    .regex(/^\d{1,10}$/, mensagem)
    .transform(Number)
    .refine((n) => n >= 1 && n <= INT_MAX, mensagem);
}

/** Id numérico vindo do corpo (número em JSON ou texto em multipart/formulário). */
export function idCorpo(mensagem: string) {
  return z
    .union([z.number(), z.string().trim().min(1, mensagem)], { error: mensagem })
    .transform(Number)
    .pipe(z.number({ error: mensagem }).int(mensagem).min(1, mensagem).max(INT_MAX, mensagem));
}

/** Texto obrigatório: aparado e não vazio. */
export function texto(mensagem: string) {
  return z.string({ error: mensagem }).trim().min(1, mensagem);
}

/** Texto opcional: aparado; `null` e "" contam como ausente. */
export function textoOpcional(mensagem: string) {
  return z.preprocess(
    (v) => (v === null || v === '' ? undefined : v),
    z.string({ error: mensagem }).trim().optional(),
  ).optional(); // sem o .optional() de fora, o zod >= 4.5 exige a chave
}

/** Booleano vindo de JSON (true) ou de multipart ("true", "1", "on"). Qualquer outra coisa é false. */
export function lerBooleano(v: unknown) {
  return v === true || v === 'true' || v === '1' || v === 'on' || v === 1;
}

// Desde o zod 4.5, `z.unknown()` num objeto exige a chave: o `.optional()` antes do transform a deixa ausente
export const booleano = z.unknown().optional().transform(lerBooleano);

// ─── Usuários (alunos e professores) ────────────────────────────────────────

export const SENHA_MIN = 6; // mesma regra do cadastro público (AuthController)
export const ERRO_SENHA = `A senha precisa ter pelo menos ${SENHA_MIN} caracteres`;

export const email = (mensagemVazio: string) =>
  z.string({ error: mensagemVazio }).trim().toLowerCase().min(1, mensagemVazio).pipe(z.email('Email inválido'));

/**
 * Edição de perfil (PATCH): cada campo é opcional, mas se vier não pode ser vazio. Senha vazia é ignorada
 * (o formulário manda "" quando a senha não muda). `aparar`: a senha é aparada antes de medir e gravar.
 */
export function edicaoUsuarioSchema({ aparar }: { aparar: boolean }) {
  return z.object({
    nome: z.preprocess((v) => (v === null ? undefined : v), texto('Nome não pode ser vazio').optional()).optional(),
    email: z.preprocess((v) => (v === null ? undefined : v), email('Email não pode ser vazio').optional()).optional(),
    senha: z
      .unknown()
      .optional()
      .transform((v) => (v === undefined || v === null ? '' : String(v)))
      .transform((v) => (aparar ? v.trim() : v))
      .refine((v) => v.trim() === '' || v.length >= SENHA_MIN, ERRO_SENHA)
      .transform((v) => (v.trim() === '' ? undefined : v)),
  });
}
