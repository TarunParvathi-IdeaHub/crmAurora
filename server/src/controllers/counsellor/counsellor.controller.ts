import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../../config/database';

// ─── Prisma select ────────────────────────────────────────────────────────────

const COUNSELLOR_SELECT = {
  id:          true,
  empId:       true,
  firstName:   true,
  lastName:    true,
  email:       true,
  mobileNo:    true,
  designation: true,
} satisfies Prisma.AdmissionCounsellorSelect;

type CounsellorResult = Prisma.AdmissionCounsellorGetPayload<{
  select: typeof COUNSELLOR_SELECT;
}>;

// ─── Response type ────────────────────────────────────────────────────────────

interface CounsellorResponse {
  id:          string;
  empId:       string;
  firstName:   string;
  lastName:    string;
  email:       string;
  mobileNo:    string;
  designation: string;
}

function mapCounsellor(c: CounsellorResult): CounsellorResponse {
  return {
    id:          c.id,
    empId:       c.empId,
    firstName:   c.firstName,
    lastName:    c.lastName,
    email:       c.email,
    mobileNo:    c.mobileNo,
    designation: c.designation,
  };
}

// ─── GET /api/counsellors/:institutionId ──────────────────────────────────────

export const getCounsellorsByInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const institutionId = (req.params.institutionId as string)?.trim();

    if (!institutionId) {
      res.status(400).json({ error: 'institutionId is required.' });
      return;
    }

    const counsellors = await prisma.admissionCounsellor.findMany({
      where:   { institutionId, isActive: true },
      select:  COUNSELLOR_SELECT,
      orderBy: { firstName: 'asc' },
    });

    if (counsellors.length === 0) {
      res.status(404).json({ error: 'No active counsellors found for this institution.' });
      return;
    }

    res.status(200).json({ counsellors: counsellors.map(mapCounsellor) });
  } catch (error) {
    next(error);
  }
};
