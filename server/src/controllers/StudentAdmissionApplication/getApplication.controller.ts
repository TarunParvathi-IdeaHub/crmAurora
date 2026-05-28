import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../../config/database';
import s3 from '../../config/s3';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET       = process.env.AWS_BUCKET_NAME!;
const SIGNED_URL_TTL = 86_400; // 24 h in seconds

// ── Document field names (mirrors saveDraft keys) ─────────────────────────────

const DOCUMENT_FIELD_NAMES = [
  'aadharCard',
  'sscMemo',
  'intermediateMemo',
  'ugMemo',
  'pgMemo',
  'gapCertificate',
  'bonafideCertificate',
  'transferCertificate',
] as const;

type DocumentFieldName = (typeof DOCUMENT_FIELD_NAMES)[number];

// ── Signed URL helper ─────────────────────────────────────────────────────────

/**
 * Generates a temporary signed GET URL for an S3 object.
 * Returns null when `key` is null/undefined (document not yet uploaded).
 */
async function generateSignedGetUrl(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: SIGNED_URL_TTL },
  );
}

// ── Document mapper ───────────────────────────────────────────────────────────

type RawDocumentFields = Pick<
  Prisma.StudentAdmissionApplicationGetPayload<{ select: typeof APPLICATION_SELECT }>,
  DocumentFieldName
>;

type SignedDocuments = Record<DocumentFieldName, string | null>;

async function buildSignedDocuments(raw: RawDocumentFields): Promise<SignedDocuments> {
  const entries = await Promise.all(
    DOCUMENT_FIELD_NAMES.map(async (field) => [
      field,
      await generateSignedGetUrl(raw[field]),
    ] as const),
  );
  return Object.fromEntries(entries) as SignedDocuments;
}

// ── Prisma select ─────────────────────────────────────────────────────────────

const APPLICATION_SELECT = {
  id:                    true,
  applicationNumber:     true,

  institutionId:         true,
  degreeLevelId:         true,
  programId:             true,
  admissionCycleId:      true,

  admissionCounsellorId: true,
  admissionConsultantId: true,

  enquiryId:             true,

  firstName:             true,
  lastName:              true,
  email:                 true,
  mobileNo:              true,
  gender:                true,

  fatherName:            true,
  fatherMobileNo:        true,
  fatherEmail:           true,

  motherName:            true,
  motherMobileNo:        true,
  motherEmail:           true,

  dateOfBirth:           true,
  aadharNo:              true,
  bloodGroup:            true,
  caste:                 true,
  subCaste:              true,

  state:                 true,
  city:                  true,
  pincode:               true,
  presentAddress:        true,
  permanentAddress:      true,

  quallingEntranceExam:      true,
  entranceExamHallTicketNo:  true,
  entranceExamRank:          true,
  intrestedInAurumExam:      true,
  aurumExamTime:             true,

  // Raw S3 keys — replaced with signed URLs in the response
  aadharCard:            true,
  sscMemo:               true,
  intermediateMemo:      true,
  ugMemo:                true,
  pgMemo:                true,
  gapCertificate:        true,
  bonafideCertificate:   true,
  transferCertificate:   true,

  isActive:              true,
  applicationStatus:     true,
  consentDeclaration:    true,

  createdAt:             true,
  updatedAt:             true,

  institution: {
    select: {
      id:              true,
      institutionName: true,
      institutionCode: true,
      institutionCity: true,
      institutionState: true,
      email:           true,
      phoneNumber:     true,
    },
  },
  degreeLevel: {
    select: {
      id:        true,
      levelName: true,
    },
  },
  program: {
    select: {
      id:          true,
      programName: true,
      programCode: true,
    },
  },
  admissionCycle: {
    select: {
      id:                true,
      admissionCycleName: true,
    },
  },
  admissionCounsellor: {
    select: {
      id:          true,
      empId:       true,
      firstName:   true,
      lastName:    true,
      email:       true,
      mobileNo:    true,
      designation: true,
    },
  },
  admissionConsultant: {
    select: {
      id:          true,
      empId:       true,
      firstName:   true,
      lastName:    true,
      email:       true,
      mobileNo:    true,
      designation: true,
    },
  },
  studentEducationDetails: {
    select: {
      id:                          true,
      studentName:                 true,
      uid:                         true,
      applicationNumber:           true,
      sscBoard:                    true,
      sscYearOfPassing:            true,
      sscHallTicketNo:             true,
      sscInstitutionName:          true,
      sscPercentage:               true,
      intermediateBoard:           true,
      intermediateYearOfPassing:   true,
      intermediateHallTicketNo:    true,
      intermediateInstitutionName: true,
      intermediatePercentage:      true,
      ugBoard:                     true,
      ugYearOfPassing:             true,
      ugHallTicketNo:              true,
      ugInstitutionName:           true,
      ugPercentage:                true,
      pgBoard:                     true,
      pgInstitutionName:           true,
      pgHallTicketNo:              true,
      pgYearOfPassing:             true,
      pgPercentage:                true,
    },
  },
} satisfies Prisma.StudentAdmissionApplicationSelect;

type ApplicationRow = Prisma.StudentAdmissionApplicationGetPayload<{
  select: typeof APPLICATION_SELECT;
}>;

// ── Response type (public) ────────────────────────────────────────────────────

export interface GetApplicationResponse {
  id:                    string;
  applicationNumber:     string | null;

  institutionId:         string;
  degreeLevelId:         string;
  programId:             string;
  admissionCycleId:      string;

  admissionCounsellorId: string | null;
  admissionConsultantId: string | null;

  enquiryId:             string | null;

  firstName:             string;
  lastName:              string;
  email:                 string;
  mobileNo:              string;
  gender:                string | null;

  fatherName:            string | null;
  fatherMobileNo:        string | null;
  fatherEmail:           string | null;

  motherName:            string | null;
  motherMobileNo:        string | null;
  motherEmail:           string | null;

  dateOfBirth:           Date   | null;
  aadharNo:              string | null;
  bloodGroup:            string | null;
  caste:                 string | null;
  subCaste:              string | null;

  state:                 string | null;
  city:                  string | null;
  pincode:               string | null;
  presentAddress:        string | null;
  permanentAddress:      string | null;

  quallingEntranceExam:     string | null;
  entranceExamHallTicketNo: string | null;
  entranceExamRank:         string | null;
  intrestedInAurumExam:     boolean;
  aurumExamTime:            Date   | null;

  documents:             SignedDocuments;

  applicationStatus:     string;
  consentDeclaration:    string | null;

  createdAt:             Date;
  updatedAt:             Date;

  institution:           ApplicationRow['institution'];
  degreeLevel:           ApplicationRow['degreeLevel'];
  program:               ApplicationRow['program'];
  admissionCycle:        ApplicationRow['admissionCycle'];
  admissionCounsellor:   ApplicationRow['admissionCounsellor'];
  admissionConsultant:   ApplicationRow['admissionConsultant'];
  studentEducationDetails: ApplicationRow['studentEducationDetails'];
}

// ── Response formatter ────────────────────────────────────────────────────────

async function formatResponse(app: ApplicationRow): Promise<GetApplicationResponse> {
  const signedDocuments = await buildSignedDocuments(app);

  return {
    id:                    app.id,
    applicationNumber:     app.applicationNumber,

    institutionId:         app.institutionId,
    degreeLevelId:         app.degreeLevelId,
    programId:             app.programId,
    admissionCycleId:      app.admissionCycleId,

    admissionCounsellorId: app.admissionCounsellorId,
    admissionConsultantId: app.admissionConsultantId,

    enquiryId:             app.enquiryId,

    firstName:             app.firstName,
    lastName:              app.lastName,
    email:                 app.email,
    mobileNo:              app.mobileNo,
    gender:                app.gender,

    fatherName:            app.fatherName,
    fatherMobileNo:        app.fatherMobileNo,
    fatherEmail:           app.fatherEmail,

    motherName:            app.motherName,
    motherMobileNo:        app.motherMobileNo,
    motherEmail:           app.motherEmail,

    dateOfBirth:           app.dateOfBirth,
    aadharNo:              app.aadharNo,
    bloodGroup:            app.bloodGroup,
    caste:                 app.caste,
    subCaste:              app.subCaste,

    state:                 app.state,
    city:                  app.city,
    pincode:               app.pincode,
    presentAddress:        app.presentAddress,
    permanentAddress:      app.permanentAddress,

    quallingEntranceExam:     app.quallingEntranceExam,
    entranceExamHallTicketNo: app.entranceExamHallTicketNo,
    entranceExamRank:         app.entranceExamRank,
    intrestedInAurumExam:     app.intrestedInAurumExam,
    aurumExamTime:            app.aurumExamTime,

    documents:             signedDocuments,

    applicationStatus:     app.applicationStatus,
    consentDeclaration:    app.consentDeclaration,

    createdAt:             app.createdAt,
    updatedAt:             app.updatedAt,

    institution:           app.institution,
    degreeLevel:           app.degreeLevel,
    program:               app.program,
    admissionCycle:        app.admissionCycle,
    admissionCounsellor:   app.admissionCounsellor,
    admissionConsultant:   app.admissionConsultant,
    studentEducationDetails: app.studentEducationDetails,
  };
}

// ── GET /api/student-application/get/:applicationId ───────────────────────────

export const getApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const applicationId = Array.isArray(req.params.applicationId)
      ? req.params.applicationId[0]?.trim() ?? ''
      : (req.params.applicationId ?? '').trim();

    // ── Validation ─────────────────────────────────────────────────────────
    if (!applicationId) {
      res.status(400).json({ error: 'applicationId is required.' });
      return;
    }

    // ── Query ───────────────────────────────────────────────────────────────
    const application = await prisma.studentAdmissionApplication.findUnique({
      where:  { id: applicationId },
      select: APPLICATION_SELECT,
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    if (!application.isActive) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    // ── Build response (includes async signed URL generation) ───────────────
    const data = await formatResponse(application);

    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
