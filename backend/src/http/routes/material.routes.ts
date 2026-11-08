import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../../config/multer.js';
import { createMaterial, deleteMaterial, listMaterialsByClass } from '../controllers/MaterialController.js';
import { h } from '../asyncHandler.js';

const router = Router({ mergeParams: true });

// Mounted at /turmas/:id/materiais
router.post('/', authenticateToken, upload.single('arquivo'), h(createMaterial));
router.delete('/:materialId', authenticateToken, h(deleteMaterial));
router.get('/', authenticateToken, h(listMaterialsByClass));

export { router as materialRouter };
