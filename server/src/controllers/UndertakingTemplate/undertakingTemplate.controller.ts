import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../../config/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// Accepts JSON object/array – rejects primitives and null.
function isValidJsonContent(value: unknown): value is Prisma.InputJsonValue {
  return value !== null && value !== undefined && typeof value === 'object';
}

// ─── POST /api/undertaking-templates/create ───────────────────────────────────
export const createUndertakingTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const institutionId = normalizeString(body.institutionId);
    const programId     = normalizeString(body.programId);
    const title         = normalizeString(body.title);
    const version       = normalizeString(body.version);
    const description   = normalizeString(body.description) || undefined;
    const content       = body.content;

    // ── Required field validation ───────────────────────────────────────────
    if (!institutionId) {
      res.status(400).json({ error: 'institutionId is required.' });
      return;
    }
    if (!programId) {
      res.status(400).json({ error: 'programId is required.' });
      return;
    }
    if (!title) {
      res.status(400).json({ error: 'title is required.' });
      return;
    }
    if (!version) {
      res.status(400).json({ error: 'version is required.' });
      return;
    }
    if (content === undefined || content === null) {
      res.status(400).json({ error: 'content is required.' });
      return;
    }
    if (!isValidJsonContent(content)) {
      res.status(400).json({
        error: 'content must be a valid JSON object or array.',
      });
      return;
    }

    // ── DB lookups: institution + program in parallel ───────────────────────
    const [institution, program] = await Promise.all([
      prisma.institution.findUnique({
        where: { id: institutionId },
        select: { id: true, institutionName: true },
      }),
      prisma.program.findUnique({
        where: { id: programId },
        select: { id: true, programName: true, programSname: true, institutionId: true },
      }),
    ]);

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }
    if (!program) {
      res.status(404).json({ error: 'Program not found.' });
      return;
    }
    if (program.institutionId !== institutionId) {
      res.status(400).json({
        error: 'Program does not belong to the specified institution.',
      });
      return;
    }

    // ── Uniqueness check: title + version + programId ───────────────────────
    const duplicate = await prisma.studentAdmissionUndertakingTemplate.findFirst({
      where: { title, version, programId },
      select: { id: true },
    });
    if (duplicate) {
      res.status(409).json({
        error: `A template with title "${title}" and version "${version}" already exists for this program.`,
      });
      return;
    }

    // ── Create template ─────────────────────────────────────────────────────
    const template = await prisma.studentAdmissionUndertakingTemplate.create({
      data: {
        institutionId,
        programId,
        title,
        version,
        description,
        content,
        isActive: true,
        publishedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        version: true,
        description: true,
        content: true,
        isActive: true,
        publishedAt: true,
        createdAt: true,
        institution: { select: { id: true, institutionName: true } },
        program: { select: { id: true, programName: true, programSname: true } },
      },
    });

    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/undertaking-templates/by-program?institutionId=&programId= ──────
export const getTemplateByProgram = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutionId = normalizeString(req.query.institutionId);
    const programId     = normalizeString(req.query.programId);

    if (!institutionId) {
      res.status(400).json({ error: 'institutionId query parameter is required.' });
      return;
    }
    if (!programId) {
      res.status(400).json({ error: 'programId query parameter is required.' });
      return;
    }

    // Latest active template for this institution + program
    const template = await prisma.studentAdmissionUndertakingTemplate.findFirst({
      where: { institutionId, programId, isActive: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        version: true,
        description: true,
        content: true,
        isActive: true,
        publishedAt: true,
        program: { select: { id: true, programName: true, programSname: true } },
      },
    });

    if (!template) {
      res.status(404).json({
        error: 'No active undertaking template found for this program.',
      });
      return;
    }

    res.status(200).json({ template });
  } catch (error) {
    next(error);
  }
};
