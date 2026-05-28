import type { NextFunction, Request, Response } from 'express';
import { Prisma } from "@prisma/client";
import prisma from '../../config/database';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseRoleCount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getEmployeeRolePayload = (body: Record<string, unknown>) => {
  const roleId = isNonEmptyString(body.roleId) ? body.roleId.trim() : null;
  const role = isNonEmptyString(body.role) ? body.role.trim() : null;
  const staffType = isNonEmptyString(body.staffType)
    ? body.staffType.trim()
    : null;
  const rolePrefix = isNonEmptyString(body.rolePrefix)
    ? body.rolePrefix.trim()
    : null;
  const institutionId = isNonEmptyString(body.institutionId)
    ? body.institutionId.trim()
    : null;
  const roleCount = parseRoleCount(body.roleCount);

  return {
    roleId,
    role,
    staffType,
    rolePrefix,
    roleCount,
    institutionId,
  };
};

const validatePayload = (payload: ReturnType<typeof getEmployeeRolePayload>) => {
  if (!payload.roleId) return 'Role ID is required.';
  if (!payload.role) return 'Role is required.';
  if (!payload.staffType) return 'Staff type is required.';
  if (!payload.rolePrefix) return 'Role prefix is required.';
  if (payload.roleCount === null || payload.roleCount < 0)
    return 'Role count must be a non-negative number.';
  if (!payload.institutionId) return 'Institution ID is required.';

  return null;
};

export const getEmployeeRoles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutionId = isNonEmptyString(req.query.institutionId)
      ? req.query.institutionId.trim()
      : null;

    const employeeRoles = await prisma.employeeRole.findMany({
      where: institutionId ? { institutionId } : undefined,
      orderBy: {
        role: 'asc',
      },
    });

    res.status(200).json({ employeeRoles });
  } catch (error) {
    next(error);
  }
};

export const createEmployeeRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getEmployeeRolePayload(req.body as Record<string, unknown>);
    const validationError = validatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const institutionExists = await prisma.institution.findUnique({
      where: { id: payload.institutionId! },
      select: { id: true },
    });

    if (!institutionExists) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    const existingRole = await prisma.employeeRole.findFirst({
      where: {
        OR: [{ roleId: payload.roleId! }, { rolePrefix: payload.rolePrefix! }],
      },
    });

    if (existingRole) {
      res.status(409).json({
        error: 'Role ID or role prefix already exists.',
      });
      return;
    }

    const employeeRole = await prisma.employeeRole.create({
      data: {
        roleId: payload.roleId!,
        role: payload.role!,
        staffType: payload.staffType!,
        rolePrefix: payload.rolePrefix!,
        roleCount: payload.roleCount!,
        institutionId: payload.institutionId!,
      },
    });

    res.status(201).json({
      message: 'Employee role created successfully.',
      employeeRole,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: 'Role ID or role prefix already exists.',
      });
      return;
    }

    next(error);
  }
};

export const updateEmployeeRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getEmployeeRolePayload(req.body as Record<string, unknown>);
    const validationError = validatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const employeeRoleId = isNonEmptyString(req.params.id)
      ? req.params.id
      : null;

    if (!employeeRoleId) {
      res.status(400).json({ error: 'Employee role ID is required.' });
      return;
    }

    const existingRole = await prisma.employeeRole.findUnique({
      where: { id: employeeRoleId },
    });

    if (!existingRole) {
      res.status(404).json({ error: 'Employee role not found.' });
      return;
    }

    const conflictingRole = await prisma.employeeRole.findFirst({
      where: {
        id: { not: employeeRoleId },
        OR: [{ roleId: payload.roleId! }, { rolePrefix: payload.rolePrefix! }],
      },
    });

    if (conflictingRole) {
      res.status(409).json({
        error: 'Role ID or role prefix already exists.',
      });
      return;
    }

    const updatedEmployeeRole = await prisma.employeeRole.update({
      where: { id: employeeRoleId },
      data: {
        roleId: payload.roleId!,
        role: payload.role!,
        staffType: payload.staffType!,
        rolePrefix: payload.rolePrefix!,
        roleCount: payload.roleCount!,
        institutionId: payload.institutionId!,
      },
    });

    res.status(200).json({
      message: 'Employee role updated successfully.',
      employeeRole: updatedEmployeeRole,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: 'Role ID or role prefix already exists.',
      });
      return;
    }

    next(error);
  }
};

export const deleteEmployeeRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employeeRoleId = isNonEmptyString(req.params.id)
      ? req.params.id
      : null;

    if (!employeeRoleId) {
      res.status(400).json({ error: 'Employee role ID is required.' });
      return;
    }

    const existingRole = await prisma.employeeRole.findUnique({
      where: { id: employeeRoleId },
    });

    if (!existingRole) {
      res.status(404).json({ error: 'Employee role not found.' });
      return;
    }

    await prisma.employeeRole.delete({
      where: { id: employeeRoleId },
    });

    res.status(200).json({ message: 'Employee role deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
