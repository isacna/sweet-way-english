import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { createActivity, updateActivity, listActivitiesByClass } from '../controllers/ActivityController.js';
import { h } from '../asyncHandler.js';

// Mounted at /turmas/:turmaId/atividades
const activityRouter = Router({ mergeParams: true });
activityRouter.post('/', authenticateToken, h(createActivity));
activityRouter.get('/', authenticateToken, h(listActivitiesByClass));

// Mounted at /professor/atividades
const professorActivityRouter = Router();
professorActivityRouter.patch('/:id', authenticateToken, h(updateActivity));

export { activityRouter, professorActivityRouter };
