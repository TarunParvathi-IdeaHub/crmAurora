import { Router } from 'express';
import {
  createCounsellorCallLog,
  createConsultantCallLog,
  getCounsellorCallLogs,
  getConsultantCallLogs,
  getAllCounsellorCallLogs,
  getAllConsultantCallLogs,
  getInstitutionCallLogs,
  getEnquiryCallLogs,
} from '../controllers/callLog/callLog.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/admissionCounsellor/create', authenticate, createCounsellorCallLog);
router.post('/admissionConsultant/create', authenticate, createConsultantCallLog);
router.get('/get/counsellor/:counsellorId/:enquiryId', authenticate, getCounsellorCallLogs);
router.get('/get/consultant/:consultantId/:enquiryId', authenticate, getConsultantCallLogs);
router.get('/counsellor/all/:counsellorId', authenticate, getAllCounsellorCallLogs);
router.get('/consultant/all/:consultantId', authenticate, getAllConsultantCallLogs);
router.get('/institution/:institutionId', authenticate, getInstitutionCallLogs);
router.get('/enquiry/:enquiryId', authenticate, getEnquiryCallLogs);

export default router;
