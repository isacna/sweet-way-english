import { Router } from 'express';
import { upload } from '../../config/multer.js';
import { authenticateToken } from '../middlewares/auth.js';
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
router.patch('/configuracoes/logo', authenticateToken, upload.single('logo'), uploadLogo);

router.get('/professor/me', authenticateToken, getProfessorMe);
router.patch('/professor/me', authenticateToken, updateProfessorMe);

router.get('/admin/professores', authenticateToken, listAllProfessors);
router.post('/admin/professores', authenticateToken, createProfessorAdmin);
router.patch('/admin/professores/:id', authenticateToken, updateProfessorAdmin);
router.delete('/admin/professores/:id', authenticateToken, deleteProfessorAdmin);

router.post('/admin/alunos/:id/promover', authenticateToken, promoteAluno);

export { router as adminRouter };
