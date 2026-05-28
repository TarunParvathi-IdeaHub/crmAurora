import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCounsellorsByInstitution } from '../controllers/counsellor/counsellor.controller';

const router = Router();

// GET /api/counsellors/:institutionId
router.get('/:institutionId', authenticate, getCounsellorsByInstitution);

export default router;
