import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { createClass, listClasses, getClassById, joinClass } from '../controllers/ClassController.js';
import { h } from '../asyncHandler.js';

const router = Router();

router.post('/', authenticateToken, requireRole('professor'), h(createClass));
router.get('/', authenticateToken, requireRole('professor', 'aluno'), h(listClasses));
router.get('/:id', authenticateToken, requireRole('professor', 'aluno'), h(getClassById));
router.post('/entrar', authenticateToken, requireRole('aluno'), h(joinClass));

export { router as classRouter };
