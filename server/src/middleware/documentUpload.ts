import multer from 'multer';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const DOCUMENT_FIELDS = [
  'aadharCard',
  'sscMemo',
  'intermediateMemo',
  'ugMemo',
  'pgMemo',
  'gapCertificate',
  'bonafideCertificate',
  'transferCertificate',
] as const;

export type DocumentFieldName = (typeof DOCUMENT_FIELDS)[number];

export const documentMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`Only PDF files are allowed. Received: ${file.mimetype}`));
    }
  },
});

/** Drop onto any route that needs multipart document uploads. */
export const documentUploadFields = documentMulter.fields(
  DOCUMENT_FIELDS.map((name) => ({ name, maxCount: 1 }))
);
