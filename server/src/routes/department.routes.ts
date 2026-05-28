import { Router } from 'express';
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  getDepartmentsByInstitution,
  getDepartmentsBySchool,
  updateDepartment,
} from '../controllers/departmentControllers/department.Controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getDepartments);
router.get('/by-school/:schoolId', authenticate, getDepartmentsBySchool);
router.get('/by-institution/:institutionId', authenticate, getDepartmentsByInstitution);
router.post('/create', authenticate, createDepartment);
router.put('/update', authenticate, updateDepartment);
router.delete('/delete', authenticate, deleteDepartment);

export default router;
