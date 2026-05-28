import { Router } from "express";
import {
  getDashboardProfile,
  getEmployeeProfile,
  getApplicantProfile,
  getStudentProfile,
} from "../controllers/dashboard.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// ── Dashboard Routes ───────────────────────────────────────────────────────────

/**
 * POST /api/dashboard/profile  (legacy)
 *
 * Returns the authenticated employee's latest profile details.
 * Body: { userId: string, email: string, role: string }
 */
router.post("/profile", authenticate, getDashboardProfile);

/**
 * GET /api/dashboard/employee/profile
 * GET /api/dashboard/applicant/profile
 * GET /api/dashboard/student/profile
 *
 * Role-specific profile endpoints. All authenticated via JWT cookie.
 */
router.get("/employee/profile", authenticate, getEmployeeProfile);
router.get("/applicant/profile", authenticate, getApplicantProfile);
router.get("/student/profile", authenticate, getStudentProfile);

export default router;
