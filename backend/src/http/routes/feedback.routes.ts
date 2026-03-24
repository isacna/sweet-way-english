import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { createFeedback, getMyFeedbacks } from '../controllers/FeedbackController.js';

// Mounted at /submissoes/:id/feedback
export const feedbackRouter = Router({ mergeParams: true });
feedbackRouter.post('/', authenticateToken, createFeedback as any);

// Mounted at /alunos/me/feedbacks
export const studentFeedbackRouter = Router();
studentFeedbackRouter.get('/me/feedbacks', authenticateToken, getMyFeedbacks as any);
