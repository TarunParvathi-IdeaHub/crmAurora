import { Router } from 'express';
import {
  createProgramme,
  deleteProgramme,
  getProgrammes,
  getProgrammesByLevelId,
  getActiveProgrammesByInstitution,
  getActiveProgrammesByLevel,
  updateProgramme,
} from '../controllers/ProgrammeController/programme.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authenticate, createProgramme);
router.get('/', authenticate, getProgrammes);
router.put('/update', authenticate, updateProgramme);
router.delete('/delete', authenticate, deleteProgramme);

// Public endpoints – used by lead/enquiry form and batch management (no auth required)
router.get('/active/by-institution/:institutionId', getActiveProgrammesByInstitution);
router.get('/active/by-level/:levelId', getActiveProgrammesByLevel);
router.get('/:institutionId/:degreeLevelId', getProgrammesByLevelId);

export default router;
