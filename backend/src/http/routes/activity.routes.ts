import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken } from '../middlewares/auth.js';
import { createActivity, updateActivity, listActivitiesByClass } from '../controllers/ActivityController.js';

const router = Router({ mergeParams: true });

// Mounted at /turmas/:turmaId/atividades
router.post('/', authenticateToken, h(createActivity));
router.get('/', authenticateToken, h(listActivitiesByClass));

// Mounted at /professor/atividades
router.patch('/:id', authenticateToken, h(updateActivity));

export { router as activityRouter };
