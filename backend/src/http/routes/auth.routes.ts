import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { registerStudent, login } from '../controllers/AuthController.js';

const router = Router();

// Contém tentativas de adivinhar senha; desligado nos testes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Professores não se cadastram sozinhos: são criados pelo admin em /admin/professores
router.post('/register/aluno', authLimiter, registerStudent);
router.post('/login', authLimiter, login);

export { router as authRouter };
