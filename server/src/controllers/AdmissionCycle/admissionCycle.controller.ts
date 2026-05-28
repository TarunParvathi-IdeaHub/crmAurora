import type { NextFunction, Request, Response } from 'express';
import { Prisma } from "@prisma/client";
import prisma from '../../config/database';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// ── Shared helpers used by update / delete / read ─────────────────────────────

const getAdmissionCyclePayload = (body: Record<string, unknown>) => ({
  id: normalizeString(body.id),
  admissionCycleName: normalizeString(body.admissionCycleName),
  institutionId: normalizeString(body.institutionId),
  levelId: normalizeString(body.levelId),
  programId: normalizeString(body.programId),
});

const validateUpdatePayload = (
  payload: ReturnType<typeof getAdmissionCyclePayload>
) => {
  if (!payload.id) return 'Admission cycle ID is required.';
  if (!payload.admissionCycleName)
    return 'Admission cycle name is required.';
  if (!payload.institutionId) return 'Institution ID is required.';
  if (!payload.levelId) return 'Degree level ID is required.';
  if (!payload.programId) return 'Program ID is required.';
  return null;
};

const getAdmissionCycleWhere = (body: Record<string, unknown>) => {
  const payload = getAdmissionCyclePayload(body);

  return {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.admissionCycleName
      ? { admissionCycleName: payload.admissionCycleName }
      : {}),
    ...(payload.institutionId ? { institutionId: payload.institutionId } : {}),
    ...(payload.levelId ? { levelId: payload.levelId } : {}),
    ...(payload.programId ? { programId: payload.programId } : {}),
  };
};

const checkReferencesExist = async (
  payload: ReturnType<typeof getAdmissionCyclePayload>
) => {
  const [institution, degreeLevel, program] = await Promise.all([
    prisma.institution.findUnique({
      where: { id: payload.institutionId },
      select: { id: true },
    }),
    prisma.degreeLevel.findUnique({
      where: { id: payload.levelId },
      select: { id: true },
    }),
    prisma.program.findUnique({
      where: { id: payload.programId },
      select: { id: true, levelId: true },
    }),
  ]);

  if (!institution) return 'Institution not found.';
  if (!degreeLevel) return 'Degree level not found.';
  if (!program) return 'Program not found.';
  if (program.levelId !== payload.levelId)
    return 'Program does not belong to the specified degree level.';
  return null;
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface CycleInput {
  degreeLevelId: string;
  programIds: string[];
}

// ── POST /api/admission-cycles/create ─────────────────────────────────────────
// Accepts either:
//   Simple shape:  { institutionId, batchId, admissionCyclePrefix, programIds[] }
//   Complex shape: { institutionId, batchIds[], admissionCyclePrefix, cycles[{degreeLevelId, programIds[]}] }
// Creates one AdmissionCycle per programme and links to the specified batch(es).
// ─────────────────────────────────────────────────────────────────────────────
export const createAdmissionCycle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const institutionId = normalizeString(body.institutionId);
    const admissionCyclePrefix = normalizeString(body.admissionCyclePrefix);
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

    // Support both single batchId and batchIds array
    const batchIds: string[] = Array.isArray(body.batchIds)
      ? (body.batchIds as unknown[]).map(String).filter(Boolean)
      : body.batchId
      ? [normalizeString(body.batchId)].filter(Boolean)
      : [];

    // Support simple programIds[] (levelId resolved from DB) or complex cycles[]
    const simplePrograms: string[] = Array.isArray(body.programIds)
      ? (body.programIds as unknown[]).map(String).filter(Boolean)
      : [];
    const rawCycles = Array.isArray(body.cycles) ? (body.cycles as unknown[]) : [];

    // ── Basic field validation ───────────────────────────────────────────────
    if (!institutionId) {
      res.status(400).json({ error: 'institutionId is required.' });
      return;
    }
    if (!admissionCyclePrefix) {
      res.status(400).json({ error: 'admissionCyclePrefix is required.' });
      return;
    }
    if (simplePrograms.length === 0 && rawCycles.length === 0) {
      res.status(400).json({ error: 'programIds (or cycles) must be a non-empty array.' });
      return;
    }

    // ── Resolve all programIds to fetch their levelId from DB ─────────────────
    // Works for both simple and complex shapes.
    let allProgramIds: string[];

    if (simplePrograms.length > 0) {
      allProgramIds = [...new Set(simplePrograms)];
    } else {
      // ── Complex shape: validate cycles structure ──────────────────────────
      const parsedCycles: CycleInput[] = [];
      for (let i = 0; i < rawCycles.length; i++) {
        const entry = rawCycles[i] as Record<string, unknown>;
        const degreeLevelId = normalizeString(entry.degreeLevelId);
        const programIds: string[] = Array.isArray(entry.programIds) ? entry.programIds : [];

        if (!degreeLevelId) {
          res.status(400).json({ error: `cycles[${i}].degreeLevelId is required.` });
          return;
        }
        if (programIds.length === 0) {
          res.status(400).json({ error: `cycles[${i}].programIds must be a non-empty array.` });
          return;
        }
        parsedCycles.push({ degreeLevelId, programIds });
      }
      allProgramIds = [...new Set(parsedCycles.flatMap((c) => c.programIds))];
    }

    // ── Batch fetch institution + programs ────────────────────────────────────
    const [institution, programs] = await Promise.all([
      prisma.institution.findUnique({ where: { id: institutionId }, select: { id: true } }),
      prisma.program.findMany({
        where: { id: { in: allProgramIds } },
        select: {
          id: true,
          programName: true,
          programSname: true,
          institutionId: true,
          levelId: true,
          isActive: true,
        },
      }),
    ]);

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    const programMap = new Map(programs.map((p) => [p.id, p]));

    const missingPrograms = allProgramIds.filter((id) => !programMap.has(id));
    if (missingPrograms.length > 0) {
      res.status(404).json({ error: 'One or more programs were not found.', missingProgramIds: missingPrograms });
      return;
    }

    const wrongInstitution = allProgramIds.filter((id) => programMap.get(id)!.institutionId !== institutionId);
    if (wrongInstitution.length > 0) {
      res.status(400).json({ error: 'Some programs do not belong to the specified institution.', invalidProgramIds: wrongInstitution });
      return;
    }

    const inactivePrograms = allProgramIds.filter((id) => !programMap.get(id)!.isActive);
    if (inactivePrograms.length > 0) {
      res.status(400).json({ error: 'One or more programs are inactive.', inactiveProgramIds: inactivePrograms });
      return;
    }

    // ── Validate batchIds if provided ─────────────────────────────────────────
    if (batchIds.length > 0) {
      const foundBatches = await prisma.batch.findMany({
        where: { id: { in: batchIds }, institutionId },
        select: { id: true },
      });
      if (foundBatches.length !== batchIds.length) {
        res.status(404).json({ error: 'One or more batch IDs were not found for this institution.' });
        return;
      }
    }

    // ── Build admission cycle records (one per program) ────────────────────────
    const cycleRecordsToCreate = allProgramIds.map((programId) => {
      const prog = programMap.get(programId)!;
      return {
        admissionCycleName: `${admissionCyclePrefix}-${prog.programSname}`,
        institutionId,
        levelId: prog.levelId,
        programId,
        isActive,
      };
    });

    const newCycleNames = cycleRecordsToCreate.map((c) => c.admissionCycleName);

    const uniqueNewNames = new Set(newCycleNames);
    if (uniqueNewNames.size !== newCycleNames.length) {
      res.status(409).json({
        error: 'Duplicate admission cycle names would be generated. Ensure programme short names (programSname) are unique.',
      });
      return;
    }

    // Duplicate names against existing DB records
    const existingCycles = await prisma.admissionCycle.findMany({
      where: {
        institutionId,
        admissionCycleName: { in: newCycleNames },
      },
      select: { admissionCycleName: true },
    });
    if (existingCycles.length > 0) {
      res.status(409).json({
        error: 'One or more admission cycle names already exist for this institution.',
        duplicateCycleNames: existingCycles.map((c) => c.admissionCycleName),
      });
      return;
    }

    // ── Transactional bulk create + fetch ─────────────────────────────────────
    const createdCycles = await prisma.$transaction(async (tx) => {
      await tx.admissionCycle.createMany({ data: cycleRecordsToCreate });

      const created = await tx.admissionCycle.findMany({
        where: {
          institutionId,
          admissionCycleName: { in: newCycleNames },
        },
        select: {
          id: true,
          admissionCycleName: true,
          institutionId: true,
          levelId: true,
          programId: true,
          isActive: true,
          degreeLevel: { select: { id: true, levelName: true } },
          program: { select: { id: true, programCode: true, programName: true, programSname: true } },
        },
        orderBy: { admissionCycleName: 'asc' },
      });

      // ── Link batches if provided ─────────────────────────────────────────
      if (batchIds.length > 0) {
        await tx.batchAdmissionCycle.createMany({
          data: created.flatMap((cycle) =>
            batchIds.map((batchId) => ({
              institutionId,
              batchId,
              admissionCycleId: cycle.id,
            }))
          ),
          skipDuplicates: true,
        });
      }

      return created;
    });

    // ── Group response by degree level ────────────────────────────────────────
    const groupedByLevel: Record<string, typeof createdCycles> = {};
    for (const cycle of createdCycles) {
      const levelName = cycle.degreeLevel.levelName;
      if (!groupedByLevel[levelName]) groupedByLevel[levelName] = [];
      groupedByLevel[levelName].push(cycle);
    }

    res.status(201).json({
      message: `${createdCycles.length} admission cycle(s) created successfully.`,
      totalCreated: createdCycles.length,
      admissionCycles: createdCycles,
      groupedByLevel,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'An admission cycle with the same name already exists for this program.',
      });
      return;
    }
    next(error);
  }
};

export const getAdmissionCycles = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const where = getAdmissionCycleWhere(req.body as Record<string, unknown>);

    const admissionCycles = await prisma.admissionCycle.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { admissionCycleName: 'asc' },
    });

    res.status(200).json({ admissionCycles });
  } catch (error) {
    next(error);
  }
};

export const updateAdmissionCycle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getAdmissionCyclePayload(req.body as Record<string, unknown>);
    const validationError = validateUpdatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existingCycle = await prisma.admissionCycle.findUnique({
      where: { id: payload.id },
    });

    if (!existingCycle) {
      res.status(404).json({ error: 'Admission cycle not found.' });
      return;
    }

    const referenceError = await checkReferencesExist(payload);
    if (referenceError) {
      res.status(404).json({ error: referenceError });
      return;
    }

    const admissionCycle = await prisma.admissionCycle.update({
      where: { id: payload.id },
      data: {
        admissionCycleName: payload.admissionCycleName,
        institutionId: payload.institutionId,
        levelId: payload.levelId,
        programId: payload.programId,
      },
    });

    res.status(200).json({
      message: 'Admission cycle updated successfully.',
      admissionCycle,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'An admission cycle with the same name already exists for this program.',
      });
      return;
    }

    next(error);
  }
};

export const deleteAdmissionCycle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getAdmissionCyclePayload(req.body as Record<string, unknown>);

    if (!payload.id) {
      res.status(400).json({ error: 'Admission cycle ID is required.' });
      return;
    }

    const existingCycle = await prisma.admissionCycle.findUnique({
      where: { id: payload.id },
    });

    if (!existingCycle) {
      res.status(404).json({ error: 'Admission cycle not found.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.batchAdmissionCycle.deleteMany({ where: { admissionCycleId: payload.id } });
      await tx.admissionCycle.delete({ where: { id: payload.id } });
    });

    res.status(200).json({ message: 'Admission cycle deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admission-cycles/latest-active
// Query params: institutionId, levelId, programId
// Returns the latest active admission cycle for the given combination.
// ─────────────────────────────────────────────────────────────────────────────
export const getLatestActiveAdmissionCycle = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutionId = normalizeString(req.query.institutionId);
    const levelId = normalizeString(req.query.levelId);
    const programId = normalizeString(req.query.programId);

    if (!institutionId) {
      res.status(400).json({ error: 'institutionId query parameter is required.' });
      return;
    }
    if (!levelId) {
      res.status(400).json({ error: 'levelId query parameter is required.' });
      return;
    }
    if (!programId) {
      res.status(400).json({ error: 'programId query parameter is required.' });
      return;
    }

    const cycle = await prisma.admissionCycle.findFirst({
      where: {
        institutionId,
        levelId,
        programId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        admissionCycleName: true,
        institutionId: true,
        levelId: true,
        programId: true,
        isActive: true,
        institution: { select: { id: true, institutionName: true, institutionCode: true } },
        degreeLevel: { select: { id: true, levelName: true } },
        program: {
          select: {
            id: true,
            programCode: true,
            programName: true,
            programSname: true,
          },
        },
      },
    });

    if (!cycle) {
      res.status(404).json({ error: 'No active admission cycle found for the selected programme.' });
      return;
    }

    res.status(200).json(cycle);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admission-cycles/:id
// Returns a single admission cycle with full includes.
// ─────────────────────────────────────────────────────────────────────────────
export const getAdmissionCycleById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';

    if (!id) {
      res.status(400).json({ error: 'Admission cycle ID is required.' });
      return;
    }

    const cycle = await prisma.admissionCycle.findUnique({
      where: { id },
      select: {
        id: true,
        admissionCycleName: true,
        institutionId: true,
        levelId: true,
        programId: true,
        isActive: true,
        institution: { select: { id: true, institutionName: true } },
        degreeLevel: { select: { id: true, levelName: true } },
        program: {
          select: {
            id: true,
            programCode: true,
            programName: true,
            programSname: true,
            school: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        batchAdmissionCycles: {
          select: {
            batch: { select: { id: true, batchName: true } },
          },
        },
      },
    });

    if (!cycle) {
      res.status(404).json({ error: 'Admission cycle not found.' });
      return;
    }

    res.status(200).json({ admissionCycle: cycle });
  } catch (error) {
    next(error);
  }
};
