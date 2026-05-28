import type { NextFunction, Request, Response } from 'express';
import { Prisma } from "@prisma/client";
import prisma from '../../config/database';
import type { AuthRequest } from '../../middleware/auth.middleware';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getPayload = (body: Record<string, unknown>) => ({
  id: normalizeString(body.id ?? body.programId),
  programCode: normalizeString(body.programCode),
  programName: normalizeString(body.programName),
  programSname: normalizeString(body.programSname),
  institutionId: normalizeString(body.institutionId),
  levelId: normalizeString(body.levelId),
  schoolId: normalizeString(body.schoolId) || null,
  departmentId: normalizeString(body.departmentId) || null,
  isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
});

const validatePayload = (payload: ReturnType<typeof getPayload>) => {
  if (!payload.programCode) return 'programCode is required.';
  if (!payload.programName) return 'programName is required.';
  if (!payload.programSname) return 'programSname is required.';
  if (!payload.institutionId) return 'institutionId is required.';
  if (!payload.levelId) return 'levelId is required.';
  return null;
};

export const createProgramme = async (
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

    const degreeLevel = await prisma.degreeLevel.findUnique({
      where: { id: payload.levelId },
      select: { id: true },
    });

    if (!degreeLevel) {
      res.status(404).json({ error: 'Degree level not found.' });
      return;
    }

    const school = payload.schoolId
      ? await prisma.school.findUnique({ where: { id: payload.schoolId }, select: { id: true } })
      : null;

    if (payload.schoolId && !school) {
      res.status(404).json({ error: 'School Not Found.' });
      return;
    }

    const department = payload.departmentId
      ? await prisma.department.findUnique({ where: { id: payload.departmentId }, select: { id: true } })
      : null;

    if (payload.departmentId && !department) {
      res.status(404).json({ error: 'Department Not Found.' });
      return;
    }

    const existingProgramme = await prisma.program.findFirst({
  where: {
    institutionId: payload.institutionId,
    programCode: payload.programCode,
  },
  select: {
    id: true,
  },
});

if (existingProgramme) {
  res.status(409).json({
    error: "Program Code already exists in this institute.",
  });
  return;
}

    const programme = await prisma.program.create({
      data: {
        programCode: payload.programCode,
        programName: payload.programName,
        programSname: payload.programSname,
        institutionId: payload.institutionId,
        levelId: payload.levelId,
        schoolId: payload.schoolId,
        departmentId: payload.departmentId,
      },
    });

    res.status(201).json({
      message: 'Programme created successfully.',
      programme,
    });
  } catch (error) {
    if (
      (error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A programme with the same code already exists for this institution.',
      });
      return;
    }
    next(error);
  }
};

export const getProgrammes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { institutionId, levelId } = req.query as Record<string, string | undefined>;

    const programmes = await prisma.program.findMany({
      where: {
        ...(institutionId ? { institutionId } : {}),
        ...(levelId ? { levelId } : {}),
      },
      include: {
        institution: { select: { institutionName: true } },
        level: { select: { levelName: true } },
        school: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: { programName: 'asc' },
    });

    res.status(200).json({ programmes });
  } catch (error) {
    next(error);
  }
};

export const updateProgramme = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getPayload(req.body as Record<string, unknown>);

    if (!payload.id) {
      res.status(400).json({ error: 'Programme id is required.' });
      return;
    }

    const validationError = validatePayload(payload);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existing = await prisma.program.findUnique({ where: { id: payload.id } });
    if (!existing) {
      res.status(404).json({ error: 'Programme not found.' });
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

    const degreeLevel = await prisma.degreeLevel.findUnique({
      where: { id: payload.levelId },
      select: { id: true },
    });
    if (!degreeLevel) {
      res.status(404).json({ error: 'Degree level not found.' });
      return;
    }

    const duplicateProgramme = await prisma.program.findFirst({
  where: {
    institutionId: payload.institutionId,
    programCode: payload.programCode,
    NOT: {
      id: payload.id,
    },
  },
  select: {
    id: true,
  },
});

if (duplicateProgramme) {
  res.status(409).json({
    error: "Program Code already exists in this institute.",
  });
  return;
}

    const school = payload.schoolId
      ? await prisma.school.findUnique({ where: { id: payload.schoolId }, select: { id: true } })
      : null;
    if (payload.schoolId && !school) {
      res.status(404).json({ error: 'School not found.' });
      return;
    }

    const department = payload.departmentId
      ? await prisma.department.findUnique({ where: { id: payload.departmentId }, select: { id: true } })
      : null;
    if (payload.departmentId && !department) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }

    const programme = await prisma.program.update({
      where: { id: payload.id },
      data: {
        programCode: payload.programCode,
        programName: payload.programName,
        programSname: payload.programSname,
        institutionId: payload.institutionId,
        levelId: payload.levelId,
        schoolId: payload.schoolId,
        departmentId: payload.departmentId,
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
    });

    res.status(200).json({ message: 'Programme updated successfully.', programme });
  } catch (error) {
    if (
      (error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A programme with the same code already exists for this institution.',
      });
      return;
    }
    next(error);
  }
};

export const deleteProgramme = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = normalizeString((req.body as Record<string, unknown>).id ?? (req.body as Record<string, unknown>).programId);

    if (!id) {
      res.status(400).json({ error: 'Programme id is required.' });
      return;
    }

    const existing = await prisma.program.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Programme not found.' });
      return;
    }

    await prisma.program.delete({ where: { id } });

    res.status(200).json({ message: 'Programme deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/programme/:institutionId/:degreeLevelId ─────────────────────────
// Public – used by lead form to fetch active programmes by level ID
// ─────────────────────────────────────────────────────────────────────────────
export const getProgrammesByLevelId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutionId = normalizeString(req.params.institutionId);
    const degreeLevelId = normalizeString(req.params.degreeLevelId);

    if (!institutionId) {
      res.status(400).json({ error: 'institutionId is required.' });
      return;
    }
    if (!degreeLevelId) {
      res.status(400).json({ error: 'degreeLevelId is required.' });
      return;
    }

    const programmes = await prisma.program.findMany({
      where: {
        institutionId,
        levelId: degreeLevelId,
        isActive: true,
      },
      select: {
        id: true,
        programName: true,
        programSname: true,
      },
      orderBy: { programName: 'asc' },
    });

    res.status(200).json(programmes);
  } catch (error) {
    next(error);
  }
};

// ── GET /api/programmes/active/by-institution/:institutionId ──────────────────
// Returns all active programmes for an institution with level info.
// Used by batch management form to populate grouped checkbox lists.
// ─────────────────────────────────────────────────────────────────────────────
export const getActiveProgrammesByInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutionId = normalizeString(req.params.institutionId);

    if (!institutionId) {
      res.status(400).json({ error: 'institutionId is required.' });
      return;
    }

    const programmes = await prisma.program.findMany({
      where: { institutionId, isActive: true },
      select: {
        id: true,
        programName: true,
        programSname: true,
        level: { select: { id: true, levelName: true } },
      },
      orderBy: [{ level: { levelName: 'asc' } }, { programName: 'asc' }],
    });

    res.status(200).json(programmes);
  } catch (error) {
    next(error);
  }
};

// ── GET /api/programmes/active/by-level/:levelId ──────────────────────────────
// Returns all active programmes for a given degree level.
// ─────────────────────────────────────────────────────────────────────────────
export const getActiveProgrammesByLevel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const levelId = normalizeString(req.params.levelId);

    if (!levelId) {
      res.status(400).json({ error: 'levelId is required.' });
      return;
    }

    const programmes = await prisma.program.findMany({
      where: { levelId, isActive: true },
      select: {
        id: true,
        programName: true,
        programSname: true,
        level: { select: { id: true, levelName: true } },
      },
      orderBy: { programName: 'asc' },
    });

    res.status(200).json(programmes);
  } catch (error) {
    next(error);
  }
};

