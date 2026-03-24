import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { classRouter } from './class.routes.js';
import { studentRouter } from './student.routes.js';
import { activityRouter } from './activity.routes.js';
import { submissionRouter, professorSubmissionRouter } from './submission.routes.js';
import { feedbackRouter, studentFeedbackRouter } from './feedback.routes.js';
import { materialRouter } from './material.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/turmas', classRouter);
router.use('/turmas/:turmaId/atividades', activityRouter);
router.use('/turmas/:id/materiais', materialRouter);
router.use('/professor/alunos', studentRouter);
router.use('/professor/atividades', activityRouter);
router.use('/professor/submissoes', professorSubmissionRouter);
router.use('/atividades/:id/submissoes', submissionRouter);
router.use('/submissoes/:id/feedback', feedbackRouter);
router.use('/alunos', studentFeedbackRouter);

export { router };
