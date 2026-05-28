import { Router } from 'express';
import {
  acceptStudentUndertaking,
  getStudentUndertaking,
} from '../controllers/StudentUndertaking/studentUndertaking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET must be declared before the POST so Express doesn't confuse the path ordering
router.get('/:studentAdmissionApplicationId', authenticate, getStudentUndertaking);
router.post('/accept', authenticate, acceptStudentUndertaking);

export default router;
