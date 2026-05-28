import { Router } from 'express';
import {
  createInstitution,
  deleteInstitutionByCode,
  getAllInstitutions,
  getActiveInstitutions,
  getCurrentInstitution,
  updateInstitution,
} from '../controllers/institution.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public endpoint – no auth required (used by lead/enquiry form)
router.get('/active', getActiveInstitutions);

// Returns the logged-in user's institution
router.get('/current', authenticate, getCurrentInstitution);

router.post('/create', authenticate, authorize("Admin"), createInstitution);
router.put('/:institutionCode', authenticate, authorize("Admin"), updateInstitution);
router.delete('/:institutionCode', authenticate, authorize("Admin"), deleteInstitutionByCode);
router.get('/', authenticate, authorize("Admin"), getAllInstitutions);

export default router;
