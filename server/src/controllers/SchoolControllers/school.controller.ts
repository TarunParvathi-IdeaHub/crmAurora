import type { NextFunction, Request, Response } from 'express';
import { Prisma } from "@prisma/client";
import prisma from '../../config/database';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getPayload = (body: Record<string, unknown>) => {
  return {
    schoolCode: normalizeString(body.schoolCode),
    name: normalizeString(body.name),
    phone: normalizeString(body.phone),
    email: normalizeString(body.email),
    institutionId: normalizeString(body.institutionId),
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  };
};

const validatePayload = (payload: ReturnType<typeof getPayload>) => {
  if (!payload.schoolCode) return 'schoolCode is required.';
  if (!payload.name) return 'name is required.';
  if (!payload.phone) return 'phone is required.';
  if (!payload.email) return 'email is required.';
  if (!payload.institutionId) return 'institutionId is required.';
  return null;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

export const createSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getPayload(req.body as Record<string, unknown>);
    const validationError = validatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    if (!EMAIL_REGEX.test(payload.email)) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    if (!PHONE_REGEX.test(payload.phone)) {
      res.status(400).json({ error: 'Invalid phone number. Must be exactly 10 digits.' });
      return;
    }


    const institution = await prisma.institution.findUnique({
      where: { id: payload.institutionId },
      select: { id: true },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    const existingSchool = await prisma.school.findFirst({
      where: {
        OR: [
          { schoolCode: payload.schoolCode, institutionId: payload.institutionId },
          { phoneNumber: payload.phone },
          { email: payload.email },
        ]
      },
      select: { institutionId: true, schoolCode: true, phoneNumber: true, email: true },
    });

    if (existingSchool) {
      if (existingSchool.schoolCode === payload.schoolCode) {
        res.status(409).json({
          error: 'A school with the same code already exists for this institution.',
        });
      } else if (existingSchool.phoneNumber === payload.phone) {
        res.status(409).json({
          error: 'A school with the same phone number already exists.',
        });
      } else if (existingSchool.email === payload.email) {
        res.status(409).json({
          error: 'A school with the same email already exists.',
        });
      }
      return;
    }

    const school = await prisma.school.create({
      data: {
        schoolCode: payload.schoolCode,
        name: payload.name,
        phoneNumber: payload.phone,
        email: payload.email,
        institutionId: payload.institutionId,
      },
    });

    res.status(201).json({
      message: 'School created successfully.',
      school,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A school with the same code already exists for this institution.',
      });
      return;
    }

    next(error);
  }
};

export const getSchools = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        schoolCode: true,
        name: true,
        phoneNumber: true,
        email: true,
        institutionId: true,
        isActive: true,
        institution: {
          select: {
            institutionName: true,
            institutionCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      schools: schools.map((school) => ({
        id: school.id,
        schoolCode: school.schoolCode,
        name: school.name,
        phone: school.phoneNumber,
        email: school.email,
        institutionId: school.institutionId,
        isActive: school.isActive,
        institutionName: school.institution.institutionName,
        institutionCode: school.institution.institutionCode,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const getBodySchoolId = (body: Record<string, unknown>) =>
  normalizeString(body.id ?? body.schoolId);

export const updateSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = getBodySchoolId(req.body as Record<string, unknown>);
    if (!schoolId) {
      res.status(400).json({ error: 'School ID is required in the request body.' });
      return;
    }

    const payload = getPayload(req.body as Record<string, unknown>);
    const validationError = validatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existingSchool = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!existingSchool) {
      res.status(404).json({ error: 'School not found.' });
      return;
    }

    const conflictingSchool = await prisma.school.findFirst({
      where: {
        NOT: { id: schoolId,
          institutionId: payload.institutionId
         },
        OR: [
          { institutionId: payload.institutionId},
          { schoolCode: payload.schoolCode},
          { phoneNumber: payload.phone},
          { email: payload.email},
        ]
      },
      select: { institutionId: true, schoolCode: true, phoneNumber: true, email: true },
    });

    if (conflictingSchool) {
      if (conflictingSchool.institutionId === payload.institutionId && conflictingSchool.schoolCode === payload.schoolCode) {
        res.status(409).json({
          error: 'A school with the same code already exists for this institution.',
        });
      }
      else if (conflictingSchool.phoneNumber === payload.phone) {
        res.status(409).json({
          error: 'A school with the same phone number already exists.',
        });
      }
      else if (conflictingSchool.email === payload.email) {
        res.status(409).json({
          error: 'A school with the same email already exists.',
        });
      }
    }

    const school = await prisma.school.update({
      where: { id: schoolId },
      data: {
        schoolCode: payload.schoolCode,
        name: payload.name,
        phoneNumber: payload.phone,
        email: payload.email,
        institutionId: payload.institutionId,
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
    });

    res.status(200).json({
      message: 'School updated successfully.',
      school,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A school with the same code already exists for this institution.',
      });
      return;
    }

    next(error);
  }
};

export const getSchoolsByInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { institutionId } = req.params as { institutionId: string };
    if (!institutionId) {
      res.status(400).json({ error: 'institutionId is required.' });
      return;
    }

    const schools = await prisma.school.findMany({
      where: { institutionId, isActive: true },
      select: {
        id: true,
        schoolCode: true,
        name: true,
        institutionId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      schools: schools.map((s) => ({
        id: s.id,
        schoolCode: s.schoolCode,
        name: s.name,
        institutionId: s.institutionId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schoolId = getBodySchoolId(req.body as Record<string, unknown>);
    if (!schoolId) {
      res.status(400).json({ error: 'School ID is required in the request body.' });
      return;
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      res.status(404).json({ error: 'School not found.' });
      return;
    }

    await prisma.school.delete({
      where: { id: schoolId },
    });

    res.status(200).json({
      message: 'School deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
