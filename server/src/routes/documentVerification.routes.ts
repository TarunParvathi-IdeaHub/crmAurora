import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.middleware';
import {
  getDocumentVerification,
  initiateVerification,
  submitVerification,
} from '../controllers/documentVerification/documentVerification.controller';

const router = Router();

const ALLOWED_ROLES = ['Admission Director', 'Admission Incharge'];

// POST /api/document-verification/initiate
// Declared BEFORE /:applicationId to avoid Express matching "initiate" as a dynamic param
router.post(
  '/initiate',
  authenticate,
  authorizeRoles(...ALLOWED_ROLES),
  initiateVerification,
);

// GET /api/document-verification/:applicationId
router.get(
  '/:applicationId',
  authenticate,
  authorizeRoles(...ALLOWED_ROLES),
  getDocumentVerification,
);

// PUT /api/document-verification/:verificationId
router.put(
  '/:verificationId',
  authenticate,
  authorizeRoles(...ALLOWED_ROLES),
  submitVerification,
);

export default router;
