import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verificarCertificado } from '../controllers/ConquistasController.js';
import { h } from '../asyncHandler.js';

// Conferência pública de certificado (sem login). O código tem 12 caracteres aleatórios; o limite por IP
// só impede varredura em massa. Desligado nos testes, como os limites de /auth.
const router = Router();

const consultaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas consultas. Tente novamente em alguns minutos.' },
  skip: () => process.env.NODE_ENV === 'test',
});

router.get('/:codigo', consultaLimiter, h(verificarCertificado));

export { router as certificadoRouter };
