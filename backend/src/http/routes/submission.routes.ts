import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { receberArquivo } from '../middlewares/upload.js';
import { createSubmission, listSubmissionsByActivity, updateSubmissionStatus } from '../controllers/SubmissionController.js';
import { h } from '../asyncHandler.js';

const router = Router({ mergeParams: true });

// Mounted at /atividades/:id/submissoes
router.post('/', authenticateToken, requireRole('aluno'), receberArquivo('arquivo'), h(createSubmission));
router.get('/', authenticateToken, requireRole('professor'), h(listSubmissionsByActivity));

export { router as submissionRouter };

// Separate router for /professor/submissoes
export const professorSubmissionRouter = Router();
professorSubmissionRouter.patch('/:id', authenticateToken, requireRole('professor'), h(updateSubmissionStatus));
