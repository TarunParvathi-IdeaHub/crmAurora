import type { NextFunction, Request, Response } from 'express';
import { Prisma } from "@prisma/client";
import prisma from '../../config/database';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getPayload = (body: Record<string, unknown>) => ({
  departmentCode: normalizeString(body.departmentCode),
  name: normalizeString(body.name ?? body.departmentName),
  phoneNumber: normalizeString(body.phone),
  email: normalizeString(body.email),
  institutionId: normalizeString(body.institutionId),
  schoolId: normalizeString(body.schoolId) || null,
  isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
});

const validatePayload = (payload: ReturnType<typeof getPayload>) => {
  if (!payload.departmentCode) return 'departmentCode is required.';
  if (!payload.name) return 'name is required.';
  if (!payload.institutionId) return 'institutionId is required.';
  if (!payload.phoneNumber) return 'phoneNumber is required.';
  if (!payload.email) return 'email is required.';
  return null;
};

export const createDepartment = async (
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

    const institutionId = payload.institutionId;

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    if (payload.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: payload.schoolId },
        select: { id: true, institutionId: true },
      });
      if (!school) {
        res.status(404).json({ error: 'School not found.' });
        return;
      }
      if (school.institutionId !== institutionId) {
        res.status(400).json({ error: 'School does not belong to the specified institution.' });
        return;
      }
    }

    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { institutionId, departmentCode: payload.departmentCode },
          { phoneNumber: payload.phoneNumber },
          { email: payload.email },
        ],
      },
      select: { institutionId: true, departmentCode: true, phoneNumber: true, email: true },
    });

    if (existing) {
      if (existing.institutionId === institutionId && existing.departmentCode === payload.departmentCode) {
        res.status(409).json({ error: 'A department with the same code already exists for this institution.' });
        return;
      }
      if (existing.phoneNumber === payload.phoneNumber) {
        res.status(409).json({ error: 'A department with the same phone number already exists.' });
        return;
      }
      if (existing.email === payload.email) {
        res.status(409).json({ error: 'A department with the same email already exists.' });
        return;
      }
    }

    const department = await prisma.department.create({
      data: {
        departmentCode: payload.departmentCode,
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        institutionId,
        schoolId: payload.schoolId,
      },
    });

    res.status(201).json({ message: 'Department created successfully.', department });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({ error: 'A department with the same code already exists for this institution.' });
      return;
    }

    next(error);
  }
};

export const getDepartments = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        departmentCode: true,
        name: true,
        phoneNumber: true,
        email: true,
        institutionId: true,
        schoolId: true,
        isActive: true,
        institution: {
          select: { institutionName: true, institutionCode: true },
        },
        school: { select: { name: true, schoolCode: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      departments: departments.map((d) => ({
        id: d.id,
        departmentCode: d.departmentCode,
        name: d.name,
        departmentName: d.name,
        phone: d.phoneNumber,
        email: d.email,
        institutionId: d.institutionId,
        schoolId: d.schoolId,
        isActive: d.isActive,
        institution: d.institution,
        school: d.school,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const getBodyDepartmentId = (body: Record<string, unknown>) =>
  normalizeString(body.id ?? body.departmentId);

export const updateDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getBodyDepartmentId(req.body as Record<string, unknown>);
    if (!id) {
      res.status(400).json({ error: 'Department ID is required in the request body.' });
      return;
    }

    const payload = getPayload(req.body as Record<string, unknown>);
    const validationError = validatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    const institutionId = payload.institutionId;

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    if (payload.schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: payload.schoolId },
        select: { id: true, institutionId: true },
      });
      if (!school) {
        res.status(404).json({ error: 'School not found.' });
        return;
      }
      if (school.institutionId !== institutionId) {
        res.status(400).json({ error: 'School does not belong to the specified institution.' });
        return;
      }
    }

    const conflicting = await prisma.department.findFirst({
      where: {
        NOT: { id },
        OR: [
          { institutionId, departmentCode: payload.departmentCode },
          { phoneNumber: payload.phoneNumber },
          { email: payload.email },
        ],
      },
      select: { institutionId: true, departmentCode: true, phoneNumber: true, email: true },
    });

    if (conflicting) {
      if (conflicting.institutionId === institutionId && conflicting.departmentCode === payload.departmentCode) {
        res.status(409).json({ error: 'A department with the same code already exists for this institution.' });
        return;
      }
      if (conflicting.phoneNumber === payload.phoneNumber) {
        res.status(409).json({ error: 'A department with the same phone number already exists.' });
        return;
      }
      if (conflicting.email === payload.email) {
        res.status(409).json({ error: 'A department with the same email already exists.' });
        return;
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        departmentCode: payload.departmentCode,
        name: payload.name,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        institutionId,
        schoolId: payload.schoolId,
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
    });

    res.status(200).json({ message: 'Department updated successfully.', department });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({ error: 'A department with the same code already exists for this institution.' });
      return;
    }
    next(error);
  }
};

export const deleteDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getBodyDepartmentId(req.body as Record<string, unknown>);
    if (!id) {
      res.status(400).json({ error: 'Department ID is required in the request body.' });
      return;
    }

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    await prisma.department.delete({ where: { id } });

    res.status(200).json({ message: 'Department deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentsBySchool = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { schoolId } = req.params as { schoolId: string };
    if (!schoolId) {
      res.status(400).json({ error: 'schoolId is required.' });
      return;
    }

    const departments = await prisma.department.findMany({
      where: { schoolId, isActive: true },
      select: {
        id: true,
        departmentCode: true,
        name: true,
        institutionId: true,
        schoolId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      departments: departments.map((d) => ({
        id: d.id,
        departmentCode: d.departmentCode,
        name: d.name,
        institutionId: d.institutionId,
        schoolId: d.schoolId,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentsByInstitution = async (
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

    const departments = await prisma.department.findMany({
      where: { institutionId, isActive: true },
      select: {
        id: true,
        departmentCode: true,
        name: true,
        institutionId: true,
        schoolId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      departments: departments.map((d) => ({
        id: d.id,
        departmentCode: d.departmentCode,
        name: d.name,
        institutionId: d.institutionId,
        schoolId: d.schoolId,
      })),
    });
  } catch (error) {
    next(error);
  }
};
