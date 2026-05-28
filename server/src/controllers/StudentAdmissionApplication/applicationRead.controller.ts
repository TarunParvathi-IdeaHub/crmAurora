import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { ApplicationStatus } from '@prisma/client';
import prisma from '../../config/database';

// ─── Literal Types ────────────────────────────────────────────────────────────

type FilterType = 'all' | 'ug' | 'pg' | 'phd';
type RoleScope  = 'institution' | 'counsellor' | 'consultant';

// ─── Degree Level Constants ───────────────────────────────────────────────────

const DEGREE_LEVEL_NAMES = {
  ug: [
    'Under Graduate (UG)',
    'Undergraduate (UG)',
    'UG',
  ],
  pg: [
    'Post Graduation (PG)',
    'Post Graduate (PG)',
    'Postgraduate (PG)',
    'PG',
  ],
  phd: [
    'Doctor of Philosophy (PhD)',
    'Doctor Of Philosophy (PhD)',
    'Doctor of Philosophy',
    'PhD',
    'Ph.D',
  ],
} as const;

// ─── Degree Level Filter Builder ─────────────────────────────────────────────

function buildDegreeLevelFilter(
  filter: FilterType,
): Pick<Prisma.StudentAdmissionApplicationWhereInput, 'degreeLevel'> {
  switch (filter) {
    case 'ug':
      return { degreeLevel: { levelName: { in: [...DEGREE_LEVEL_NAMES.ug] } } };
    case 'pg':
      return { degreeLevel: { levelName: { in: [...DEGREE_LEVEL_NAMES.pg] } } };
    case 'phd':
      return { degreeLevel: { levelName: { in: [...DEGREE_LEVEL_NAMES.phd] } } };
    default:
      return {};
  }
}

// ─── Where Clause Builder ─────────────────────────────────────────────────────

interface QueryOptions {
  institutionId: string;
  filter:        FilterType;
  counsellorId?: string;
  consultantId?: string;
}

function buildWhereClause(
  opts: QueryOptions,
): Prisma.StudentAdmissionApplicationWhereInput {
  const { institutionId, filter, counsellorId, consultantId } = opts;
  return {
    institutionId,
    ...(counsellorId ? { admissionCounsellorId: counsellorId } : {}),
    ...(consultantId ? { admissionConsultantId: consultantId } : {}),
    ...buildDegreeLevelFilter(filter),
  };
}

// ─── Prisma Include ───────────────────────────────────────────────────────────

const APPLICATION_INCLUDE = {
  degreeLevel: {
    select: { levelName: true },
  },
  program: {
    select: { programName: true },
  },
  admissionCycle: {
    select: { admissionCycleName: true },
  },
  admissionCounsellor: {
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      mobileNo:  true,
    },
  },
  admissionConsultant: {
    select: {
      id:        true,
      firstName: true,
      lastName:  true,
      email:     true,
      mobileNo:  true,
    },
  },
} satisfies Prisma.StudentAdmissionApplicationInclude;

// ─── Result Type ──────────────────────────────────────────────────────────────

type AppRow = Prisma.StudentAdmissionApplicationGetPayload<{
  include: typeof APPLICATION_INCLUDE;
}>;

// ─── Response Types ───────────────────────────────────────────────────────────

interface StaffInfo {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  mobileNo:  string;
}

export interface ApplicationCommonResponse {
  id:                string;
  applicationStatus: ApplicationStatus;
  firstName:         string;
  lastName:          string;
  mobileNo:          string;
  email:             string;
  studyLevel:        string;
  programApplied:    string;
  admissionCycle:    string;
}

export interface ApplicationFullResponse extends ApplicationCommonResponse {
  admissionCounsellor: StaffInfo | null;
  admissionConsultant: StaffInfo | null;
}

// ─── Response Mappers ─────────────────────────────────────────────────────────

function mapCommon(app: AppRow): ApplicationCommonResponse {
  return {
    id:                app.id,
    applicationStatus: app.applicationStatus,
    firstName:         app.firstName,
    lastName:          app.lastName,
    mobileNo:          app.mobileNo,
    email:             app.email,
    studyLevel:        app.degreeLevel.levelName,
    programApplied:    app.program.programName,
    admissionCycle:    app.admissionCycle.admissionCycleName,
  };
}

function mapFull(app: AppRow): ApplicationFullResponse {
  return {
    ...mapCommon(app),
    admissionCounsellor: app.admissionCounsellor
      ? {
          id:        app.admissionCounsellor.id,
          firstName: app.admissionCounsellor.firstName,
          lastName:  app.admissionCounsellor.lastName,
          email:     app.admissionCounsellor.email,
          mobileNo:  app.admissionCounsellor.mobileNo,
        }
      : null,
    admissionConsultant: app.admissionConsultant
      ? {
          id:        app.admissionConsultant.id,
          firstName: app.admissionConsultant.firstName,
          lastName:  app.admissionConsultant.lastName,
          email:     app.admissionConsultant.email,
          mobileNo:  app.admissionConsultant.mobileNo,
        }
      : null,
  };
}

// ─── Handler Factory ──────────────────────────────────────────────────────────

interface HandlerConfig {
  filter: FilterType;
  scope:  RoleScope;
}

function createHandler(config: HandlerConfig) {
  const { filter, scope } = config;

  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const institutionId = req.params.institutionId as string;
      const counsellorId  = req.params.counsellorId  as string | undefined;
      const consultantId  = req.params.consultantId  as string | undefined;

      // ── Validation ──────────────────────────────────────────────────────────
      if (!institutionId) {
        res.status(400).json({ error: 'institutionId is required.' });
        return;
      }
      if (scope === 'counsellor' && !counsellorId) {
        res.status(400).json({ error: 'counsellorId is required.' });
        return;
      }
      if (scope === 'consultant' && !consultantId) {
        res.status(400).json({ error: 'consultantId is required.' });
        return;
      }

      // ── Query ────────────────────────────────────────────────────────────────
      const where = buildWhereClause({
        institutionId,
        filter,
        counsellorId,
        consultantId,
      });

      const applications = await prisma.studentAdmissionApplication.findMany({
        where,
        include:  APPLICATION_INCLUDE,
        orderBy:  { createdAt: 'desc' },
      });

      // ── 404 Guard ────────────────────────────────────────────────────────────
      if (applications.length === 0) {
        res.status(404).json({ error: 'No applications found.' });
        return;
      }

      // ── Map & Respond ────────────────────────────────────────────────────────
      const data =
        scope === 'institution'
          ? applications.map(mapFull)
          : applications.map(mapCommon);

      res.status(200).json({ count: data.length, data });
    } catch (err) {
      next(err);
    }
  };
}

// ─── Exported Handlers ────────────────────────────────────────────────────────

// Institution-level
export const getAllApplications        = createHandler({ filter: 'all', scope: 'institution' });
export const getUgApplications         = createHandler({ filter: 'ug',  scope: 'institution' });
export const getPgApplications         = createHandler({ filter: 'pg',  scope: 'institution' });
export const getPhdApplications        = createHandler({ filter: 'phd', scope: 'institution' });

// Counsellor-level
export const getCounsellorApplications    = createHandler({ filter: 'all', scope: 'counsellor' });
export const getCounsellorUgApplications  = createHandler({ filter: 'ug',  scope: 'counsellor' });
export const getCounsellorPgApplications  = createHandler({ filter: 'pg',  scope: 'counsellor' });
export const getCounsellorPhdApplications = createHandler({ filter: 'phd', scope: 'counsellor' });

// Consultant-level
export const getConsultantApplications    = createHandler({ filter: 'all', scope: 'consultant' });
export const getConsultantUgApplications  = createHandler({ filter: 'ug',  scope: 'consultant' });
export const getConsultantPgApplications  = createHandler({ filter: 'pg',  scope: 'consultant' });
export const getConsultantPhdApplications = createHandler({ filter: 'phd', scope: 'consultant' });
