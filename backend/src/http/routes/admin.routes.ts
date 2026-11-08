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
import { h } from '../asyncHandler.js';

const router = Router();

router.get('/configuracoes', h(getConfig));
router.patch('/configuracoes/logo', authenticateToken, requireAdmin, upload.single('logo'), h(uploadLogo));

router.get('/professor/me', authenticateToken, requireRole('professor'), h(getProfessorMe));
router.patch('/professor/me', authenticateToken, requireRole('professor'), h(updateProfessorMe));

router.get('/admin/professores', authenticateToken, requireAdmin, h(listAllProfessors));
router.post('/admin/professores', authenticateToken, requireAdmin, h(createProfessorAdmin));
router.patch('/admin/professores/:id', authenticateToken, requireAdmin, h(updateProfessorAdmin));
router.delete('/admin/professores/:id', authenticateToken, requireAdmin, h(deleteProfessorAdmin));

router.post('/admin/alunos/:id/promover', authenticateToken, requireAdmin, h(promoteAluno));

export { router as adminRouter };
