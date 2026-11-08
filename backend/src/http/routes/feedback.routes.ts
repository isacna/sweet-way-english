import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { createFeedback, getMyFeedbacks } from '../controllers/FeedbackController.js';

// Mounted at /submissoes/:id/feedback
export const feedbackRouter = Router({ mergeParams: true });
feedbackRouter.post('/', authenticateToken, requireRole('professor'), h(createFeedback));

// Mounted at /alunos/me/feedbacks
export const studentFeedbackRouter = Router();
studentFeedbackRouter.get('/me/feedbacks', authenticateToken, requireRole('aluno'), h(getMyFeedbacks));
