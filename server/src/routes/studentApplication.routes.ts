import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import { documentUploadFields } from '../middleware/documentUpload';
import { saveDraft } from '../controllers/StudentAdmissionApplication/saveDraft.controller';
import { getApplication } from '../controllers/StudentAdmissionApplication/getApplication.controller';

const router = Router();

/**
 * PUT /api/student-application/save-draft/:studentAdmissionApplicationId
 *
 * Accepts multipart/form-data.  All body fields and file uploads are optional —
 * only the sections included in the request are updated; unrelated data is untouched.
 *
 * Multer errors (wrong MIME type, file too large) are caught here and returned as
 * a clean 400 before the controller runs.
 */
  router.put(
    '/save-draft/:studentAdmissionApplicationId',
    authenticate,
    (req, res, next) => {
      documentUploadFields(req, res, (err: unknown) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              res.status(400).json({ error: 'File size exceeds the 5 MB limit per document.' });
              return;
            }
            res.status(400).json({ error: `Upload error: ${err.message}` });
            return;
          }
          if (err instanceof Error) {
            res.status(400).json({ error: err.message });
            return;
          }
          next(err);
          return;
        }
        next();
      });
    },
    saveDraft
  );

  // ── GET /api/student-application/get/:applicationId ──────────────────────────
  router.get('/get/:applicationId', authenticate, getApplication);


export default router;
