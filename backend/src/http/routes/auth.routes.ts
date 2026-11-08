import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerStudent,
  login,
  logout,
  me,
  esqueciSenha,
  redefinirSenha,
} from '../controllers/AuthController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { h } from '../asyncHandler.js';

const router = Router();
const MSG_LIMITE = { error: 'Muitas tentativas. Tente novamente em alguns minutos.' };

// Contém tentativas de adivinhar senha; desligado nos testes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: MSG_LIMITE,
  skip: () => process.env.NODE_ENV === 'test',
});

// Pedir link de nova senha dispara e-mail: limite bem mais baixo por IP
const esqueciLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: MSG_LIMITE,
  skip: () => process.env.NODE_ENV === 'test',
});

// Professores não se cadastram sozinhos: são criados pelo admin em /admin/professores
router.post('/register/aluno', authLimiter, h(registerStudent));
router.post('/login', authLimiter, h(login));
router.post('/logout', h(logout));
router.get('/me', authenticateToken, h(me));
router.post('/esqueci-senha', esqueciLimiter, h(esqueciSenha));
router.post('/redefinir-senha', authLimiter, h(redefinirSenha));

export { router as authRouter };
