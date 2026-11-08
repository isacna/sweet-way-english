import { Router } from 'express';
import { prisma } from '../../database/client.js';
import { h } from '../asyncHandler.js';
import { authRouter } from './auth.routes.js';
import { classRouter } from './class.routes.js';
import { studentRouter } from './student.routes.js';
import { activityRouter, professorActivityRouter } from './activity.routes.js';
import { submissionRouter, professorSubmissionRouter } from './submission.routes.js';
import { feedbackRouter, studentFeedbackRouter } from './feedback.routes.js';
import { materialRouter } from './material.routes.js';
import { adminRouter } from './admin.routes.js';
import { avisoRouter } from './aviso.routes.js';
import { cursoRouter } from './curso.routes.js';
import { conteudoRouter, progressoRouter } from './conteudo.routes.js';

const router = Router();

// Usado pelo healthcheck do Docker e pelo monitoramento: 503 se o banco não responde
router.get(
  '/health',
  h(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok' });
    } catch (err) {
      console.error('Health check: banco indisponível', err);
      res.status(503).json({ status: 'erro', error: 'Banco de dados indisponível' });
    }
  })
);

router.use('/auth', authRouter);
router.use('/turmas', classRouter);
router.use('/turmas/:turmaId/atividades', activityRouter);
router.use('/turmas/:turmaId/avisos', avisoRouter);
router.use('/turmas/:id/materiais', materialRouter);
router.use('/professor/alunos', studentRouter);
router.use('/professor/atividades', professorActivityRouter);
router.use('/professor/submissoes', professorSubmissionRouter);
router.use('/atividades/:id/submissoes', submissionRouter);
router.use('/submissoes/:id/feedback', feedbackRouter);
router.use('/alunos', studentFeedbackRouter);
router.use('/curso', cursoRouter);
router.use('/conteudo', conteudoRouter);
router.use('/professor/progresso', progressoRouter);
router.use('/', adminRouter);

export { router };
