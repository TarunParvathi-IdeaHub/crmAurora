import type { NextFunction, Request, Response } from 'express';
import prisma from '../config/database';
import type { AuthRequest } from '../middleware/auth.middleware';

// ── Validators ───────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

// ── Required body field names ─────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'institutionName',
  'institutionCode',
  'institutionArea',
  'institutionCity',
  'institutionPincode',
  'institutionState',
  'institutionPhoneNumber',
  'institutionEmail',
] as const;

// ── Sanitized payload ─────────────────────────────────────────────────────────

type SanitizedInstitution = {
  institutionName: string;
  institutionCode: string;
  institutionArea: string;
  institutionCity: string;
  institutionPincode: string;
  institutionState: string;
  phoneNumber: string;   // mapped to Prisma field name
  email: string;         // mapped to Prisma field name
};

/**
 * Extract, trim, and normalise all institution fields from request body.
 * Returns null when any required field is missing or blank.
 */
function sanitizeBody(body: Record<string, unknown>): SanitizedInstitution | null {
  for (const field of REQUIRED_FIELDS) {
    const value = body[field];
    if (typeof value !== 'string' || !value.trim()) return null;
  }

  return {
    institutionName:  (body.institutionName  as string).trim(),
    institutionCode:  (body.institutionCode  as string).trim().toUpperCase(),
    institutionArea:  (body.institutionArea  as string).trim(),
    institutionCity:  (body.institutionCity  as string).trim(),
    institutionPincode: (body.institutionPincode as string).trim(),
    institutionState: (body.institutionState as string).trim(),
    phoneNumber:      (body.institutionPhoneNumber as string).trim(),
    email:            (body.institutionEmail  as string).trim().toLowerCase(),
  };
}

// ── Create Institution ────────────────────────────────────────────────────────

export const createInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = sanitizeBody(req.body as Record<string, unknown>);

    if (!data) {
      res.status(400).json({
        error: 'Name, Code, Area, City, State, Phone Number, Pin Code and Email are mandatory.',
      });
      return;
    }

    if (!EMAIL_REGEX.test(data.email)) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    if (!PHONE_REGEX.test(data.phoneNumber)) {
      res.status(400).json({ error: 'Invalid phone number. Must be exactly 10 digits.' });
      return;
    }

    // Single query covers all three unique constraints.
    const duplicate = await prisma.institution.findFirst({
      where: {
        OR: [
          { institutionCode: data.institutionCode },
          { email: data.email },
          { phoneNumber: data.phoneNumber },
        ],
      },
      select: { institutionCode: true, email: true, phoneNumber: true },
    });

    if (duplicate) {
      if (duplicate.institutionCode === data.institutionCode) {
        res.status(409).json({ error: 'Institution with the same code already exists.' });
      } else if (duplicate.email === data.email) {
        res.status(409).json({ error: 'Institution with the same email already exists.' });
      } else {
        res.status(409).json({ error: 'Institution with the same phone number already exists.' });
      }
      return;
    }

    const institution = await prisma.institution.create({
      data: {
        institutionName:  data.institutionName,
        institutionCode:  data.institutionCode,
        institutionArea:  data.institutionArea,
        institutionCity:  data.institutionCity,
        institutionPincode: data.institutionPincode,
        institutionState: data.institutionState,
        phoneNumber:      data.phoneNumber,
        email:            data.email,
      },
      select: {
        id: true,
        institutionName: true,
        institutionCode: true,
        institutionArea: true,
        institutionCity: true,
        institutionPincode: true,
        institutionState: true,
        phoneNumber: true,
        email: true,
      },
    });

    res.status(201).json({ message: 'Institution created successfully.', institution });
  } catch (error) {
    next(error);
  }
};

// ── Update Institution ────────────────────────────────────────────────────────

export const updateInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const data = sanitizeBody(req.body as Record<string, unknown>);

    if (!data) {
      res.status(400).json({
        error: 'Name, Code, Area, City, State, Phone Number, and Email are mandatory.',
      });
      return;
    }

    const targetCode = String(req.params.institutionCode || '').trim().toUpperCase();
    if (!targetCode) {
      res.status(400).json({ error: 'Target institution code is required.' });
      return;
    }

    if (!EMAIL_REGEX.test(data.email)) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    if (!PHONE_REGEX.test(data.phoneNumber)) {
      res.status(400).json({ error: 'Invalid phone number. Must be exactly 10 digits.' });
      return;
    }

    const existing = await prisma.institution.findUnique({
      where: { institutionCode: targetCode },
    });

    if (!existing) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    // Single query — exclude the current record, then check all three unique constraints.
    const duplicate = await prisma.institution.findFirst({
      where: {
        NOT: { institutionCode: targetCode },
        OR: [
          { institutionCode: data.institutionCode },
          { email: data.email },
          { phoneNumber: data.phoneNumber },
        ],
      },
      select: { institutionCode: true, email: true, phoneNumber: true },
    });

    if (duplicate) {
      if (duplicate.institutionCode === data.institutionCode) {
        res.status(409).json({ error: 'Another institution with this code already exists.' });
      } else if (duplicate.email === data.email) {
        res.status(409).json({ error: 'Another institution with this email already exists.' });
      } else {
        res.status(409).json({ error: 'Another institution with this phone number already exists.' });
      }
      return;
    }

    const isActivePatch = typeof (req.body as Record<string, unknown>).isActive === 'boolean'
      ? { isActive: (req.body as Record<string, unknown>).isActive as boolean }
      : {};

    const institution = await prisma.institution.update({
      where: { institutionCode: targetCode },
      data: {
        institutionName:  data.institutionName,
        institutionCode:  data.institutionCode,
        institutionArea:  data.institutionArea,
        institutionCity:  data.institutionCity,
        institutionPincode: data.institutionPincode,
        institutionState: data.institutionState,
        phoneNumber:      data.phoneNumber,
        email:            data.email,
        ...isActivePatch,
      },
      select: {
        id: true,
        institutionName: true,
        institutionCode: true,
        institutionArea: true,
        institutionCity: true,
        institutionPincode: true,
        institutionState: true,
        phoneNumber: true,
        email: true,
        isActive: true,
      },
    });

    res.status(200).json({ message: 'Institution updated successfully.', institution });
  } catch (error) {
    next(error);
  }
};

// ── Soft Delete Institution ───────────────────────────────────────────────────

/**
 * Sets isActive = false instead of permanently deleting.
 * Preserves all relational data (employees, students, invoices, etc.).
 */
export const deleteInstitutionByCode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutionCode = String(req.params.institutionCode || '').trim().toUpperCase();

    if (!institutionCode) {
      res.status(400).json({ error: 'Institution code is required.' });
      return;
    }

    const existing = await prisma.institution.findUnique({
      where: { institutionCode },
      select: { institutionCode: true, isActive: true },
    });

    if (!existing) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    if (!existing.isActive) {
      res.status(409).json({ error: 'Institution is already deactivated.' });
      return;
    }

    await prisma.institution.update({
      where: { institutionCode },
      data: { isActive: false },
    });

    res.status(200).json({ message: 'Institution deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── Get All Active Institutions ───────────────────────────────────────────────

export const getAllInstitutions = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutions = await prisma.institution.findMany({
      select: {
        id: true,
        institutionName: true,
        institutionCode: true,
        institutionArea: true,
        institutionCity: true,
        institutionPincode: true,
        institutionState: true,
        phoneNumber: true,
        email: true,
        isActive: true,
      },
      orderBy: { institutionName: 'asc' },
    });

    res.status(200).json({ institutions });
  } catch (error) {
    next(error);
  }
};

// ── Get Active Institutions (Public – used by lead / enquiry form) ─────────────

export const getActiveInstitutions = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutions = await prisma.institution.findMany({
      where: { isActive: true },
      select: {
        id: true,
        institutionName: true,
        institutionCode: true,
      },
      orderBy: { institutionName: 'asc' },
    });

    res.status(200).json(institutions);
  } catch (error) {
    next(error);
  }
};

// ── GET /api/institutions/current ─────────────────────────────────────────────
// Returns the institution of the logged-in employee, derived from their JWT.
export const getCurrentInstitution = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role } = req.user!;

    // Derive Prisma model accessor from role string
    const pascal = role
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
    const accessor = pascal.charAt(0).toLowerCase() + pascal.slice(1);

    const model = (prisma as unknown as Record<string, unknown>)[accessor];
    if (!model || typeof (model as Record<string, unknown>).findFirst !== 'function') {
      res.status(400).json({ error: 'Cannot resolve institution for this role.' });
      return;
    }

    const delegate = model as {
      findFirst: (args: {
        where: Record<string, unknown>;
        select: Record<string, unknown>;
      }) => Promise<{ institutionId: string } | null>;
    };

    const emp = await delegate.findFirst({
      where: { email: email!.toLowerCase() },
      select: { institutionId: true },
    });

    if (!emp?.institutionId) {
      res.status(404).json({ error: 'Institution not found for this user.' });
      return;
    }

    const institution = await prisma.institution.findUnique({
      where: { id: emp.institutionId },
      select: { id: true, institutionName: true },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution record not found.' });
      return;
    }

    res.status(200).json({ institution });
  } catch (error) {
    next(error);
  }
};