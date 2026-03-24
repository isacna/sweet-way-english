import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { createActivity, updateActivity, listActivitiesByClass } from '../controllers/ActivityController.js';

const router = Router();

// Mounted at /turmas/:turmaId/atividades
router.post('/', authenticateToken, createActivity as any);
router.get('/', authenticateToken, listActivitiesByClass as any);

// Mounted at /professor/atividades
router.patch('/:id', authenticateToken, updateActivity as any);

export { router as activityRouter };
