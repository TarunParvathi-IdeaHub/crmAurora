import { Router } from 'express';
import {
  createEnquiryForm,
  deleteEnquiryForm,
  getEnquiryForms,
  updateEnquiryForm,
} from '../controllers/enquiryform/enquiryform.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public – no auth required (lead/enquiry form submitted by prospective students)
router.post('/create', createEnquiryForm);
router.post('/read', authenticate, getEnquiryForms);
router.put('/update', authenticate, updateEnquiryForm);
router.delete('/delete', authenticate, deleteEnquiryForm);

export default router;
