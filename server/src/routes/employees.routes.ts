import { Router } from 'express';
import {
	createSingleEmployee,
	createBulkEmployees,
	uploadMiddleware,
} from '../controllers/employeeControllers/empUsers.controller';
import {
	deleteEmployeeDashboard,
	updateEmployeeDetails,
} from '../controllers/employeeControllers/employee.controller';
import {
	getAllEmployees,
	getEmployeesByInstitution,
	editEmployee,
} from '../controllers/employeeControllers/employeeList.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// ── Fetch all employees (registry-based, all models) ──────────────────────────
// NOTE: /all must be declared before /all/:institutionId so Express does not
// treat the literal string "all" as an :institutionId value.
router.get('/all', authenticate, getAllEmployees);
router.get('/all/:institutionId', authenticate, getEmployeesByInstitution);

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', authenticate, createSingleEmployee);
router.post('/bulk-create', authenticate, uploadMiddleware, createBulkEmployees);

// ── Edit employee (registry-based, employeeModel + UUID id in body) ───────────
router.put('/edit', authenticate, editEmployee);

// ── Update employee details (legacy: designation + empId in body) ─────────────
router.patch('/update', authenticate, updateEmployeeDetails);

// ── Delete employee dashboard access ──────────────────────────────────────────
router.delete('/dashboard', authenticate, deleteEmployeeDashboard);

export default router;
