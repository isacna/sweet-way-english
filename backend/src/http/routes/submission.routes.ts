import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../../config/multer.js';
import { createSubmission, listSubmissionsByActivity, updateSubmissionStatus } from '../controllers/SubmissionController.js';
import { h } from '../asyncHandler.js';

const router = Router({ mergeParams: true });

// Mounted at /atividades/:id/submissoes
router.post('/', authenticateToken, upload.single('arquivo'), h(createSubmission));
router.get('/', authenticateToken, h(listSubmissionsByActivity));

export { router as submissionRouter };

// Separate router for /professor/submissoes
export const professorSubmissionRouter = Router();
professorSubmissionRouter.patch('/:id', authenticateToken, h(updateSubmissionStatus));
