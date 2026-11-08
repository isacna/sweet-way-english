import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { listStudents, createStudent, updateStudent, deleteStudent } from '../controllers/StudentController.js';
import { h } from '../asyncHandler.js';

const router = Router();

router.get('/', authenticateToken, h(listStudents));
router.post('/', authenticateToken, h(createStudent));
router.patch('/:id', authenticateToken, h(updateStudent));
router.delete('/:id', authenticateToken, h(deleteStudent));

export { router as studentRouter };
