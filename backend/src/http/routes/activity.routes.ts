import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { receberArquivo } from '../middlewares/upload.js';
import { createActivity, updateActivity, listActivitiesByClass } from '../controllers/ActivityController.js';
import { h } from '../asyncHandler.js';

// Mounted at /turmas/:turmaId/atividades
const activityRouter = Router({ mergeParams: true });
// JSON ou multipart com o anexo opcional `arquivo`
activityRouter.post('/', authenticateToken, requireRole('professor'), receberArquivo('arquivo'), h(createActivity));
activityRouter.get('/', authenticateToken, requireRole('professor', 'aluno'), h(listActivitiesByClass));

// Mounted at /professor/atividades
const professorActivityRouter = Router();
professorActivityRouter.patch('/:id', authenticateToken, requireRole('professor'), receberArquivo('arquivo'), h(updateActivity));

export { activityRouter, professorActivityRouter };
