import { Router } from 'express';
import {
  createSchool,
  deleteSchool,
  getSchools,
  getSchoolsByInstitution,
  updateSchool,
} from '../controllers/SchoolControllers/school.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getSchools);
router.get('/by-institution/:institutionId', authenticate, getSchoolsByInstitution);
router.post('/create', authenticate, createSchool);
router.put('/update', authenticate, updateSchool);
router.delete('/delete', authenticate, deleteSchool);

export default router;