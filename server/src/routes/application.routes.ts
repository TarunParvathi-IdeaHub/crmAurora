import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAllApplications,
  getUgApplications,
  getPgApplications,
  getPhdApplications,
  getCounsellorUgApplications,
  getCounsellorPgApplications,
  getCounsellorPhdApplications,
  getCounsellorApplications,
  getConsultantUgApplications,
  getConsultantPgApplications,
  getConsultantPhdApplications,
  getConsultantApplications,
} from '../controllers/StudentAdmissionApplication/applicationRead.controller';
import {
  getApplication,
  updateApplication,
} from '../controllers/StudentAdmissionApplication/counsellorApplication.controller';

const router = Router();

// ── Institution-level routes ──────────────────────────────────────────────────
// GET /api/applications/getall/:institutionId
router.get('/getall/:institutionId',  authenticate, getAllApplications);

// GET /api/applications/ug/:institutionId
router.get('/ug/:institutionId',      authenticate, getUgApplications);

// GET /api/applications/pg/:institutionId
router.get('/pg/:institutionId',      authenticate, getPgApplications);

// GET /api/applications/phd/:institutionId
router.get('/phd/:institutionId',     authenticate, getPhdApplications);

// ── Counsellor routes — specific static segments BEFORE dynamic param ─────────
// GET /api/applications/counsellor/ug/:institutionId/:counsellorId
router.get('/counsellor/ug/:institutionId/:counsellorId',  authenticate, getCounsellorUgApplications);

// GET /api/applications/counsellor/pg/:institutionId/:counsellorId
router.get('/counsellor/pg/:institutionId/:counsellorId',  authenticate, getCounsellorPgApplications);

// GET /api/applications/counsellor/phd/:institutionId/:counsellorId
router.get('/counsellor/phd/:institutionId/:counsellorId', authenticate, getCounsellorPhdApplications);

// GET /api/applications/counsellor/:institutionId/:counsellorId
router.get('/counsellor/:institutionId/:counsellorId',     authenticate, getCounsellorApplications);

// ── Consultant routes — specific static segments BEFORE dynamic param ─────────
// GET /api/applications/consultant/ug/:institutionId/:consultantId
router.get('/consultant/ug/:institutionId/:consultantId',  authenticate, getConsultantUgApplications);

// GET /api/applications/consultant/pg/:institutionId/:consultantId
router.get('/consultant/pg/:institutionId/:consultantId',  authenticate, getConsultantPgApplications);

// GET /api/applications/consultant/phd/:institutionId/:consultantId
router.get('/consultant/phd/:institutionId/:consultantId', authenticate, getConsultantPhdApplications);

// GET /api/applications/consultant/:institutionId/:consultantId
router.get('/consultant/:institutionId/:consultantId',     authenticate, getConsultantApplications);

// ── Counsellor — single application read / update ─────────────────────────────
// NOTE: these dynamic two-segment routes must be declared after all static-prefix
// routes (getall, ug, pg, phd, counsellor/*, consultant/*) so that Express
// matches the more-specific paths first.
router.get('/:counsellorId/:applicationId', authenticate, getApplication);
router.put('/:counsellorId/:applicationId', authenticate, updateApplication);

export default router;
