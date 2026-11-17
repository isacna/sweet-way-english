import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { cancelar } from '../controllers/LembreteController.js';
import { h } from '../asyncHandler.js';

// Lembretes de estudo por e-mail. A rota é pública: quem clica no link do e-mail pode não estar logado.
const router = Router();

// Mesmo limite das rotas de autenticação (auth.routes.ts); desligado nos testes
const cancelarLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
  skip: () => process.env.NODE_ENV === 'test',
});

router.post('/cancelar', cancelarLimiter, h(cancelar));

export { router as lembreteRouter };
