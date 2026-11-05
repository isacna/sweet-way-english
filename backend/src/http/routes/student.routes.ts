import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken } from '../middlewares/auth.js';
import { listStudents, createStudent, updateStudent, deleteStudent } from '../controllers/StudentController.js';

const router = Router();

router.get('/', authenticateToken, h(listStudents));
router.post('/', authenticateToken, h(createStudent));
router.patch('/:id', authenticateToken, h(updateStudent));
router.delete('/:id', authenticateToken, h(deleteStudent));

export { router as studentRouter };
