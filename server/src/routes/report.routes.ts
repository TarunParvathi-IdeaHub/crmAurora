import { Router } from 'express';
import {
  getCounsellorMonthlyReport,
  getConsultantMonthlyReport,
  getAllCounsellorReports,
  getAllConsultantReports,
} from '../controllers/Report/report.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Individual monthly reports
router.get('/counsellor/report/:counsellorId', authenticate, getCounsellorMonthlyReport);
router.get('/consultant/report/:consultantId', authenticate, getConsultantMonthlyReport);

// Institution-wide summary reports
router.get('/counsellor/reports/getall/:institutionId', authenticate, getAllCounsellorReports);
router.get('/consultant/reports/getall/:institutionId', authenticate, getAllConsultantReports);

export default router;
