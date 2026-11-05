import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import {
  getTrilha,
  getLicao,
  verificarExercicio,
  enviarQuiz,
  listarRevisao,
  responderRevisao,
  iniciarTeste,
  finalizarTentativa,
  atualizarPerfil,
} from '../controllers/CursoController.js';

// Curso autoguiado — aluno. Contrato em docs/api-curso.md.
const router = Router();
router.use(authenticateToken, requireRole('aluno'));

router.get('/', h(getTrilha));
router.get('/licoes/:id', h(getLicao));
router.post('/exercicios/:id/verificar', h(verificarExercicio));
router.post('/licoes/:id/quiz', h(enviarQuiz));
router.get('/revisao', h(listarRevisao));
router.post('/revisao/:exercicioId', h(responderRevisao));
router.post('/modulos/:id/teste', h(iniciarTeste));
router.post('/tentativas/:id', h(finalizarTentativa));
router.patch('/perfil', h(atualizarPerfil));

export { router as cursoRouter };
