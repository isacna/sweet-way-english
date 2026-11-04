import { Router } from 'express';
import { upload } from '../../config/multer.js';
import { authenticateToken, requireAdmin, requireRole } from '../middlewares/auth.js';
import {
  getConfig,
  uploadLogo,
  getProfessorMe,
  updateProfessorMe,
  listAllProfessors,
  createProfessorAdmin,
  updateProfessorAdmin,
  deleteProfessorAdmin,
  promoteAluno,
} from '../controllers/ConfigController.js';

const router = Router();

router.get('/configuracoes', getConfig);
router.patch('/configuracoes/logo', authenticateToken, requireAdmin, upload.single('logo'), uploadLogo);

router.get('/professor/me', authenticateToken, requireRole('professor'), getProfessorMe);
router.patch('/professor/me', authenticateToken, requireRole('professor'), updateProfessorMe);

router.get('/admin/professores', authenticateToken, requireAdmin, listAllProfessors);
router.post('/admin/professores', authenticateToken, requireAdmin, createProfessorAdmin);
router.patch('/admin/professores/:id', authenticateToken, requireAdmin, updateProfessorAdmin);
router.delete('/admin/professores/:id', authenticateToken, requireAdmin, deleteProfessorAdmin);

router.post('/admin/alunos/:id/promover', authenticateToken, requireAdmin, promoteAluno);

export { router as adminRouter };
