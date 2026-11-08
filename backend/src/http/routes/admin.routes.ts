import { Router } from 'express';
import { authenticateToken, requireAdmin, requireRole } from '../middlewares/auth.js';
import { receberArquivo } from '../middlewares/upload.js';
import {
  getConfig,
  getLogo,
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
// Logo: o único upload público (aparece antes do login)
router.get('/configuracoes/logo', h(getLogo));
router.patch('/configuracoes/logo', authenticateToken, requireAdmin, receberArquivo('logo', { somenteImagem: true }), h(uploadLogo));

router.get('/professor/me', authenticateToken, requireRole('professor'), h(getProfessorMe));
router.patch('/professor/me', authenticateToken, requireRole('professor'), h(updateProfessorMe));

router.get('/admin/professores', authenticateToken, requireAdmin, h(listAllProfessors));
router.post('/admin/professores', authenticateToken, requireAdmin, h(createProfessorAdmin));
router.patch('/admin/professores/:id', authenticateToken, requireAdmin, h(updateProfessorAdmin));
router.delete('/admin/professores/:id', authenticateToken, requireAdmin, h(deleteProfessorAdmin));

router.post('/admin/alunos/:id/promover', authenticateToken, requireAdmin, h(promoteAluno));

export { router as adminRouter };
