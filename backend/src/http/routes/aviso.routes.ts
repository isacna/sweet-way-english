import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { listAvisos, createAviso, deleteAviso } from '../controllers/AvisoController.js';

const router = Router({ mergeParams: true });

router.get('/', authenticateToken, listAvisos);
router.post('/', authenticateToken, createAviso);
router.delete('/:avisoId', authenticateToken, deleteAviso);

export { router as avisoRouter };
