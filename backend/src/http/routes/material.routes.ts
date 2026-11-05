import { Router } from 'express';
import { h } from '../asyncHandler.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { uploadUnico } from '../../config/multer.js';
import { createMaterial, deleteMaterial, listMaterialsByClass } from '../controllers/MaterialController.js';

const router = Router({ mergeParams: true });

// Mounted at /turmas/:id/materiais
// Papel checado antes do multer, para não gravar arquivo de quem não pode enviar
router.post('/', authenticateToken, requireRole('professor'), ...uploadUnico('arquivo'), h(createMaterial));
router.delete('/:materialId', authenticateToken, h(deleteMaterial));
router.get('/', authenticateToken, h(listMaterialsByClass));

export { router as materialRouter };
