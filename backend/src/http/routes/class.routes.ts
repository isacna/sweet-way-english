import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { createClass, listClasses, getClassById, joinClass } from '../controllers/ClassController.js';

const router = Router();

router.post('/', authenticateToken, createClass as any);
router.get('/', authenticateToken, listClasses as any);
router.get('/:id', authenticateToken, getClassById as any);
router.post('/entrar', authenticateToken, joinClass as any);

export { router as classRouter };
