import type { NextFunction, Request, Response } from 'express';
import prisma from '../../config/database';
import type { AuthRequest } from '../../middleware/auth.middleware';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// ─── Helper: resolve institutionId for the logged-in employee ────────────────
async function resolveInstitutionId(email: string, role: string): Promise<string | null> {
  const pascal = role
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  const accessor = pascal.charAt(0).toLowerCase() + pascal.slice(1);

  const model = (prisma as unknown as Record<string, unknown>)[accessor];
  if (!model || typeof (model as Record<string, unknown>).findFirst !== 'function') return null;

  const delegate = model as {
    findFirst: (args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    }) => Promise<{ institutionId: string } | null>;
  };

  const emp = await delegate.findFirst({
    where: { email: email.toLowerCase() },
    select: { institutionId: true },
  });

  return emp?.institutionId ?? null;
}

// ─── Helper: flatten batch → frontend Batch shape ────────────────────────────
function formatBatch(batch: {
  id: string;
  batchName: string;
  isActive: boolean;
  institution: { institutionName: string } | null;
  batchPrograms: {
    program: {
      id: string;
      programName: string;
      programSname: string;
      level: { id: string; levelName: string };
    };
  }[];
}) {
  // Group programs by level name
  const programsByLevel: Record<string, { id: string; programName: string; programSname: string; levelName: string }[]> = {};

  for (const bp of batch.batchPrograms) {
    const levelName = bp.program.level.levelName;
    if (!programsByLevel[levelName]) programsByLevel[levelName] = [];
    programsByLevel[levelName].push({
      id: bp.program.id,
      programName: bp.program.programName,
      programSname: bp.program.programSname,
      levelName,
    });
  }

  return {
    id: batch.id,
    batchName: batch.batchName,
    isActive: batch.isActive,
    institutionName: batch.institution?.institutionName ?? '',
    programs: batch.batchPrograms.map((bp) => ({
      id: bp.program.id,
      programName: bp.program.programName,
      programSname: bp.program.programSname,
      levelId: bp.program.level.id,
      levelName: bp.program.level.levelName,
    })),
    programsByLevel,
  };
}

// ─── Shared program include ───────────────────────────────────────────────────
const batchInclude = {
  institution: { select: { institutionName: true } },
  batchPrograms: {
    select: {
      program: {
        select: {
          id: true,
          programName: true,
          programSname: true,
          level: { select: { id: true, levelName: true } },
        },
      },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/batches/create
// Body: { batchName, programIds: string[] }
// institutionId is resolved from the authenticated user's JWT.
// ─────────────────────────────────────────────────────────────────────────────
export const createBatch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role } = req.user!;
    const body = req.body as Record<string, unknown>;

    const batchName = normalizeString(body.batchName);
    const programIds: string[] = Array.isArray(body.programIds)
      ? (body.programIds as unknown[]).map(String).filter(Boolean)
      : [];

    // Parse optional start/end dates; default to current year span
    const startDate = body.startDate ? new Date(body.startDate as string) : new Date();
    const defaultEnd = new Date(startDate);
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
    const endDate = body.endDate ? new Date(body.endDate as string) : defaultEnd;

    if (!batchName) {
      res.status(400).json({ error: 'batchName is required.' });
      return;
    }
    if (programIds.length === 0) {
      res.status(400).json({ error: 'At least one program must be selected.' });
      return;
    }

    // ── Resolve institutionId from JWT ───────────────────────────────────────
    const institutionId = await resolveInstitutionId(email!, role!);
    if (!institutionId) {
      res.status(403).json({ error: 'Could not resolve institution for this user.' });
      return;
    }

    // ── Check duplicate batch name ───────────────────────────────────────────
    const existing = await prisma.batch.findUnique({
      where: { institutionId_batchName: { institutionId, batchName } },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({ error: `A batch named '${batchName}' already exists.` });
      return;
    }

    // ── Validate all programIds belong to this institution and are active ────
    const uniqueProgramIds = [...new Set(programIds)];
    const programs = await prisma.program.findMany({
      where: { id: { in: uniqueProgramIds } },
      select: { id: true, institutionId: true, isActive: true },
    });

    const programMap = new Map(programs.map((p) => [p.id, p]));
    const missingIds = uniqueProgramIds.filter((id) => !programMap.has(id));
    if (missingIds.length > 0) {
      res.status(404).json({ error: 'Some programs were not found.', missingIds });
      return;
    }

    const wrongInstitution = uniqueProgramIds.filter(
      (id) => programMap.get(id)!.institutionId !== institutionId
    );
    if (wrongInstitution.length > 0) {
      res.status(400).json({ error: 'Some programs do not belong to your institution.', invalidProgramIds: wrongInstitution });
      return;
    }

    const inactivePrograms = uniqueProgramIds.filter((id) => !programMap.get(id)!.isActive);
    if (inactivePrograms.length > 0) {
      res.status(400).json({ error: 'Some programs are inactive.', inactiveProgramIds: inactivePrograms });
      return;
    }

    // ── Create batch + link programs in a transaction ────────────────────────
    const newBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: { institutionId, batchName, startDate, endDate },
      });

      await tx.batchProgram.createMany({
        data: uniqueProgramIds.map((programId) => ({ institutionId, batchId: batch.id, programId })),
      });

      return tx.batch.findUnique({
        where: { id: batch.id },
        include: batchInclude,
      });
    });

    res.status(201).json({ batch: formatBatch(newBatch!) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/batches
// Returns all batches for the logged-in user's institution.
// ─────────────────────────────────────────────────────────────────────────────
export const getBatches = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role } = req.user!;

    const institutionId = await resolveInstitutionId(email!, role!);
    if (!institutionId) {
      res.status(403).json({ error: 'Could not resolve institution for this user.' });
      return;
    }

    const rows = await prisma.batch.findMany({
      where: { institutionId },
      include: batchInclude,
      orderBy: { batchName: 'asc' },
    });

    res.status(200).json({ batches: rows.map(formatBatch) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/batches/:batchId
// Body: { batchName, programIds: string[] }
// Diff-based sync: only deletes removed programs and creates new ones.
// ─────────────────────────────────────────────────────────────────────────────
export const updateBatch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role } = req.user!;
    const batchId = normalizeString(req.params.batchId);
    const body = req.body as Record<string, unknown>;

    if (!batchId) {
      res.status(400).json({ error: 'batchId is required.' });
      return;
    }

    const batchName = normalizeString(body.batchName);
    const programIds: string[] = Array.isArray(body.programIds)
      ? (body.programIds as unknown[]).map(String).filter(Boolean)
      : [];

    if (!batchName) {
      res.status(400).json({ error: 'batchName is required.' });
      return;
    }
    if (programIds.length === 0) {
      res.status(400).json({ error: 'At least one program must be selected.' });
      return;
    }

    // ── Resolve institutionId ────────────────────────────────────────────────
    const institutionId = await resolveInstitutionId(email!, role!);
    if (!institutionId) {
      res.status(403).json({ error: 'Could not resolve institution for this user.' });
      return;
    }

    // ── Verify batch belongs to this institution ─────────────────────────────
    const existingBatch = await prisma.batch.findFirst({
      where: { id: batchId, institutionId },
      include: {
        batchPrograms: { select: { programId: true } },
      },
    });
    if (!existingBatch) {
      res.status(404).json({ error: 'Batch not found.' });
      return;
    }

    // ── Check name conflict (exclude self) ───────────────────────────────────
    const nameConflict = await prisma.batch.findFirst({
      where: { institutionId, batchName, NOT: { id: batchId } },
      select: { id: true },
    });
    if (nameConflict) {
      res.status(409).json({ error: `A batch named '${batchName}' already exists.` });
      return;
    }

    // ── Validate incoming programIds ─────────────────────────────────────────
    const uniqueProgramIds = [...new Set(programIds)];
    const programs = await prisma.program.findMany({
      where: { id: { in: uniqueProgramIds } },
      select: { id: true, institutionId: true, isActive: true },
    });

    const programMap = new Map(programs.map((p) => [p.id, p]));
    const missingIds = uniqueProgramIds.filter((id) => !programMap.has(id));
    if (missingIds.length > 0) {
      res.status(404).json({ error: 'Some programs were not found.', missingIds });
      return;
    }

    const wrongInstitution = uniqueProgramIds.filter(
      (id) => programMap.get(id)!.institutionId !== institutionId
    );
    if (wrongInstitution.length > 0) {
      res.status(400).json({ error: 'Some programs do not belong to your institution.', invalidProgramIds: wrongInstitution });
      return;
    }

    // ── Diff: existing vs desired ────────────────────────────────────────────
    const existingProgramIds = new Set(existingBatch.batchPrograms.map((bp) => bp.programId));
    const desiredProgramIds = new Set(uniqueProgramIds);

    const toDelete = [...existingProgramIds].filter((id) => !desiredProgramIds.has(id));
    const toCreate = [...desiredProgramIds].filter((id) => !existingProgramIds.has(id));

    // ── Apply diff in a transaction ──────────────────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      await tx.batch.update({
        where: { id: batchId },
        data: { batchName },
      });

      if (toDelete.length > 0) {
        await tx.batchProgram.deleteMany({
          where: { batchId, programId: { in: toDelete } },
        });
      }

      if (toCreate.length > 0) {
        await tx.batchProgram.createMany({
          data: toCreate.map((programId) => ({ institutionId, batchId, programId })),
        });
      }

      return tx.batch.findUnique({
        where: { id: batchId },
        include: batchInclude,
      });
    });

    res.status(200).json({ batch: formatBatch(updated!) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/batches/:batchId  (unchanged — kept for detail views)
// ─────────────────────────────────────────────────────────────────────────────
export const getBatchById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batchId = normalizeString(req.params.batchId);

    if (!batchId) {
      res.status(400).json({ error: 'batchId is required.' });
      return;
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: batchInclude,
    });

    if (!batch) {
      res.status(404).json({ error: 'Batch not found.' });
      return;
    }

    res.status(200).json({ batch: formatBatch(batch) });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/batches/active/by-institution/:institutionId
// Public – used by admission cycle form to list active batches.
// ─────────────────────────────────────────────────────────────────────────────
export const getActiveBatchesByInstitution = async (
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

    const batches = await prisma.batch.findMany({
      where: { institutionId, isActive: true },
      select: { id: true, batchName: true },
      orderBy: { batchName: 'asc' },
    });

    res.status(200).json({ batches });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/batches/:batchId
// Cascades safely: removes BatchProgram and BatchAdmissionCycle records first.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteBatch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role } = req.user!;
    const batchId = normalizeString(req.params.batchId);

    if (!batchId) {
      res.status(400).json({ error: 'batchId is required.' });
      return;
    }

    const institutionId = await resolveInstitutionId(email!, role!);
    if (!institutionId) {
      res.status(403).json({ error: 'Could not resolve institution for this user.' });
      return;
    }

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, institutionId },
      select: { id: true },
    });
    if (!batch) {
      res.status(404).json({ error: 'Batch not found.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.batchAdmissionCycle.deleteMany({ where: { batchId } });
      await tx.batchProgram.deleteMany({ where: { batchId } });
      await tx.batch.delete({ where: { id: batchId } });
    });

    res.status(200).json({ message: 'Batch deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
