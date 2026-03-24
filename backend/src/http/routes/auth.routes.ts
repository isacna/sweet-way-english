import { Router } from 'express';
import { registerProfessor, registerStudent, login } from '../controllers/AuthController.js';

const router = Router();

router.post('/register/professor', registerProfessor);
router.post('/register/aluno', registerStudent);
router.post('/login', login);

export { router as authRouter };
