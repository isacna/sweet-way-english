import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { getArquivo } from '../controllers/ArquivoController.js';
import { h } from '../asyncHandler.js';

// Mounted at /arquivos — uploads privados (ver src/storage/arquivos.ts)
const router = Router();
router.get('/:id', authenticateToken, h(getArquivo));

export { router as arquivoRouter };
