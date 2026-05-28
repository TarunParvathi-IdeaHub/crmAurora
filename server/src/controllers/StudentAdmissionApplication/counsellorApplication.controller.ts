import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { ApplicationStatus } from '@prisma/client';
import prisma from '../../config/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const RESTRICTED_FIELDS = ['admissionCounsellorId', 'admissionConsultantId'] as const;

const ALLOWED_APP_FIELDS = [
  'firstName', 'lastName', 'email', 'mobileNo', 'gender',
  'fatherName', 'fatherMobileNo', 'fatherEmail',
  'motherName', 'motherMobileNo', 'motherEmail',
  'dateOfBirth', 'aadharNo', 'bloodGroup', 'caste', 'subCaste',
  'state', 'presentAddress', 'permanentAddress',
  'degreeLevelId', 'programId', 'admissionCycleId',
  'quallingEntranceExam', 'entranceExamHallTicketNo', 'entranceExamRank',
  'intrestedInAurumExam', 'aurumExamTime',
  'aadharCard', 'sscMemo', 'intermediateMemo', 'ugMemo', 'pgMemo',
  'gapCertificate', 'bonafideCertificate', 'transferCertificate',
  'applicationStatus', 'consentDeclaration',
] as const;

const ALLOWED_EDU_FIELDS = [
  'sscBoard', 'sscYearOfPassing', 'sscHallTicketNo', 'sscInstitutionName', 'sscPercentage',
  'intermediateBoard', 'intermediateYearOfPassing', 'intermediateHallTicketNo',
  'intermediateInstitutionName', 'intermediatePercentage',
  'ugBoard', 'ugYearOfPassing', 'ugHallTicketNo', 'ugInstitutionName', 'ugPercentage',
  'pgBoard', 'pgInstitutionName', 'pgHallTicketNo', 'pgYearOfPassing', 'pgPercentage',
] as const;

type AllowedAppField = (typeof ALLOWED_APP_FIELDS)[number];
type AllowedEduField = (typeof ALLOWED_EDU_FIELDS)[number];
type AppPayload      = Partial<Record<AllowedAppField, unknown>>;
type EduPayload      = Partial<Record<AllowedEduField, unknown>>;

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Value coercers ───────────────────────────────────────────────────────────

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;

const strOrNull = (v: unknown): string | null | undefined => {
  if (v === null) return null;
  return str(v);
};

const bool = (v: unknown): boolean | undefined => {
  if (typeof v === 'boolean') return v;
  if (v === 'true')  return true;
  if (v === 'false') return false;
  return undefined;
};

const isoDate = (v: unknown): Date | undefined => {
  if (!v || typeof v !== 'string') return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

const floatInRange = (v: unknown, min: number, max: number): number | null | undefined => {
  if (v === null) return null;
  if (v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n) || n < min || n > max) return undefined;
  return n;
};

const yearInt = (v: unknown): number | null | undefined => {
  if (v === null) return null;
  if (v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  const currentYear = new Date().getFullYear();
  if (isNaN(n) || n < 1900 || n > currentYear + 1) return undefined;
  return n;
};

// ─── Prisma select (single source of truth) ───────────────────────────────────

const APPLICATION_RESPONSE_SELECT = {
  id:                       true,
  applicationNumber:        true,
  firstName:                true,
  lastName:                 true,
  email:                    true,
  mobileNo:                 true,
  gender:                   true,
  fatherName:               true,
  fatherMobileNo:           true,
  fatherEmail:              true,
  motherName:               true,
  motherMobileNo:           true,
  motherEmail:              true,
  dateOfBirth:              true,
  aadharNo:                 true,
  bloodGroup:               true,
  caste:                    true,
  subCaste:                 true,
  state:                    true,
  presentAddress:           true,
  permanentAddress:         true,
  quallingEntranceExam:     true,
  entranceExamHallTicketNo: true,
  entranceExamRank:         true,
  intrestedInAurumExam:     true,
  aurumExamTime:            true,
  aadharCard:               true,
  sscMemo:                  true,
  intermediateMemo:         true,
  ugMemo:                   true,
  pgMemo:                   true,
  gapCertificate:           true,
  bonafideCertificate:      true,
  transferCertificate:      true,
  applicationStatus:        true,
  consentDeclaration:       true,
  institution:              { select: { institutionName: true, institutionCode: true } },
  degreeLevel:              { select: { levelName: true } },
  program:                  { select: { programName: true, programCode: true } },
  admissionCycle:           { select: { admissionCycleName: true } },
  studentEducationDetails:  {
    select: {
      id:                          true,
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
      pgYearOfPassing:             true,
      pgPercentage:                true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentAdmissionApplicationSelect;

type ApplicationResult = Prisma.StudentAdmissionApplicationGetPayload<{
  select: typeof APPLICATION_RESPONSE_SELECT;
}>;

// ─── TypeScript response DTO ──────────────────────────────────────────────────

export type ApplicationFormDTO = ApplicationResult;

// ─── Response mapper ──────────────────────────────────────────────────────────

function mapApplicationResponse(app: ApplicationResult): ApplicationFormDTO {
  return app;
}

// ─── Allowed field extractor ──────────────────────────────────────────────────

function extractFields<T extends string>(
  body:         Record<string, unknown>,
  allowedKeys:  ReadonlyArray<T>,
): Partial<Record<T, unknown>> {
  const result: Partial<Record<T, unknown>> = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      result[key] = body[key];
    }
  }
  return result;
}

// ─── Education fields validator + builder ─────────────────────────────────────

type EduFieldsResult =
  | { valid: true;  fields: Record<string, unknown> }
  | { valid: false; error: string };

const EDU_STRING_FIELDS: AllowedEduField[] = [
  'sscBoard', 'sscHallTicketNo', 'sscInstitutionName',
  'intermediateBoard', 'intermediateHallTicketNo', 'intermediateInstitutionName',
  'ugBoard', 'ugHallTicketNo', 'ugInstitutionName',
  'pgBoard',
];

const EDU_YEAR_FIELDS: AllowedEduField[] = [
  'sscYearOfPassing', 'intermediateYearOfPassing', 'ugYearOfPassing', 'pgYearOfPassing',
];

const EDU_PERCENT_FIELDS: AllowedEduField[] = [
  'sscPercentage', 'intermediatePercentage', 'ugPercentage', 'pgPercentage',
];

function validateAndBuildEduFields(payload: EduPayload): EduFieldsResult {
  const fields: Record<string, unknown> = {};

  for (const f of EDU_STRING_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, f)) continue;
    const raw = payload[f];
    if (raw !== null && typeof raw !== 'string') {
      return { valid: false, error: `${f} must be a string or null.` };
    }
    fields[f] = raw === null ? null : (raw as string).trim() || null;
  }

  for (const f of EDU_YEAR_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, f)) continue;
    const coerced = yearInt(payload[f]);
    if (coerced === undefined) {
      return { valid: false, error: `${f} must be a valid 4-digit year (1900–${new Date().getFullYear() + 1}) or null.` };
    }
    fields[f] = coerced;
  }

  for (const f of EDU_PERCENT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(payload, f)) continue;
    const coerced = floatInRange(payload[f], 0, 100);
    if (coerced === undefined) {
      return { valid: false, error: `${f} must be a number between 0 and 100, or null.` };
    }
    fields[f] = coerced;
  }

  return { valid: true, fields };
}

// ─── Ownership validator ──────────────────────────────────────────────────────

type OwnershipRecord = {
  institutionId:    string;
  degreeLevelId:    string;
  programId:        string;
  admissionCycleId: string;
  firstName:        string;
  lastName:         string;
};

type OwnershipResult =
  | { owned: true;  existing: OwnershipRecord }
  | { owned: false; reason: 'not_found' | 'forbidden' };

async function validateOwnership(
  counsellorId:  string,
  applicationId: string,
): Promise<OwnershipResult> {
  const record = await prisma.studentAdmissionApplication.findUnique({
    where:  { id: applicationId },
    select: {
      admissionCounsellorId: true,
      institutionId:         true,
      degreeLevelId:         true,
      programId:             true,
      admissionCycleId:      true,
      firstName:             true,
      lastName:              true,
    },
  });

  if (!record) return { owned: false, reason: 'not_found' };
  if (record.admissionCounsellorId !== counsellorId) return { owned: false, reason: 'forbidden' };

  return {
    owned:    true,
    existing: {
      institutionId:    record.institutionId,
      degreeLevelId:    record.degreeLevelId,
      programId:        record.programId,
      admissionCycleId: record.admissionCycleId,
      firstName:        record.firstName,
      lastName:         record.lastName,
    },
  };
}

// ─── GET /api/applications/:counsellorId/:applicationId ───────────────────────

export const getApplication = async (
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const counsellorId  = (req.params.counsellorId  as string)?.trim();
    const applicationId = (req.params.applicationId as string)?.trim();

    if (!counsellorId) {
      res.status(400).json({ error: 'counsellorId is required.' });
      return;
    }
    if (!applicationId) {
      res.status(400).json({ error: 'applicationId is required.' });
      return;
    }

    // ── Lightweight ownership check ───────────────────────────────────────
    const ownerCheck = await prisma.studentAdmissionApplication.findUnique({
      where:  { id: applicationId },
      select: { admissionCounsellorId: true },
    });

    if (!ownerCheck) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (ownerCheck.admissionCounsellorId !== counsellorId) {
      res.status(403).json({ error: 'Unauthorized access.' });
      return;
    }

    // ── Fetch full response data ───────────────────────────────────────────
    const application = await prisma.studentAdmissionApplication.findUnique({
      where:  { id: applicationId },
      select: APPLICATION_RESPONSE_SELECT,
    });

    // application is guaranteed to exist — ownership check just confirmed it
    res.status(200).json({ application: mapApplicationResponse(application!) });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/applications/:counsellorId/:applicationId ───────────────────────

export const updateApplication = async (
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const counsellorId  = (req.params.counsellorId  as string)?.trim();
    const applicationId = (req.params.applicationId as string)?.trim();
    const body          = req.body as Record<string, unknown>;

    // ── Param validation ──────────────────────────────────────────────────
    if (!counsellorId) {
      res.status(400).json({ error: 'counsellorId is required.' });
      return;
    }
    if (!applicationId) {
      res.status(400).json({ error: 'applicationId is required.' });
      return;
    }

    // ── Reject restricted fields ──────────────────────────────────────────
    const foundRestricted = RESTRICTED_FIELDS.filter((f) =>
      Object.prototype.hasOwnProperty.call(body, f),
    );
    if (foundRestricted.length > 0) {
      res.status(400).json({ error: 'Invalid update fields.' });
      return;
    }

    // ── Ownership + existence check ───────────────────────────────────────
    const ownership = await validateOwnership(counsellorId, applicationId);
    if (!ownership.owned) {
      if (ownership.reason === 'not_found') {
        res.status(404).json({ error: 'Application not found.' });
        return;
      }
      res.status(403).json({ error: 'Unauthorized access.' });
      return;
    }

    const { existing } = ownership;

    // ── Separate allowed app fields from education fields ─────────────────
    const appPayload = extractFields(body, ALLOWED_APP_FIELDS);
    const eduPayload = extractFields(body, ALLOWED_EDU_FIELDS);

    const hasAppFields = Object.keys(appPayload).length > 0;
    const hasEduFields = Object.keys(eduPayload).length > 0;

    if (!hasAppFields && !hasEduFields) {
      res.status(400).json({ error: 'No valid update fields provided.' });
      return;
    }

    // ── Field-level validation ────────────────────────────────────────────

    if (appPayload.mobileNo !== undefined) {
      if (typeof appPayload.mobileNo !== 'string' || !MOBILE_REGEX.test(appPayload.mobileNo)) {
        res.status(400).json({ error: 'Invalid mobileNo. Must be a 10-digit number starting with 6–9.' });
        return;
      }
    }

    if (appPayload.fatherMobileNo !== undefined && appPayload.fatherMobileNo !== null) {
      if (typeof appPayload.fatherMobileNo !== 'string' || !MOBILE_REGEX.test(appPayload.fatherMobileNo)) {
        res.status(400).json({ error: 'Invalid fatherMobileNo. Must be a 10-digit number starting with 6–9.' });
        return;
      }
    }

    if (appPayload.motherMobileNo !== undefined && appPayload.motherMobileNo !== null) {
      if (typeof appPayload.motherMobileNo !== 'string' || !MOBILE_REGEX.test(appPayload.motherMobileNo)) {
        res.status(400).json({ error: 'Invalid motherMobileNo. Must be a 10-digit number starting with 6–9.' });
        return;
      }
    }

    if (appPayload.email !== undefined) {
      if (typeof appPayload.email !== 'string' || !EMAIL_REGEX.test(appPayload.email.trim())) {
        res.status(400).json({ error: 'Invalid email address.' });
        return;
      }
      const emailDuplicate = await prisma.studentAdmissionApplication.findFirst({
        where:  { email: appPayload.email.trim().toLowerCase(), NOT: { id: applicationId } },
        select: { id: true },
      });
      if (emailDuplicate) {
        res.status(400).json({ error: 'Email address is already in use by another application.' });
        return;
      }
    }

    if (appPayload.fatherEmail !== undefined && appPayload.fatherEmail !== null) {
      if (typeof appPayload.fatherEmail !== 'string' || !EMAIL_REGEX.test((appPayload.fatherEmail as string).trim())) {
        res.status(400).json({ error: 'Invalid fatherEmail address.' });
        return;
      }
    }

    if (appPayload.motherEmail !== undefined && appPayload.motherEmail !== null) {
      if (typeof appPayload.motherEmail !== 'string' || !EMAIL_REGEX.test((appPayload.motherEmail as string).trim())) {
        res.status(400).json({ error: 'Invalid motherEmail address.' });
        return;
      }
    }

    if (appPayload.dateOfBirth !== undefined && appPayload.dateOfBirth !== null) {
      if (!isoDate(appPayload.dateOfBirth)) {
        res.status(400).json({ error: 'Invalid dateOfBirth. Must be a valid ISO 8601 date string.' });
        return;
      }
    }

    if (appPayload.aurumExamTime !== undefined && appPayload.aurumExamTime !== null) {
      if (!isoDate(appPayload.aurumExamTime)) {
        res.status(400).json({ error: 'Invalid aurumExamTime. Must be a valid ISO 8601 date string.' });
        return;
      }
    }

    if (appPayload.applicationStatus !== undefined) {
      const validStatuses = Object.values(ApplicationStatus) as string[];
      if (typeof appPayload.applicationStatus !== 'string' || !validStatuses.includes(appPayload.applicationStatus)) {
        res.status(400).json({
          error: `Invalid applicationStatus. Allowed values: ${validStatuses.join(', ')}.`,
        });
        return;
      }
    }

    // ── Relational integrity validation ───────────────────────────────────

    const resolvedLevelId  = (appPayload.degreeLevelId    as string | undefined) ?? existing.degreeLevelId;
    const resolvedProgramId = (appPayload.programId        as string | undefined) ?? existing.programId;
    const resolvedCycleId  = (appPayload.admissionCycleId as string | undefined) ?? existing.admissionCycleId;

    if (appPayload.degreeLevelId !== undefined) {
      const level = await prisma.degreeLevel.findFirst({
        where:  { id: resolvedLevelId, institutionId: existing.institutionId },
        select: { id: true },
      });
      if (!level) {
        res.status(400).json({ error: 'Degree level not found or does not belong to this institution.' });
        return;
      }
    }

    if (appPayload.degreeLevelId !== undefined || appPayload.programId !== undefined) {
      const program = await prisma.program.findFirst({
        where: {
          id:            resolvedProgramId,
          levelId:       resolvedLevelId,
          institutionId: existing.institutionId,
        },
        select: { id: true },
      });
      if (!program) {
        res.status(400).json({ error: 'Program not found or does not belong to the selected degree level.' });
        return;
      }
    }

    if (
      appPayload.degreeLevelId    !== undefined ||
      appPayload.programId        !== undefined ||
      appPayload.admissionCycleId !== undefined
    ) {
      const cycle = await prisma.admissionCycle.findFirst({
        where:  { id: resolvedCycleId, programId: resolvedProgramId },
        select: { id: true },
      });
      if (!cycle) {
        res.status(400).json({ error: 'Admission cycle not found or does not belong to the selected program.' });
        return;
      }
    }

    // ── Validate and build education fields ───────────────────────────────

    let eduFields: Record<string, unknown> = {};
    if (hasEduFields) {
      const eduResult = validateAndBuildEduFields(eduPayload);
      if (!eduResult.valid) {
        res.status(400).json({ error: eduResult.error });
        return;
      }
      eduFields = eduResult.fields;
    }

    // ── Build application update payload (no mass assignment) ─────────────

    const appUpdateData: Prisma.StudentAdmissionApplicationUpdateInput = {};

    if (appPayload.firstName           !== undefined) appUpdateData.firstName           = str(appPayload.firstName)  ?? '';
    if (appPayload.lastName            !== undefined) appUpdateData.lastName            = str(appPayload.lastName)   ?? '';
    if (appPayload.email               !== undefined) appUpdateData.email               = (appPayload.email as string).trim().toLowerCase();
    if (appPayload.mobileNo            !== undefined) appUpdateData.mobileNo            = appPayload.mobileNo as string;
    if (appPayload.gender              !== undefined) appUpdateData.gender              = strOrNull(appPayload.gender)              ?? null;
    if (appPayload.fatherName          !== undefined) appUpdateData.fatherName          = strOrNull(appPayload.fatherName)          ?? null;
    if (appPayload.fatherMobileNo      !== undefined) appUpdateData.fatherMobileNo      = strOrNull(appPayload.fatherMobileNo)      ?? null;
    if (appPayload.fatherEmail         !== undefined) appUpdateData.fatherEmail         = appPayload.fatherEmail !== null ? (appPayload.fatherEmail as string).trim().toLowerCase() : null;
    if (appPayload.motherName          !== undefined) appUpdateData.motherName          = strOrNull(appPayload.motherName)          ?? null;
    if (appPayload.motherMobileNo      !== undefined) appUpdateData.motherMobileNo      = strOrNull(appPayload.motherMobileNo)      ?? null;
    if (appPayload.motherEmail         !== undefined) appUpdateData.motherEmail         = appPayload.motherEmail !== null ? (appPayload.motherEmail as string).trim().toLowerCase() : null;
    if (appPayload.dateOfBirth         !== undefined) appUpdateData.dateOfBirth         = appPayload.dateOfBirth !== null ? isoDate(appPayload.dateOfBirth) ?? null : null;
    if (appPayload.aadharNo            !== undefined) appUpdateData.aadharNo            = strOrNull(appPayload.aadharNo)            ?? null;
    if (appPayload.bloodGroup          !== undefined) appUpdateData.bloodGroup          = strOrNull(appPayload.bloodGroup)          ?? null;
    if (appPayload.caste               !== undefined) appUpdateData.caste               = strOrNull(appPayload.caste)               ?? null;
    if (appPayload.subCaste            !== undefined) appUpdateData.subCaste            = strOrNull(appPayload.subCaste)            ?? null;
    if (appPayload.state               !== undefined) appUpdateData.state               = str(appPayload.state) ?? '';
    if (appPayload.presentAddress      !== undefined) appUpdateData.presentAddress      = strOrNull(appPayload.presentAddress)      ?? null;
    if (appPayload.permanentAddress    !== undefined) appUpdateData.permanentAddress    = strOrNull(appPayload.permanentAddress)    ?? null;
    if (appPayload.quallingEntranceExam    !== undefined) appUpdateData.quallingEntranceExam    = strOrNull(appPayload.quallingEntranceExam)    ?? null;
    if (appPayload.entranceExamHallTicketNo !== undefined) appUpdateData.entranceExamHallTicketNo = strOrNull(appPayload.entranceExamHallTicketNo) ?? null;
    if (appPayload.entranceExamRank    !== undefined) appUpdateData.entranceExamRank    = strOrNull(appPayload.entranceExamRank)    ?? null;
    if (appPayload.intrestedInAurumExam !== undefined) appUpdateData.intrestedInAurumExam = bool(appPayload.intrestedInAurumExam) ?? true;
    if (appPayload.aurumExamTime       !== undefined) appUpdateData.aurumExamTime       = appPayload.aurumExamTime !== null ? isoDate(appPayload.aurumExamTime) ?? null : null;
    if (appPayload.aadharCard          !== undefined) appUpdateData.aadharCard          = strOrNull(appPayload.aadharCard)          ?? null;
    if (appPayload.sscMemo             !== undefined) appUpdateData.sscMemo             = strOrNull(appPayload.sscMemo)             ?? null;
    if (appPayload.intermediateMemo    !== undefined) appUpdateData.intermediateMemo    = strOrNull(appPayload.intermediateMemo)    ?? null;
    if (appPayload.ugMemo              !== undefined) appUpdateData.ugMemo              = strOrNull(appPayload.ugMemo)              ?? null;
    if (appPayload.pgMemo              !== undefined) appUpdateData.pgMemo              = strOrNull(appPayload.pgMemo)              ?? null;
    if (appPayload.gapCertificate      !== undefined) appUpdateData.gapCertificate      = strOrNull(appPayload.gapCertificate)      ?? null;
    if (appPayload.bonafideCertificate !== undefined) appUpdateData.bonafideCertificate = strOrNull(appPayload.bonafideCertificate) ?? null;
    if (appPayload.transferCertificate !== undefined) appUpdateData.transferCertificate = strOrNull(appPayload.transferCertificate) ?? null;
    if (appPayload.applicationStatus   !== undefined) appUpdateData.applicationStatus   = appPayload.applicationStatus as ApplicationStatus;
    if (appPayload.consentDeclaration  !== undefined) appUpdateData.consentDeclaration  = strOrNull(appPayload.consentDeclaration)  ?? null;
    if (appPayload.degreeLevelId       !== undefined) appUpdateData.degreeLevel         = { connect: { id: appPayload.degreeLevelId    as string } };
    if (appPayload.programId           !== undefined) appUpdateData.program             = { connect: { id: appPayload.programId        as string } };
    if (appPayload.admissionCycleId    !== undefined) appUpdateData.admissionCycle      = { connect: { id: appPayload.admissionCycleId as string } };

    // ── Resolve final student name for education details ──────────────────

    const resolvedFirstName = (appPayload.firstName !== undefined ? str(appPayload.firstName) : undefined) ?? existing.firstName;
    const resolvedLastName  = (appPayload.lastName  !== undefined ? str(appPayload.lastName)  : undefined) ?? existing.lastName;
    const studentName       = `${resolvedFirstName} ${resolvedLastName}`.trim();

    // ── Transactional update: application + education details ─────────────

    const updated = await prisma.$transaction(async (tx) => {
      if (hasAppFields) {
        await tx.studentAdmissionApplication.update({
          where: { id: applicationId },
          data:  appUpdateData,
        });
      }

      if (hasEduFields) {
        const existingEdu = await tx.studentEducationDetails.findFirst({
          where:  { studentAdmissionApplicationId: applicationId },
          select: { id: true },
        });

        if (existingEdu) {
          await tx.studentEducationDetails.update({
            where: { id: existingEdu.id },
            data:  eduFields,
          });
        } else {
          await tx.studentEducationDetails.create({
            data: {
              studentAdmissionApplicationId: applicationId,
              studentName,
              ...eduFields,
            },
          });
        }
      }

      return tx.studentAdmissionApplication.findUnique({
        where:  { id: applicationId },
        select: APPLICATION_RESPONSE_SELECT,
      });
    });

    res.status(200).json({ application: mapApplicationResponse(updated!) });
  } catch (error) {
    next(error);
  }
};


