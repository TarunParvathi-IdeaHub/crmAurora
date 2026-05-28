import type { NextFunction, Response } from 'express';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ApplicationStatus } from '@prisma/client';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { DOCUMENT_FIELDS, type DocumentFieldName } from '../../middleware/documentUpload';
import prisma from '../../config/database';
import s3 from '../../config/s3';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET = process.env.AWS_BUCKET_NAME!;
const SIGNED_URL_TTL = 86_400; // 24 h in seconds

// ── Value coercers ────────────────────────────────────────────────────────────

/** Returns trimmed string only if non-empty, otherwise undefined (skip field). */
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;

/** Parses a float; returns undefined when absent or invalid. */
const float = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseFloat(String(v));
  return isNaN(n) ? undefined : n;
};

/** Parses a safe integer; returns undefined when absent or invalid. */
const int = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? undefined : n;
};

/** Coerces booleans and boolean-like strings; returns undefined when absent. */
const bool = (v: unknown): boolean | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
};

/** Parses an ISO date string into a Date; returns undefined when invalid. */
const isoDate = (v: unknown): Date | undefined => {
  if (!v || typeof v !== 'string') return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

// ── S3 helpers ────────────────────────────────────────────────────────────────

function buildS3Key(userId: string, fieldName: DocumentFieldName): string {
  return `${userId}/${fieldName}.pdf`;
}

async function uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer, ContentType: contentType })
  );
}

async function deleteS3Objects(keys: string[]): Promise<void> {
  await Promise.allSettled(
    keys.map((key) => s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })))
  );
}

async function buildSignedUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_TTL }
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type UploadedFilesMap = Partial<Record<DocumentFieldName, Express.Multer.File[]>>;

// ── PUT /api/student-application/save-draft/:studentAdmissionApplicationId ────

export const saveDraft = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const rawAppId = req.params.studentAdmissionApplicationId;
  const studentAdmissionApplicationId = Array.isArray(rawAppId)
    ? (rawAppId[0] ?? '')
    : (rawAppId ?? '');
  const userId = req.user!.userId;
  const body = req.body as Record<string, unknown>;
  const files: UploadedFilesMap = (req.files as UploadedFilesMap | undefined) ?? {};

  if (!studentAdmissionApplicationId) {
    res.status(400).json({ error: 'studentAdmissionApplicationId is required.' });
    return;
  }

  try {
    // ── Step 1: Verify application exists + belongs to authenticated applicant ─

    const [application, applicant] = await Promise.all([
      prisma.studentAdmissionApplication.findUnique({
        where: { id: studentAdmissionApplicationId },
        select: { id: true, firstName: true, lastName: true, applicationStatus: true },
      }),
      prisma.applicant.findFirst({
        where: { studentAdmissionApplicationId, userId },
        select: { id: true },
      }),
    ]);

    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (!applicant) {
      res.status(403).json({ error: 'Access denied. This application does not belong to you.' });
      return;
    }

    // ── Step 2: Build dynamic partial update payloads ─────────────────────────

    // Basic details — only include keys that were explicitly provided
    const basicData: Record<string, unknown> = {};
    if (str(body.firstName)        !== undefined) basicData.firstName        = str(body.firstName);
    if (str(body.lastName)         !== undefined) basicData.lastName         = str(body.lastName);
    if (str(body.email)            !== undefined) basicData.email            = str(body.email);
    if (str(body.mobileNo)         !== undefined) basicData.mobileNo         = str(body.mobileNo);
    if (str(body.gender)           !== undefined) basicData.gender           = str(body.gender);
    if (str(body.fatherName)       !== undefined) basicData.fatherName       = str(body.fatherName);
    if (str(body.fatherMobileNo)   !== undefined) basicData.fatherMobileNo   = str(body.fatherMobileNo);
    if (str(body.fatherEmail)      !== undefined) basicData.fatherEmail      = str(body.fatherEmail);
    if (str(body.motherName)       !== undefined) basicData.motherName       = str(body.motherName);
    if (str(body.motherMobileNo)   !== undefined) basicData.motherMobileNo   = str(body.motherMobileNo);
    if (str(body.motherEmail)      !== undefined) basicData.motherEmail      = str(body.motherEmail);
    if (isoDate(body.dateOfBirth)  !== undefined) basicData.dateOfBirth      = isoDate(body.dateOfBirth);
    if (str(body.aadharNo)         !== undefined) basicData.aadharNo         = str(body.aadharNo);
    if (str(body.bloodGroup)       !== undefined) basicData.bloodGroup       = str(body.bloodGroup);
    if (str(body.caste)            !== undefined) basicData.caste            = str(body.caste);
    if (str(body.subCaste)         !== undefined) basicData.subCaste         = str(body.subCaste);
    if (str(body.state)            !== undefined) basicData.state            = str(body.state);
    if (str(body.city)             !== undefined) basicData.city             = str(body.city);
    if (str(body.pincode)          !== undefined) basicData.pincode          = str(body.pincode);
    if (str(body.presentAddress)   !== undefined) basicData.presentAddress   = str(body.presentAddress);
    if (str(body.permanentAddress) !== undefined) basicData.permanentAddress = str(body.permanentAddress);

    // Entrance exam details
    const entranceData: Record<string, unknown> = {};
    if (str(body.quallingEntranceExam)     !== undefined) entranceData.quallingEntranceExam     = str(body.quallingEntranceExam);
    if (str(body.entranceExamHallTicketNo) !== undefined) entranceData.entranceExamHallTicketNo = str(body.entranceExamHallTicketNo);
    if (str(body.entranceExamRank)         !== undefined) entranceData.entranceExamRank         = str(body.entranceExamRank);
    if (bool(body.intrestedInAurumExam)    !== undefined) entranceData.intrestedInAurumExam     = bool(body.intrestedInAurumExam);
    if (isoDate(body.aurumExamTime)        !== undefined) entranceData.aurumExamTime            = isoDate(body.aurumExamTime);

    // Education details (persisted in StudentEducationDetails)
    const eduData: Record<string, unknown> = {};
    if (str(body.sscBoard)                       !== undefined) eduData.sscBoard                    = str(body.sscBoard);
    if (int(body.sscYearOfPassing)               !== undefined) eduData.sscYearOfPassing            = int(body.sscYearOfPassing);
    if (str(body.sscHallTicketNo)                !== undefined) eduData.sscHallTicketNo             = str(body.sscHallTicketNo);
    if (str(body.sscInstitutionName)             !== undefined) eduData.sscInstitutionName          = str(body.sscInstitutionName);
    if (float(body.sscPercentage)                !== undefined) eduData.sscPercentage               = float(body.sscPercentage);
    if (str(body.intermediateBoard)              !== undefined) eduData.intermediateBoard           = str(body.intermediateBoard);
    if (int(body.intermediateYearOfPassing)      !== undefined) eduData.intermediateYearOfPassing   = int(body.intermediateYearOfPassing);
    if (str(body.intermediateHallTicketNo)       !== undefined) eduData.intermediateHallTicketNo    = str(body.intermediateHallTicketNo);
    if (str(body.intermediateInstitutionName)    !== undefined) eduData.intermediateInstitutionName = str(body.intermediateInstitutionName);
    if (float(body.intermediatePercentage)       !== undefined) eduData.intermediatePercentage      = float(body.intermediatePercentage);
    if (str(body.ugBoard)                        !== undefined) eduData.ugBoard                     = str(body.ugBoard);
    if (int(body.ugYearOfPassing)                !== undefined) eduData.ugYearOfPassing             = int(body.ugYearOfPassing);
    if (str(body.ugHallTicketNo)                 !== undefined) eduData.ugHallTicketNo              = str(body.ugHallTicketNo);
    if (str(body.ugInstitutionName)              !== undefined) eduData.ugInstitutionName           = str(body.ugInstitutionName);
    if (float(body.ugPercentage)                 !== undefined) eduData.ugPercentage                = float(body.ugPercentage);
    if (str(body.pgBoard)                        !== undefined) eduData.pgBoard                     = str(body.pgBoard);
    if (str(body.pgInstitutionName)             !== undefined) eduData.pgInstitutionName           = str(body.pgInstitutionName);
    if (str(body.pgHallTicketNo)                !== undefined) eduData.pgHallTicketNo              = str(body.pgHallTicketNo);
    if (int(body.pgYearOfPassing)                !== undefined) eduData.pgYearOfPassing             = int(body.pgYearOfPassing);
    if (float(body.pgPercentage)                 !== undefined) eduData.pgPercentage                = float(body.pgPercentage);

    const hasBasicUpdates    = Object.keys(basicData).length > 0;
    const hasEntranceUpdates = Object.keys(entranceData).length > 0;
    const hasEduUpdates      = Object.keys(eduData).length > 0;

    // Determine which document fields have a file in this request
    const incomingDocFields = DOCUMENT_FIELDS.filter((f) => files[f]?.[0] != null);

    // ── Step 3: Upload documents to S3 (before DB transaction) ───────────────

    const docS3KeyMap: Partial<Record<DocumentFieldName, string>> = {};
    const uploadedS3Keys: string[] = [];

    if (incomingDocFields.length > 0) {
      const uploadResults = await Promise.allSettled(
        incomingDocFields.map(async (field) => {
          const file = files[field]![0];
          const key  = buildS3Key(userId, field);
          await uploadToS3(key, file.buffer, file.mimetype);
          return { field, key };
        })
      );

      const failures = uploadResults.filter((r) => r.status === 'rejected');
      const successes = uploadResults.filter(
        (r): r is PromiseFulfilledResult<{ field: DocumentFieldName; key: string }> =>
          r.status === 'fulfilled'
      );

      // Collect keys that succeeded so we can roll them back if the DB fails
      for (const { value } of successes) {
        docS3KeyMap[value.field] = value.key;
        uploadedS3Keys.push(value.key);
      }

      if (failures.length > 0) {
        // Roll back any partial S3 uploads and abort
        await deleteS3Objects(uploadedS3Keys);
        res.status(502).json({ error: 'One or more document uploads to S3 failed. Please try again.' });
        return;
      }
    }

    // ── Step 4: Persist all changes in a single Prisma transaction ────────────

    try {
      await prisma.$transaction(async (tx) => {
        // Merge all application-level changes into one update
        const appUpdateData = {
          ...basicData,
          ...entranceData,
          ...docS3KeyMap,
          applicationStatus: ApplicationStatus.SAVED_AS_DRAFT,
        };

        await tx.studentAdmissionApplication.update({
          where: { id: studentAdmissionApplicationId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: appUpdateData as any,
          select: { id: true },
        });

        // Education details: find-first → update or create
        if (hasEduUpdates) {
          const existingEdu = await tx.studentEducationDetails.findFirst({
            where: { studentAdmissionApplicationId },
            select: { id: true },
          });

          // studentName may have been updated in this same request
          const studentName = [
            str(body.firstName) ?? application.firstName,
            str(body.lastName)  ?? application.lastName,
          ].join(' ');

          if (existingEdu) {
            await tx.studentEducationDetails.update({
              where: { id: existingEdu.id },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: { studentName, ...eduData } as any,
            });
          } else {
            await tx.studentEducationDetails.create({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: { studentAdmissionApplicationId, studentName, ...eduData } as any,
            });
          }
        }
      });
    } catch (dbErr) {
      // DB failed → roll back the S3 uploads that already succeeded
      if (uploadedS3Keys.length > 0) {
        await deleteS3Objects(uploadedS3Keys);
      }
      return next(dbErr);
    }

    // ── Step 5: Generate signed URLs for every uploaded document ─────────────

    const uploadedDocuments: Record<string, string> = {};
    if (uploadedS3Keys.length > 0) {
      await Promise.all(
        Object.entries(docS3KeyMap).map(async ([field, key]) => {
          uploadedDocuments[field] = await buildSignedUrl(key!);
        })
      );
    }

    // ── Step 6: Build updatedSections summary ─────────────────────────────────

    const updatedSections: string[] = [];
    if (hasBasicUpdates)             updatedSections.push('basicDetails');
    if (hasEduUpdates)               updatedSections.push('educationDetails');
    if (hasEntranceUpdates)          updatedSections.push('entranceExamDetails');
    if (incomingDocFields.length > 0) updatedSections.push('documents');

    res.status(200).json({
      message: 'Application saved as draft successfully.',
      applicationId: studentAdmissionApplicationId,
      applicationStatus: ApplicationStatus.SAVED_AS_DRAFT,
      updatedSections,
      uploadedDocuments,
    });
  } catch (error) {
    next(error);
  }
};
