import { Router } from 'express';
import {
  createUndertakingTemplate,
  getTemplateByProgram,
} from '../controllers/UndertakingTemplate/undertakingTemplate.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public: applicants fetch the template without a session cookie
router.get('/by-program', getTemplateByProgram);

// Authenticated: only staff can create templates
router.post('/create', authenticate, createUndertakingTemplate);

export default router;
