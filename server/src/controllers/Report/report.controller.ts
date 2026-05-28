import type { NextFunction, Request, Response } from 'express';
import prisma from '../../config/database';

// ── Helpers ───────────────────────────────────────────────────────────────────

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const;

/** Converts a 1-based month integer and year into a human-readable label, e.g. "MAY 2026". */
function formatMonthLabel(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Returns conversion ratio rounded to 2 decimal places. Returns 0 when total is 0. */
function calcConversionRatio(admitted: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat(((admitted / total) * 100).toFixed(2));
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CounsellorMonthlyRow {
  month: string;
  assignedLeads: number;
  closedLeads: number;
  admitted: number;
  notAdmitted: number;
}

interface ConsultantMonthlyRow {
  month: string;
  generatedLeads: number;
  closedLeads: number;
  admitted: number;
  notAdmitted: number;
}

interface CounsellorSummaryRow {
  counsellorId: string;
  counsellorName: string;
  systemGeneratedLeads: number;
  systemClosedLeads: number;
  systemAdmittedLeads: number;
  systemNotAdmitted: number;
  ownLeadsGenerated: number;
  ownLeadsClosed: number;
  ownLeadsAdmitted: number;
  ownLeadsNotAdmitted: number;
  totalAssignedLeads: number;
  totalAdmittedLeads: number;
  conversionRatio: number;
}

interface ConsultantSummaryRow {
  consultantId: string;
  consultantName: string;
  generatedLeads: number;
  closedLeads: number;
  admittedLeads: number;
  notAdmitted: number;
  totalAssignedLeads: number;
  totalAdmittedLeads: number;
  conversionRatio: number;
}

// ── GET /api/counsellor/report/:counsellorId ──────────────────────────────────

export const getCounsellorMonthlyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const counsellorId = normalizeString(req.params.counsellorId);
    if (!counsellorId) {
      res.status(400).json({ error: 'counsellorId is required.' });
      return;
    }

    const counsellor = await prisma.admissionCounsellor.findUnique({
      where: { id: counsellorId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!counsellor) {
      res.status(404).json({ error: 'Counsellor not found.' });
      return;
    }

    const stats = await prisma.counsellorPerformance.findMany({
      where: { counsellorId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      select: {
        month: true,
        year: true,
        systemAssignedLeads: true,
        systemClosedLeads: true,
        systemAdmittedStudents: true,
        systemNotAdmittedStudents: true,
        ownGeneratedLeads: true,
        ownClosedLeads: true,
        ownAdmittedStudents: true,
        ownNotAdmittedStudents: true,
      },
    });

    if (stats.length === 0) {
      res.status(404).json({ error: 'No performance data found for this counsellor.' });
      return;
    }

    const report: CounsellorMonthlyRow[] = stats.map((s) => ({
      month: formatMonthLabel(s.month, s.year),
      assignedLeads: s.systemAssignedLeads + s.ownGeneratedLeads,
      closedLeads: s.systemClosedLeads + s.ownClosedLeads,
      admitted: s.systemAdmittedStudents + s.ownAdmittedStudents,
      notAdmitted: s.systemNotAdmittedStudents + s.ownNotAdmittedStudents,
    }));

    res.status(200).json({
      counsellorId: counsellor.id,
      counsellorName: `${counsellor.firstName} ${counsellor.lastName}`,
      total: report.length,
      report,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/consultant/report/:consultantId ──────────────────────────────────

export const getConsultantMonthlyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultantId = normalizeString(req.params.consultantId);
    if (!consultantId) {
      res.status(400).json({ error: 'consultantId is required.' });
      return;
    }

    const consultant = await prisma.admissionConsultant.findUnique({
      where: { id: consultantId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!consultant) {
      res.status(404).json({ error: 'Consultant not found.' });
      return;
    }

    const stats = await prisma.consultantPerformance.findMany({
      where: { consultantId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      select: {
        month: true,
        year: true,
        ownGeneratedLeads: true,
        ownClosedLeads: true,
        ownAdmittedStudents: true,
        ownNotAdmittedStudents: true,
      },
    });

    if (stats.length === 0) {
      res.status(404).json({ error: 'No performance data found for this consultant.' });
      return;
    }

    const report: ConsultantMonthlyRow[] = stats.map((s) => ({
      month: formatMonthLabel(s.month, s.year),
      generatedLeads: s.ownGeneratedLeads,
      closedLeads: s.ownClosedLeads,
      admitted: s.ownAdmittedStudents,
      notAdmitted: s.ownNotAdmittedStudents,
    }));

    res.status(200).json({
      consultantId: consultant.id,
      consultantName: `${consultant.firstName} ${consultant.lastName}`,
      total: report.length,
      report,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/counsellor/reports/getall/:institutionId ────────────────────────

export const getAllCounsellorReports = async (
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

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    const grouped = await prisma.counsellorPerformance.groupBy({
      by: ['counsellorId'],
      where: { institutionId },
      _sum: {
        systemAssignedLeads: true,
        systemClosedLeads: true,
        systemAdmittedStudents: true,
        systemNotAdmittedStudents: true,
        ownGeneratedLeads: true,
        ownClosedLeads: true,
        ownAdmittedStudents: true,
        ownNotAdmittedStudents: true,
      },
    });

    if (grouped.length === 0) {
      res.status(404).json({ error: 'No performance reports found for this institution.' });
      return;
    }

    const counsellorIds = grouped.map((g) => g.counsellorId);
    const counsellors = await prisma.admissionCounsellor.findMany({
      where: { id: { in: counsellorIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const counsellorMap = new Map(counsellors.map((c) => [c.id, c]));

    const reports: CounsellorSummaryRow[] = grouped.map((g) => {
      const sums = g._sum;

      const systemGeneratedLeads = sums.systemAssignedLeads ?? 0;
      const systemClosedLeads    = sums.systemClosedLeads ?? 0;
      const systemAdmittedLeads  = sums.systemAdmittedStudents ?? 0;
      const systemNotAdmitted    = sums.systemNotAdmittedStudents ?? 0;

      const ownLeadsGenerated    = sums.ownGeneratedLeads ?? 0;
      const ownLeadsClosed       = sums.ownClosedLeads ?? 0;
      const ownLeadsAdmitted     = sums.ownAdmittedStudents ?? 0;
      const ownLeadsNotAdmitted  = sums.ownNotAdmittedStudents ?? 0;

      const totalAssignedLeads = systemGeneratedLeads + ownLeadsGenerated;
      const totalAdmittedLeads = systemAdmittedLeads + ownLeadsAdmitted;

      const counsellor = counsellorMap.get(g.counsellorId);

      return {
        counsellorId: g.counsellorId,
        counsellorName: counsellor
          ? `${counsellor.firstName} ${counsellor.lastName}`
          : 'Unknown',
        systemGeneratedLeads,
        systemClosedLeads,
        systemAdmittedLeads,
        systemNotAdmitted,
        ownLeadsGenerated,
        ownLeadsClosed,
        ownLeadsAdmitted,
        ownLeadsNotAdmitted,
        totalAssignedLeads,
        totalAdmittedLeads,
        conversionRatio: calcConversionRatio(totalAdmittedLeads, totalAssignedLeads),
      };
    });

    res.status(200).json({
      institutionId,
      total: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/consultant/reports/getall/:institutionId ────────────────────────

export const getAllConsultantReports = async (
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

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      res.status(404).json({ error: 'Institution not found.' });
      return;
    }

    const grouped = await prisma.consultantPerformance.groupBy({
      by: ['consultantId'],
      where: { institutionId },
      _sum: {
        ownGeneratedLeads: true,
        ownClosedLeads: true,
        ownAdmittedStudents: true,
        ownNotAdmittedStudents: true,
      },
    });

    if (grouped.length === 0) {
      res.status(404).json({ error: 'No performance reports found for this institution.' });
      return;
    }

    const consultantIds = grouped.map((g) => g.consultantId);
    const consultants = await prisma.admissionConsultant.findMany({
      where: { id: { in: consultantIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const consultantMap = new Map(consultants.map((c) => [c.id, c]));

    const reports: ConsultantSummaryRow[] = grouped.map((g) => {
      const sums = g._sum;

      const generatedLeads  = sums.ownGeneratedLeads ?? 0;
      const closedLeads     = sums.ownClosedLeads ?? 0;
      const admittedLeads   = sums.ownAdmittedStudents ?? 0;
      const notAdmitted     = sums.ownNotAdmittedStudents ?? 0;

      const totalAssignedLeads = generatedLeads;
      const totalAdmittedLeads = admittedLeads;

      const consultant = consultantMap.get(g.consultantId);

      return {
        consultantId: g.consultantId,
        consultantName: consultant
          ? `${consultant.firstName} ${consultant.lastName}`
          : 'Unknown',
        generatedLeads,
        closedLeads,
        admittedLeads,
        notAdmitted,
        totalAssignedLeads,
        totalAdmittedLeads,
        conversionRatio: calcConversionRatio(totalAdmittedLeads, totalAssignedLeads),
      };
    });

    res.status(200).json({
      institutionId,
      total: reports.length,
      reports,
    });
  } catch (error) {
    next(error);
  }
};
