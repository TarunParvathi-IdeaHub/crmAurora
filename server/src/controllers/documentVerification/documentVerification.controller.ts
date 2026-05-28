import type { NextFunction, Response } from 'express';
import type { Prisma } from '@prisma/client';
import {
  VerificationDocumentType,
  VerificationFinalStatus,
  VerificationStatus,
  ApplicationStatus,
} from '@prisma/client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../../config/database';
import s3 from '../../config/s3';
import type { AuthRequest } from '../../middleware/auth.middleware';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET        = process.env.AWS_BUCKET_NAME!;
const SIGNED_URL_TTL = 86_400; // 24 h in seconds

// ── Document field → enum mapping ─────────────────────────────────────────────

type DocumentFieldKey =
  | 'aadharCard'
  | 'sscMemo'
  | 'intermediateMemo'
  | 'ugMemo'
  | 'pgMemo'
  | 'gapCertificate'
  | 'bonafideCertificate'
  | 'transferCertificate';

interface DocDefinition {
  field:   DocumentFieldKey;
  docType: VerificationDocumentType;
  label:   string;
}

const DOCUMENT_FIELD_MAP: DocDefinition[] = [
  { field: 'aadharCard',          docType: VerificationDocumentType.AADHAR_CARD,         label: 'Aadhar Card'            },
  { field: 'sscMemo',             docType: VerificationDocumentType.SSC_MEMO,             label: 'SSC Marksheet'          },
  { field: 'intermediateMemo',    docType: VerificationDocumentType.INTERMEDIATE_MEMO,    label: 'Intermediate Marksheet' },
  { field: 'ugMemo',              docType: VerificationDocumentType.UG_MEMO,              label: 'UG Degree Certificate'  },
  { field: 'pgMemo',              docType: VerificationDocumentType.PG_MEMO,              label: 'PG Degree Certificate'  },
  { field: 'gapCertificate',      docType: VerificationDocumentType.GAP_CERTIFICATE,      label: 'Gap Certificate'        },
  { field: 'bonafideCertificate', docType: VerificationDocumentType.BONAFIDE_CERTIFICATE, label: 'Bonafide Certificate'   },
  { field: 'transferCertificate', docType: VerificationDocumentType.TRANSFER_CERTIFICATE, label: 'Transfer Certificate'   },
];

// ── Prisma select for application ─────────────────────────────────────────────

const APPLICATION_DOC_SELECT = {
  id:                true,
  applicationNumber: true,
  institutionId:     true,
  firstName:         true,
  lastName:          true,
  email:             true,
  mobileNo:          true,
  applicationStatus: true,
  aadharCard:        true,
  sscMemo:           true,
  intermediateMemo:  true,
  ugMemo:            true,
  pgMemo:            true,
  gapCertificate:    true,
  bonafideCertificate: true,
  transferCertificate: true,
  degreeLevel:    { select: { levelName: true } },
  program:        { select: { programName: true, programCode: true } },
  admissionCycle: { select: { admissionCycleName: true } },
} satisfies Prisma.StudentAdmissionApplicationSelect;

type AppDocResult = Prisma.StudentAdmissionApplicationGetPayload<{ select: typeof APPLICATION_DOC_SELECT }>;

// ── Signed URL helper ─────────────────────────────────────────────────────────

async function generateSignedGetUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_TTL },
  );
}

// ─── GET /api/document-verification/:applicationId ────────────────────────────

export const getDocumentVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const applicationId = (req.params.applicationId as string)?.trim();

    if (!applicationId) {
      res.status(400).json({ error: 'applicationId is required.' });
      return;
    }

    // Fetch application with document keys
    const application = await prisma.studentAdmissionApplication.findUnique({
      where:  { id: applicationId },
      select: APPLICATION_DOC_SELECT,
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    // Generate signed URLs in parallel
    const documentUrlEntries = await Promise.all(
      DOCUMENT_FIELD_MAP.map(async ({ field }) => {
        const key = application[field as keyof typeof application] as string | null | undefined;
        return [field, await generateSignedGetUrl(key)] as const;
      }),
    );
    const documents = Object.fromEntries(documentUrlEntries) as Record<DocumentFieldKey, string | null>;

    // Fetch existing verification record (if any)
    const verification = await prisma.documentVerification.findUnique({
      where:   { studentAdmissionApplicationId: applicationId as string },
      include: { verificationItems: true },
    });

    res.status(200).json({
      data: {
        application: {
          id:                application.id,
          applicationNumber: application.applicationNumber,
          institutionId:     application.institutionId,
          firstName:         application.firstName,
          lastName:          application.lastName,
          email:             application.email,
          mobileNo:          application.mobileNo,
          applicationStatus: application.applicationStatus,
          degreeLevel:       application.degreeLevel,
          program:           application.program,
          admissionCycle:    application.admissionCycle,
        },
        documents,
        verification,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/document-verification/initiate ─────────────────────────────────

export const initiateVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const verifierId   = req.user?.userId ?? '';
    const verifierRole = req.user?.role   ?? '';

    const body = req.body as Record<string, unknown>;
    const applicationId = typeof body.applicationId === 'string' ? body.applicationId.trim() : '';
    const institutionId = typeof body.institutionId === 'string' ? body.institutionId.trim() : '';

    if (!applicationId) {
      res.status(400).json({ error: 'applicationId is required.' });
      return;
    }
    if (!institutionId) {
      res.status(400).json({ error: 'institutionId is required.' });
      return;
    }

    // Fetch application to check which documents are uploaded
    const application = await prisma.studentAdmissionApplication.findUnique({
      where:  { id: applicationId },
      select: {
        id:                  true,
        institutionId:       true,
        aadharCard:          true,
        sscMemo:             true,
        intermediateMemo:    true,
        ugMemo:              true,
        pgMemo:              true,
        gapCertificate:      true,
        bonafideCertificate: true,
        transferCertificate: true,
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    // Return existing verification if already initiated
    const existing = await prisma.documentVerification.findUnique({
      where:   { studentAdmissionApplicationId: applicationId },
      include: { verificationItems: true },
    });

    if (existing) {
      res.status(200).json({ data: existing });
      return;
    }

    // Create new verification + items for each uploaded document
    const uploadedDocs = DOCUMENT_FIELD_MAP.filter(({ field }) => {
      const key = application[field as keyof typeof application];
      return typeof key === 'string' && key.trim().length > 0;
    });

    const verification = await prisma.documentVerification.create({
      data: {
        studentAdmissionApplicationId: applicationId,
        institutionId:                 application.institutionId,
        verifiedById:                  verifierId,
        verifiedByRole:                verifierRole,
        status:                        VerificationFinalStatus.DOCUMENTS_VERIFICATION_PENDING,
        verificationItems: {
          create: uploadedDocs.map(({ docType }) => ({
            documentType: docType,
            status:       VerificationStatus.DOCUMENT_VERIFICATION_PENDING,
          })),
        },
      },
      include: { verificationItems: true },
    });

    res.status(201).json({ data: verification });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/document-verification/:verificationId ───────────────────────────

export const submitVerification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const verifierId   = req.user?.userId ?? '';
    const verifierRole = req.user?.role   ?? '';

    const verificationId = (req.params.verificationId as string)?.trim();
    const body = req.body as Record<string, unknown>;

    const items   = body.items as Array<{ documentType: string; status: string; remarks?: string }> | undefined;
    const remarks = typeof body.remarks === 'string' ? body.remarks.trim() || null : null;

    if (!verificationId) {
      res.status(400).json({ error: 'verificationId is required.' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required and must not be empty.' });
      return;
    }

    // Validate each item
    const validDocTypes  = Object.values(VerificationDocumentType) as string[];
    const validStatuses: string[] = [
      VerificationStatus.DOCUMENT_VERIFIED,
      VerificationStatus.DOCUMENT_REJECTED,
    ];

    for (const item of items) {
      if (!validDocTypes.includes(item.documentType)) {
        res.status(400).json({ error: `Invalid documentType: ${item.documentType}` });
        return;
      }
      if (!validStatuses.includes(item.status)) {
        res.status(400).json({ error: `Invalid status: ${item.status}` });
        return;
      }
    }

    // Load existing verification
    const existing = await prisma.documentVerification.findUnique({
      where:   { id: verificationId },
      select: {
        id:                            true,
        studentAdmissionApplicationId: true,
        verificationItems:             { select: { id: true, documentType: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Verification record not found.' });
      return;
    }

    // Determine final status
    const hasRejected  = items.some((i) => i.status === VerificationStatus.DOCUMENT_REJECTED);
    const finalStatus  = hasRejected ? VerificationFinalStatus.DOCUMENTS_REJECTED : VerificationFinalStatus.DOCUMENTS_VERIFIED;
    const appStatus: ApplicationStatus = hasRejected
      ? ApplicationStatus.DOCUMENT_VERIFICATION_FAILED
      : ApplicationStatus.DOCUMENT_VERIFIED;

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Upsert each verification item (handles newly-uploaded docs too)
      await Promise.all(
        items.map((item) =>
          tx.verificationItem.upsert({
            where: {
              verificationId_documentType: {
                verificationId,
                documentType: item.documentType as VerificationDocumentType,
              },
            },
            update: {
              status:     item.status as VerificationStatus,
              remarks:    item.remarks?.trim() || null,
              verifiedAt: now,
            },
            create: {
              verificationId,
              documentType: item.documentType as VerificationDocumentType,
              status:       item.status as VerificationStatus,
              remarks:      item.remarks?.trim() || null,
              verifiedAt:   now,
            },
          }),
        ),
      );

      // Update DocumentVerification header
      const updated = await tx.documentVerification.update({
        where: { id: verificationId },
        data:  {
          status:        finalStatus,
          remarks,
          verifiedById:   verifierId,
          verifiedByRole: verifierRole,
          verifiedAt:    now,
        },
        include: { verificationItems: true },
      });

      // Update application status
      await tx.studentAdmissionApplication.update({
        where: { id: existing.studentAdmissionApplicationId },
        data:  { applicationStatus: appStatus },
      });

      return updated;
    });

    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
};
