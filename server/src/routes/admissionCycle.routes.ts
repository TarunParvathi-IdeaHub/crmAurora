import { Router } from 'express';
import {
  createAdmissionCycle,
  deleteAdmissionCycle,
  getAdmissionCycleById,
  getAdmissionCycles,
  getLatestActiveAdmissionCycle,
  updateAdmissionCycle,
} from '../controllers/AdmissionCycle/admissionCycle.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/create', authenticate, createAdmissionCycle);
router.post('/read', authenticate, getAdmissionCycles);
router.put('/update', authenticate, updateAdmissionCycle);
router.delete('/delete', authenticate, deleteAdmissionCycle);
// Must be registered before /:id to prevent 'latest-active' being treated as an ID
router.get('/latest-active', getLatestActiveAdmissionCycle);
router.get('/:id', authenticate, getAdmissionCycleById);

export default router;
