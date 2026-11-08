import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { listStudents, createStudent, updateStudent, deleteStudent } from '../controllers/StudentController.js';
import { h } from '../asyncHandler.js';

const router = Router();
// Alunos das turmas da professora
router.use(authenticateToken, requireRole('professor'));

router.get('/', h(listStudents));
router.post('/', h(createStudent));
router.patch('/:id', h(updateStudent));
router.delete('/:id', h(deleteStudent));

export { router as studentRouter };
