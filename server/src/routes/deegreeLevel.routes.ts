import { Router } from 'express';
import {
  createDeegreeLevel,
  deleteDeegreeLevel,
  getDeegreeLevels,
  getDeegreeLevelsByInstitution,
  updateDeegreeLevel,
} from '../controllers/DeegreeLevelController/deegreeLevel.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authenticate, createDeegreeLevel);
router.post('/read', authenticate, getDeegreeLevels);
router.get('/', authenticate, getDeegreeLevels);
router.get('/by-institution/:institutionId', getDeegreeLevelsByInstitution);
router.put('/:id', authenticate, updateDeegreeLevel);
router.delete('/:id', authenticate, deleteDeegreeLevel);

export default router;
