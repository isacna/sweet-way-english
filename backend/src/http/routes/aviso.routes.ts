import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken } from '../middlewares/auth.js';
import { listAvisos, createAviso, deleteAviso } from '../controllers/AvisoController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticateToken, h(listAvisos));
router.post('/', authenticateToken, h(createAviso));
router.delete('/:avisoId', authenticateToken, h(deleteAviso));

export { router as avisoRouter };
