import { Router, type RequestHandler, type Response } from 'express';
import type { AuthRequest } from '../../types/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import {
  listarConteudo,
  getLicaoConteudo,
  salvarLicao,
  alterarStatusLicao,
  alterarStatusModulo,
  getTesteModulo,
  verificarItem,
} from '../controllers/ConteudoController.js';
import { progressoAlunos } from '../controllers/ProgressoController.js';

// Curso autoguiado — professora (revisão/publicação do conteúdo e progresso dos alunos).
// Controllers recebem AuthRequest (garantido por authenticateToken); erros assíncronos vão para o errorHandler
// (o Express 4 não captura promessas rejeitadas sozinho).
const h =
  (fn: (req: AuthRequest, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req as AuthRequest, res).catch(next);
  };

const conteudoRouter = Router();
conteudoRouter.use(authenticateToken, requireRole('professor'));
conteudoRouter.get('/', h(listarConteudo));
conteudoRouter.get('/licoes/:id', h(getLicaoConteudo));
conteudoRouter.put('/licoes/:id', h(salvarLicao));
conteudoRouter.patch('/licoes/:id/status', h(alterarStatusLicao));
conteudoRouter.patch('/modulos/:id/status', h(alterarStatusModulo));
conteudoRouter.get('/modulos/:id/teste', h(getTesteModulo));
conteudoRouter.post('/exercicios/verificar', h(verificarItem));

const progressoRouter = Router();
progressoRouter.get('/', authenticateToken, requireRole('professor'), h(progressoAlunos));

export { conteudoRouter, progressoRouter };
