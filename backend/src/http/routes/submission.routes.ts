import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../../config/multer.js';
import { createSubmission, listSubmissionsByActivity, updateSubmissionStatus } from '../controllers/SubmissionController.js';

const router = Router({ mergeParams: true });

// Mounted at /atividades/:id/submissoes
router.post('/', authenticateToken, upload.single('arquivo'), createSubmission as any);
router.get('/', authenticateToken, listSubmissionsByActivity as any);

export { router as submissionRouter };

// Separate router for /professor/submissoes
export const professorSubmissionRouter = Router();
professorSubmissionRouter.patch('/:id', authenticateToken, updateSubmissionStatus as any);
