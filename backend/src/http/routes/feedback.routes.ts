import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken } from '../middlewares/auth.js';
import { createFeedback, getMyFeedbacks } from '../controllers/FeedbackController.js';

// Mounted at /submissoes/:id/feedback
export const feedbackRouter = Router({ mergeParams: true });
feedbackRouter.post('/', authenticateToken, h(createFeedback));

// Mounted at /alunos/me/feedbacks
export const studentFeedbackRouter = Router();
studentFeedbackRouter.get('/me/feedbacks', authenticateToken, h(getMyFeedbacks));
