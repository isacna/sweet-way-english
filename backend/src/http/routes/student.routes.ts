import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { listStudents, createStudent, updateStudent, deleteStudent } from '../controllers/StudentController.js';

const router = Router();

router.get('/', authenticateToken, listStudents as any);
router.post('/', authenticateToken, createStudent as any);
router.patch('/:id', authenticateToken, updateStudent as any);
router.delete('/:id', authenticateToken, deleteStudent as any);

export { router as studentRouter };
