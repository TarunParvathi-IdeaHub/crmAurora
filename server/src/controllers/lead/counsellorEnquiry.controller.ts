import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { AdmissionResult } from '@prisma/client';
import prisma from '../../config/database';

// ─── Constants ────────────────────────────────────────────────────────────────

const RESTRICTED_FIELDS = ['admissionCounsellorId', 'admissionConsultantId'] as const;

const ALLOWED_UPDATE_FIELDS = [
  'firstName',
  'lastName',
  'mobileNo',
  'email',
  'state',
  'consentForContact',
  'levelId',
  'programId',
  'admissionCycleId',
  'result',
] as const;

type AllowedUpdateField = (typeof ALLOWED_UPDATE_FIELDS)[number];
type UpdatePayload      = Partial<Record<AllowedUpdateField, unknown>>;

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Prisma select (single source of truth) ───────────────────────────────────

const ENQUIRY_RESPONSE_SELECT = {
  id:                true,
  firstName:         true,
  lastName:          true,
  mobileNo:          true,
  email:             true,
  state:             true,
  consentForContact: true,
  institution:       { select: { institutionName: true, institutionCode: true } },
  degreeLevel:       { select: { levelName: true } },
  program:           { select: { programName: true, programCode: true } },
  admissionCycle:    { select: { admissionCycleName: true } },
  leadSourceType:    true,
  result:            true,
  createdAt:         true,
  updatedAt:         true,
} satisfies Prisma.EnquiryFormSelect;

type EnquiryResponse = Prisma.EnquiryFormGetPayload<{
  select: typeof ENQUIRY_RESPONSE_SELECT;
}>;

// ─── TypeScript response type ─────────────────────────────────────────────────

export interface EnquiryFormDTO {
  id:                string;
  firstName:         string;
  lastName:          string;
  mobileNo:          string;
  email:             string;
  state:             string;
  consentForContact: boolean;
  institution:       { institutionName: string; institutionCode: string };
  degreeLevel:       { levelName: string };
  program:           { programName: string; programCode: string };
  admissionCycle:    { admissionCycleName: string };
  leadSourceType:    string;
  result:            string | null;
  createdAt:         Date;
  updatedAt:         Date;
}

// ─── Response mapper ──────────────────────────────────────────────────────────

function mapEnquiryResponse(enquiry: EnquiryResponse): EnquiryFormDTO {
  return {
    id:                enquiry.id,
    firstName:         enquiry.firstName,
    lastName:          enquiry.lastName,
    mobileNo:          enquiry.mobileNo,
    email:             enquiry.email,
    state:             enquiry.state,
    consentForContact: enquiry.consentForContact,
    institution:       enquiry.institution,
    degreeLevel:       enquiry.degreeLevel,
    program:           enquiry.program,
    admissionCycle:    enquiry.admissionCycle,
    leadSourceType:    enquiry.leadSourceType,
    result:            enquiry.result ?? null,
    createdAt:         enquiry.createdAt,
    updatedAt:         enquiry.updatedAt,
  };
}

// ─── Allowed field extractor ──────────────────────────────────────────────────

function extractAllowedFields(body: Record<string, unknown>): UpdatePayload {
  const result: UpdatePayload = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      result[field] = body[field];
    }
  }
  return result;
}

// ─── Ownership validator ──────────────────────────────────────────────────────

type OwnershipResult =
  | { owned: true;  existing: { institutionId: string; levelId: string; programId: string; admissionCycleId: string } }
  | { owned: false; reason: 'not_found' | 'forbidden' };

async function validateOwnership(
  counsellorId: string,
  enquiryId:    string,
): Promise<OwnershipResult> {
  const record = await prisma.enquiryForm.findUnique({
    where:  { id: enquiryId },
    select: {
      admissionCounsellorId: true,
      institutionId:         true,
      levelId:               true,
      programId:             true,
      admissionCycleId:      true,
    },
  });

  if (!record) return { owned: false, reason: 'not_found' };
  if (record.admissionCounsellorId !== counsellorId) return { owned: false, reason: 'forbidden' };

  return {
    owned:    true,
    existing: {
      institutionId:    record.institutionId,
      levelId:          record.levelId,
      programId:        record.programId,
      admissionCycleId: record.admissionCycleId,
    },
  };
}

// ─── GET /api/leads/:counsellorId/:enquiryFormId ──────────────────────────────

export const getEnquiryForm = async (
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const counsellorId  = (req.params.counsellorId  as string)?.trim();
    const enquiryFormId = (req.params.enquiryFormId as string)?.trim();

    if (!counsellorId) {
      res.status(400).json({ error: 'counsellorId is required.' });
      return;
    }
    if (!enquiryFormId) {
      res.status(400).json({ error: 'enquiryFormId is required.' });
      return;
    }

    // ── Ownership check (lightweight query) ──────────────────────────────
    const ownerCheck = await prisma.enquiryForm.findUnique({
      where:  { id: enquiryFormId },
      select: { admissionCounsellorId: true },
    });

    if (!ownerCheck) {
      res.status(404).json({ error: 'Enquiry form not found.' });
      return;
    }
    if (ownerCheck.admissionCounsellorId !== counsellorId) {
      res.status(403).json({ error: 'Unauthorized access.' });
      return;
    }

    // ── Fetch full response data ──────────────────────────────────────────
    const enquiry = await prisma.enquiryForm.findUnique({
      where:  { id: enquiryFormId },
      select: ENQUIRY_RESPONSE_SELECT,
    });

    // enquiry is guaranteed to exist — ownership check just confirmed it
    res.status(200).json({ enquiry: mapEnquiryResponse(enquiry!) });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/leads/:counsellorId/:enquiryId ──────────────────────────────────

export const updateEnquiryForm = async (
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const counsellorId = (req.params.counsellorId as string)?.trim();
    const enquiryId    = (req.params.enquiryId    as string)?.trim();
    const body         = req.body as Record<string, unknown>;

    // ── Param validation ──────────────────────────────────────────────────
    if (!counsellorId) {
      res.status(400).json({ error: 'counsellorId is required.' });
      return;
    }
    if (!enquiryId) {
      res.status(400).json({ error: 'enquiryId is required.' });
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
    const ownership = await validateOwnership(counsellorId, enquiryId);
    if (!ownership.owned) {
      if (ownership.reason === 'not_found') {
        res.status(404).json({ error: 'Enquiry form not found.' });
        return;
      }
      res.status(403).json({ error: 'Unauthorized access.' });
      return;
    }

    const { existing } = ownership;

    // ── Extract only allowed fields ───────────────────────────────────────
    const fields = extractAllowedFields(body);

    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: 'No valid update fields provided.' });
      return;
    }

    // ── Field-level type validation ───────────────────────────────────────

    if (fields.firstName !== undefined) {
      if (typeof fields.firstName !== 'string' || fields.firstName.trim() === '') {
        res.status(400).json({ error: 'firstName must be a non-empty string.' });
        return;
      }
    }

    if (fields.lastName !== undefined) {
      if (typeof fields.lastName !== 'string' || fields.lastName.trim() === '') {
        res.status(400).json({ error: 'lastName must be a non-empty string.' });
        return;
      }
    }

    if (fields.state !== undefined) {
      if (typeof fields.state !== 'string' || fields.state.trim() === '') {
        res.status(400).json({ error: 'state must be a non-empty string.' });
        return;
      }
    }

    if (fields.consentForContact !== undefined) {
      if (typeof fields.consentForContact !== 'boolean') {
        res.status(400).json({ error: 'consentForContact must be a boolean.' });
        return;
      }
    }

    if (fields.mobileNo !== undefined) {
      if (typeof fields.mobileNo !== 'string' || !MOBILE_REGEX.test(fields.mobileNo)) {
        res.status(400).json({
          error: 'Invalid mobile number. Must be a 10-digit number starting with 6–9.',
        });
        return;
      }
    }

    if (fields.email !== undefined) {
      if (typeof fields.email !== 'string' || !EMAIL_REGEX.test(fields.email.trim())) {
        res.status(400).json({ error: 'Invalid email address.' });
        return;
      }
      const emailDuplicate = await prisma.enquiryForm.findFirst({
        where:  { email: fields.email.trim().toLowerCase(), NOT: { id: enquiryId } },
        select: { id: true },
      });
      if (emailDuplicate) {
        res.status(400).json({ error: 'Email address is already in use by another enquiry.' });
        return;
      }
    }

    if (fields.result !== undefined && fields.result !== null) {
      const validResults = Object.values(AdmissionResult) as string[];
      if (typeof fields.result !== 'string' || !validResults.includes(fields.result)) {
        res.status(400).json({
          error: `Invalid result. Allowed values: ${validResults.join(', ')}.`,
        });
        return;
      }
    }

    // ── Relational integrity validation ───────────────────────────────────

    const resolvedLevelId  = (fields.levelId          as string | undefined) ?? existing.levelId;
    const resolvedProgramId = (fields.programId        as string | undefined) ?? existing.programId;
    const resolvedCycleId  = (fields.admissionCycleId  as string | undefined) ?? existing.admissionCycleId;

    if (fields.levelId !== undefined) {
      const level = await prisma.degreeLevel.findFirst({
        where:  { id: resolvedLevelId, institutionId: existing.institutionId },
        select: { id: true },
      });
      if (!level) {
        res.status(400).json({
          error: 'Degree level not found or does not belong to this institution.',
        });
        return;
      }
    }

    if (fields.levelId !== undefined || fields.programId !== undefined) {
      const program = await prisma.program.findFirst({
        where: {
          id:            resolvedProgramId,
          levelId:       resolvedLevelId,
          institutionId: existing.institutionId,
        },
        select: { id: true },
      });
      if (!program) {
        res.status(400).json({
          error: 'Program not found or does not belong to the selected degree level.',
        });
        return;
      }
    }

    if (
      fields.levelId !== undefined ||
      fields.programId !== undefined ||
      fields.admissionCycleId !== undefined
    ) {
      const cycle = await prisma.admissionCycle.findFirst({
        where:  { id: resolvedCycleId, programId: resolvedProgramId },
        select: { id: true },
      });
      if (!cycle) {
        res.status(400).json({
          error: 'Admission cycle not found or does not belong to the selected program.',
        });
        return;
      }
    }

    // ── Build partial update payload (no mass assignment) ─────────────────

    const updateData: Prisma.EnquiryFormUpdateInput = {};

    if (fields.firstName         !== undefined) updateData.firstName         = (fields.firstName as string).trim();
    if (fields.lastName          !== undefined) updateData.lastName          = (fields.lastName  as string).trim();
    if (fields.mobileNo          !== undefined) updateData.mobileNo          = fields.mobileNo  as string;
    if (fields.email             !== undefined) updateData.email             = (fields.email as string).trim().toLowerCase();
    if (fields.state             !== undefined) updateData.state             = (fields.state as string).trim();
    if (fields.consentForContact !== undefined) updateData.consentForContact = fields.consentForContact as boolean;
    if (fields.result            !== undefined) updateData.result            = fields.result === null ? null : (fields.result as AdmissionResult);
    if (fields.levelId           !== undefined) updateData.degreeLevel       = { connect: { id: fields.levelId          as string } };
    if (fields.programId         !== undefined) updateData.program           = { connect: { id: fields.programId        as string } };
    if (fields.admissionCycleId  !== undefined) updateData.admissionCycle    = { connect: { id: fields.admissionCycleId as string } };

    // ── Persist and return ────────────────────────────────────────────────

    const updated = await prisma.enquiryForm.update({
      where:  { id: enquiryId },
      data:   updateData,
      select: ENQUIRY_RESPONSE_SELECT,
    });

    res.status(200).json({ enquiry: mapEnquiryResponse(updated) });
  } catch (error) {
    next(error);
  }
};
