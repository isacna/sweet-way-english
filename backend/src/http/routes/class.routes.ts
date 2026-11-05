import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken } from '../middlewares/auth.js';
import { createClass, listClasses, getClassById, joinClass } from '../controllers/ClassController.js';

const router = Router();

router.post('/', authenticateToken, h(createClass));
router.get('/', authenticateToken, h(listClasses));
router.get('/:id', authenticateToken, h(getClassById));
router.post('/entrar', authenticateToken, h(joinClass));

export { router as classRouter };
