import { Router } from 'express';
import {
  createEmployeeRole,
  deleteEmployeeRole,
  getEmployeeRoles,
  updateEmployeeRole,
} from '../controllers/employeeControllers/employeeRole.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/getall', authenticate, getEmployeeRoles);
router.post('/create', authenticate, createEmployeeRole);
router.put('/:id', authenticate, updateEmployeeRole);
router.delete('/:id', authenticate, deleteEmployeeRole);

export default router;
