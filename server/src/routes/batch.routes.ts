import { Router } from 'express';
import {
  createBatch,
  deleteBatch,
  getBatches,
  getBatchById,
  updateBatch,
  getActiveBatchesByInstitution,
} from '../controllers/batchController/batch.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public endpoint – used by admission cycle form (no auth required)
router.get('/active/by-institution/:institutionId', getActiveBatchesByInstitution);

router.post('/create', authenticate, createBatch);
router.get('/', authenticate, getBatches);
router.put('/:batchId', authenticate, updateBatch);
router.delete('/:batchId', authenticate, deleteBatch);
router.get('/:batchId', authenticate, getBatchById);

export default router;
