import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { receberArquivo } from '../middlewares/upload.js';
import { createMaterial, deleteMaterial, listMaterialsByClass } from '../controllers/MaterialController.js';
import { h } from '../asyncHandler.js';

const router = Router({ mergeParams: true });

// Mounted at /turmas/:id/materiais
router.post('/', authenticateToken, receberArquivo('arquivo'), h(createMaterial));
router.delete('/:materialId', authenticateToken, h(deleteMaterial));
router.get('/', authenticateToken, h(listMaterialsByClass));

export { router as materialRouter };
