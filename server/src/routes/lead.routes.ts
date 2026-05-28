import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import {
  getAllLeads,
  getUGLeads,
  getPGLeads,
  getPHDLeads,
  getCounsellorLeads,
  getCounsellorUGLeads,
  getCounsellorPGLeads,
  getCounsellorPHDLeads,
  getConsultantLeads,
  getConsultantUGLeads,
  getConsultantPGLeads,
  getConsultantPHDLeads,
  deleteLead,
} from '../controllers/lead/lead.controller';
import {
  getEnquiryForm,
  updateEnquiryForm,
} from '../controllers/lead/counsellorEnquiry.controller';
import { changeCounsellor } from '../controllers/StudentAdmissionApplication/studentAdmissionApplication.controller';

const router = Router();

// ── Institution-wide ─────────────────────────────────────────────────────────
router.get('/getall/:institutionId', authenticate, getAllLeads);
router.get('/ug/:institutionId',     authenticate, getUGLeads);
router.get('/pg/:institutionId',     authenticate, getPGLeads);
router.get('/phd/:institutionId',    authenticate, getPHDLeads);

// ── Counsellor-scoped (specific filters before generic) ──────────────────────
router.get('/counsellor/ug/:institutionId/:counsellorId',  authenticate, getCounsellorUGLeads);
router.get('/counsellor/pg/:institutionId/:counsellorId',  authenticate, getCounsellorPGLeads);
router.get('/counsellor/phd/:institutionId/:counsellorId', authenticate, getCounsellorPHDLeads);
router.get('/counsellor/:institutionId/:counsellorId',     authenticate, getCounsellorLeads);

// ── Consultant-scoped (specific filters before generic) ──────────────────────
router.get('/consultant/ug/:institutionId/:consultantId',  authenticate, getConsultantUGLeads);
router.get('/consultant/pg/:institutionId/:consultantId',  authenticate, getConsultantPGLeads);
router.get('/consultant/phd/:institutionId/:consultantId', authenticate, getConsultantPHDLeads);
router.get('/consultant/:institutionId/:consultantId',     authenticate, getConsultantLeads);

// ── Delete ───────────────────────────────────────────────────────────────────
router.delete(
  '/delete/:leadId',
  authenticate,
  authorizeRoles('Admission Director', 'Admission Incharge'),
  deleteLead
);

// ── Change counsellor (static prefix — must stay before dynamic two-segment routes)
router.put(
  '/change-counsellor',
  authenticate,
  authorizeRoles('Admission Director', 'Admission Incharge'),
  changeCounsellor
);

// ── Counsellor — single enquiry read / update ─────────────────────────────────
router.get('/:counsellorId/:enquiryFormId', authenticate, getEnquiryForm);
router.put('/:counsellorId/:enquiryId',     authenticate, updateEnquiryForm);

export default router;
