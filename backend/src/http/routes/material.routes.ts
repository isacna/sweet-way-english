import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { receberArquivo } from '../middlewares/upload.js';
import { createMaterial, deleteMaterial, listMaterialsByClass } from '../controllers/MaterialController.js';
import { h } from '../asyncHandler.js';

const router = Router({ mergeParams: true });

// Mounted at /turmas/:id/materiais
router.post('/', authenticateToken, requireRole('professor'), receberArquivo('arquivo'), h(createMaterial));
router.delete('/:materialId', authenticateToken, requireRole('professor'), h(deleteMaterial));
router.get('/', authenticateToken, requireRole('professor', 'aluno'), h(listMaterialsByClass));

export { router as materialRouter };
