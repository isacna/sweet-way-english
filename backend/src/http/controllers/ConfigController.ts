import { Request, Response } from 'express';
import { z } from 'zod';
import { pastaUploads } from '../../storage/arquivos.js';
import { arquivoRecebido } from '../middlewares/upload.js';
import { AuthRequest } from '../../types/index.js';
import { iniciarSessao } from '../sessao.js';
import { edicaoUsuarioSchema, email, ERRO_SENHA, id, SENHA_MIN, texto, validar } from '../validacao.js';
import { ErroValidacao } from '../../services/erros.js';
import * as configuracao from '../../services/configuracao.js';
import * as professores from '../../services/professores.js';

const MSG_OBRIGATORIOS = 'Nome, email e senha são obrigatórios';
const novoProfessorSchema = z.object({
  nome: texto(MSG_OBRIGATORIOS),
  email: email(MSG_OBRIGATORIOS),
  senha: z
    .string({ error: MSG_OBRIGATORIOS })
    .min(1, MSG_OBRIGATORIOS)
    .refine((s) => s.trim().length >= SENHA_MIN, ERRO_SENHA),
});
const edicaoSchema = edicaoUsuarioSchema({ aparar: true });
const paramsId = z.object({ id: id() });

// ─── Configuração da aplicação ──────────────────────────────────────────────

/** GET /configuracoes (público) */
export async function getConfig(_req: Request, res: Response) {
  res.json(await configuracao.configuracaoPublica());
}

/** GET /configuracoes/logo — a logo é o único upload público (aparece antes do login). */
export async function getLogo(_req: Request, res: Response) {
  const caminho = await configuracao.caminhoDaLogo();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(caminho, { root: pastaUploads(), maxAge: '1d', dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Logo não encontrada' });
  });
}

/** PATCH /configuracoes/logo — requireAdmin; receberArquivo('logo', { somenteImagem: true }) já conferiu os bytes */
export async function uploadLogo(req: AuthRequest, res: Response) {
  const arquivo = arquivoRecebido(req);
  if (!arquivo) throw new ErroValidacao('Nenhum arquivo enviado');
  res.json(await configuracao.trocarLogo(arquivo));
}

// ─── Perfil do professor logado ─────────────────────────────────────────────

/** GET /professor/me — requireRole('professor') */
export async function getProfessorMe(req: AuthRequest, res: Response) {
  res.json(await professores.perfil(req.user.id));
}

/** PATCH /professor/me — requireRole('professor') */
export async function updateProfessorMe(req: AuthRequest, res: Response) {
  const edicao = validar(edicaoSchema, req.body);
  const { professor, sessao } = await professores.atualizarPerfil(req.user.id, edicao);
  // Trocou a própria senha: as outras sessões caem, mas esta continua com um cookie novo
  if (sessao) iniciarSessao(res, sessao);
  res.json(professor);
}

// ─── Gestão de professores (requireAdmin) ───────────────────────────────────

export async function listAllProfessors(_req: AuthRequest, res: Response) {
  res.json(await professores.listarProfessores());
}

export async function createProfessorAdmin(req: AuthRequest, res: Response) {
  const dados = validar(novoProfessorSchema, req.body);
  res.status(201).json(await professores.criarProfessor(dados));
}

export async function updateProfessorAdmin(req: AuthRequest, res: Response) {
  const { id: alvoId } = validar(paramsId, req.params);
  const edicao = validar(edicaoSchema, req.body);
  res.json(await professores.atualizarProfessor(req.user.id, alvoId, edicao));
}

export async function deleteProfessorAdmin(req: AuthRequest, res: Response) {
  const { id: alvoId } = validar(paramsId, req.params);
  await professores.excluirProfessor(req.user.id, alvoId);
  res.status(204).send();
}

/** POST /admin/alunos/:id/promover — requireAdmin */
export async function promoteAluno(req: AuthRequest, res: Response) {
  const { id: alunoId } = validar(paramsId, req.params);
  res.status(201).json({ professor: await professores.promoverAluno(alunoId) });
}
