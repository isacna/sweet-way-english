import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { uploadUnico } from '../../config/multer.js';
import { createSubmission, listSubmissionsByActivity, updateSubmissionStatus } from '../controllers/SubmissionController.js';

const router = Router({ mergeParams: true });

// Mounted at /atividades/:id/submissoes
// Papel checado antes do multer, para não gravar arquivo de quem não pode enviar
router.post('/', authenticateToken, requireRole('aluno'), ...uploadUnico('arquivo'), h(createSubmission));
router.get('/', authenticateToken, h(listSubmissionsByActivity));

export { router as submissionRouter };

// Separate router for /professor/submissoes
export const professorSubmissionRouter = Router();
professorSubmissionRouter.patch('/:id', authenticateToken, h(updateSubmissionStatus));
