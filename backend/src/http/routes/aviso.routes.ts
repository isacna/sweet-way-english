import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { listAvisos, createAviso, deleteAviso } from '../controllers/AvisoController.js';
import { h } from '../asyncHandler.js';

const router = Router({ mergeParams: true });

router.get('/', authenticateToken, requireRole('professor', 'aluno'), h(listAvisos));
router.post('/', authenticateToken, requireRole('professor'), h(createAviso));
router.delete('/:avisoId', authenticateToken, requireRole('professor'), h(deleteAviso));

export { router as avisoRouter };
