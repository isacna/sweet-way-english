import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import { upload } from '../../config/multer.js';
import { createMaterial, deleteMaterial, listMaterialsByClass } from '../controllers/MaterialController.js';

const router = Router({ mergeParams: true });

// Mounted at /turmas/:id/materiais
router.post('/', authenticateToken, upload.single('arquivo'), createMaterial as any);
router.delete('/:materialId', authenticateToken, deleteMaterial as any);
router.get('/', authenticateToken, listMaterialsByClass as any);

export { router as materialRouter };
