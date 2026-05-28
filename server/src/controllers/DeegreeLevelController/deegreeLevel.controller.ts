import type { NextFunction, Request, Response } from 'express';
import { Prisma } from "@prisma/client";
import prisma from '../../config/database';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getPayload = (body: Record<string, unknown>) => ({
  id: normalizeString(body.id ?? body.levelId),
  levelName: normalizeString(body.levelName),
  institutionId: normalizeString(body.institutionId),
  isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
});

const validatePayload = (payload: ReturnType<typeof getPayload>) => {
  if (!payload.levelName) return 'levelName is required.';
  if (!payload.institutionId) return 'institutionId is required.';
  return null;
};

export const createDeegreeLevel = async (
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

    const institution = await prisma.institution.findUnique({
      where: { id: payload.institutionId },
      select: { id: true },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    const degreeLevel = await prisma.degreeLevel.create({
      data: {
        levelName: payload.levelName,
        institutionId: payload.institutionId,
      },
      select: {
        id: true,
        levelName: true,
        institutionId: true,
        institution: {
          select: { institutionName: true, institutionCode: true },
        },
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'Degree level created successfully.',
      degreeLevel,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: 'A degree level with the same name already exists for this institution.',
      });
      return;
    }

    next(error);
  }
};

export const getDeegreeLevels = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryInstitutionId = typeof req.query.institutionId === 'string' ? req.query.institutionId : '';
    const id = typeof req.query.id === 'string' ? req.query.id : '';

    const whereClause: Record<string, unknown> = {};
    if (id) whereClause.id = id;
    if (queryInstitutionId) whereClause.institutionId = queryInstitutionId;

    const degreeLevels = await prisma.degreeLevel.findMany({
      where: whereClause,
      select: {
        id: true,
        levelName: true,
        institutionId: true,
        isActive: true,
        institution: {
          select: 
            { institutionName: true, institutionCode: true, phoneNumber: true, email: true },
        },
      },
      orderBy: { levelName: 'asc' },
    });

    res.status(200).json({ degreeLevels });
  } catch (error) {
    next(error);
  }
};

export const getDeegreeLevelsByInstitution = async (
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

    const degreeLevels = await prisma.degreeLevel.findMany({
      where: { institutionId, isActive: true },
      select: {
        id: true,
        levelName: true,
        institutionId: true,
      },
      orderBy: { levelName: 'asc' },
    });

    res.status(200).json({ degreeLevels });
  } catch (error) {
    next(error);
  }
};

export const updateDeegreeLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = (req.params as Record<string, string>).id;
    const payload = getPayload(req.body as Record<string, unknown>);

    if (!id) {
      res.status(400).json({ error: 'Degree level id is required in the URL.' });
      return;
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existingLevel = await prisma.degreeLevel.findUnique({
      where: { id },
    });

    if (!existingLevel) {
      res.status(404).json({ error: 'Degree level not found.' });
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

    const degreeLevel = await prisma.degreeLevel.update({
      where: { id },
      data: {
        levelName: payload.levelName,
        institutionId: payload.institutionId,
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      select: {
        id: true,
        levelName: true,
        institutionId: true,
        isActive: true,
        institution: {
          select: { institutionName: true, institutionCode: true },
        },
        createdAt: true,
      },
    });

    res.status(200).json({
      message: 'Degree level updated successfully.',
      degreeLevel,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        error: 'A degree level with the same name already exists for this institution.',
      });
      return;
    }

    next(error);
  }
};

export const deleteDeegreeLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = (req.params as Record<string, string>).id;

    if (!id) {
      res.status(400).json({ error: 'Degree level id is required in the URL.' });
      return;
    }

    const degreeLevel = await prisma.degreeLevel.findUnique({
      where: { id },
    });

    if (!degreeLevel) {
      res.status(404).json({ error: 'Degree level not found.' });
      return;
    }

    await prisma.degreeLevel.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Degree level deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
