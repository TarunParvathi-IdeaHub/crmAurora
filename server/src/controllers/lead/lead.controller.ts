import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { LeadSourceType } from '@prisma/client';
import prisma from '../../config/database';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Internal types ───────────────────────────────────────────────────────────

type LeadFilter = 'all' | 'ug' | 'pg' | 'phd';
type RoleType   = 'all' | 'counsellor' | 'consultant';

// ─── Prisma select (single source of truth) ───────────────────────────────────

const LEAD_SELECT = {
  id:                   true,
  firstName:            true,
  lastName:             true,
  mobileNo:             true,
  email:                true,
  degreeLevel:          { select: { levelName: true } },
  program:              { select: { programName: true } },
  admissionCycle:       { select: { admissionCycleName: true } },
  admissionCounsellors: { select: { firstName: true, lastName: true } },
  admissionConsultants: { select: { firstName: true, lastName: true } },
  _count:               { select: { studentAdmissionApplications: true } },
} satisfies Prisma.EnquiryFormSelect;

type LeadResult = Prisma.EnquiryFormGetPayload<{ select: typeof LEAD_SELECT }>;

// ─── Response types ───────────────────────────────────────────────────────────

interface BaseLeadResponse {
  id:             string;
  firstName:      string;
  lastName:       string;
  mobileNo:       string;
  email:          string;
  studyLevel:     string;
  programApplied: string;
  admissionCycle: string;
  hasApplication: boolean;
}

interface FullLeadResponse extends BaseLeadResponse {
  admissionCounsellor: string | null;
  admissionConsultant: string | null;
}

// ─── Query builder ────────────────────────────────────────────────────────────

function buildDegreeLevelFilter(filter: LeadFilter): Prisma.EnquiryFormWhereInput {
  if (filter === 'all') return {};
  return { degreeLevel: { levelName: { in: [...DEGREE_LEVEL_NAMES[filter]] } } };
}

async function fetchLeads(params: {
  institutionId: string;
  filter:        LeadFilter;
  roleType:      RoleType;
  roleId?:       string;
}): Promise<LeadResult[]> {
  const { institutionId, filter, roleType, roleId } = params;

  const roleFilter: Prisma.EnquiryFormWhereInput =
    roleType === 'counsellor' && roleId ? { admissionCounsellorId: roleId } :
    roleType === 'consultant' && roleId ? { admissionConsultantId: roleId } :
    {};

  return prisma.enquiryForm.findMany({
    where: {
      institutionId,
      ...buildDegreeLevelFilter(filter),
      ...roleFilter,
    },
    select:  LEAD_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Response mapper ──────────────────────────────────────────────────────────

function mapLead(
  lead:     LeadResult,
  roleType: RoleType,
): BaseLeadResponse | FullLeadResponse {
  const base: BaseLeadResponse = {
    id:             lead.id,
    firstName:      lead.firstName,
    lastName:       lead.lastName,
    mobileNo:       lead.mobileNo,
    email:          lead.email,
    studyLevel:     lead.degreeLevel.levelName,
    programApplied: lead.program.programName,
    admissionCycle: lead.admissionCycle.admissionCycleName,
    hasApplication: lead._count.studentAdmissionApplications > 0,
  };

  if (roleType === 'counsellor' || roleType === 'consultant') {
    return base;
  }

  return {
    ...base,
    admissionCounsellor: lead.admissionCounsellors
      ? `${lead.admissionCounsellors.firstName} ${lead.admissionCounsellors.lastName}`
      : null,
    admissionConsultant: lead.admissionConsultants
      ? `${lead.admissionConsultants.firstName} ${lead.admissionConsultants.lastName}`
      : null,
  };
}

// ─── Handler factory ──────────────────────────────────────────────────────────

function createLeadHandler(filter: LeadFilter, roleType: RoleType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const institutionId = (req.params.institutionId as string)?.trim();
      if (!institutionId) {
        res.status(400).json({ error: 'institutionId is required.' });
        return;
      }

      let roleId: string | undefined;

      if (roleType === 'counsellor') {
        roleId = (req.params.counsellorId as string)?.trim();
        if (!roleId) {
          res.status(400).json({ error: 'counsellorId is required.' });
          return;
        }
      } else if (roleType === 'consultant') {
        roleId = (req.params.consultantId as string)?.trim();
        if (!roleId) {
          res.status(400).json({ error: 'consultantId is required.' });
          return;
        }
      }

      const leads = await fetchLeads({ institutionId, filter, roleType, roleId });

      res.status(200).json({ leads: leads.map((lead) => mapLead(lead, roleType)) });
    } catch (error) {
      next(error);
    }
  };
}

// ─── Exported handlers ────────────────────────────────────────────────────────

// Institution-wide
export const getAllLeads  = createLeadHandler('all', 'all');
export const getUGLeads  = createLeadHandler('ug',  'all');
export const getPGLeads  = createLeadHandler('pg',  'all');
export const getPHDLeads = createLeadHandler('phd', 'all');

// Counsellor-scoped
export const getCounsellorLeads    = createLeadHandler('all', 'counsellor');
export const getCounsellorUGLeads  = createLeadHandler('ug',  'counsellor');
export const getCounsellorPGLeads  = createLeadHandler('pg',  'counsellor');
export const getCounsellorPHDLeads = createLeadHandler('phd', 'counsellor');

// Consultant-scoped
export const getConsultantLeads    = createLeadHandler('all', 'consultant');
export const getConsultantUGLeads  = createLeadHandler('ug',  'consultant');
export const getConsultantPGLeads  = createLeadHandler('pg',  'consultant');
export const getConsultantPHDLeads = createLeadHandler('phd', 'consultant');

// ─── DELETE /api/leads/delete/:leadId ────────────────────────────────────────

const DELETE_LEAD_SELECT = {
  id:                    true,
  firstName:             true,
  lastName:              true,
  leadSourceType:        true,
  admissionCounsellorId: true,
  admissionConsultantId: true,
  admissionCounsellors:  { select: { firstName: true, lastName: true } },
  admissionConsultants:  { select: { firstName: true, lastName: true } },
} satisfies Prisma.EnquiryFormSelect;

export const deleteLead = async (
  req:  Request,
  res:  Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const leadId = (req.params.leadId as string)?.trim();

    if (!leadId) {
      res.status(400).json({ error: 'leadId is required.' });
      return;
    }

    // ── Validate lead exists (outside transaction to return 404 early) ────
    const lead = await prisma.enquiryForm.findUnique({
      where:  { id: leadId },
      select: DELETE_LEAD_SELECT,
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    const now      = new Date();
    const month    = now.getMonth() + 1;
    const year     = now.getFullYear();
    const isSystem = lead.leadSourceType === LeadSourceType.SYSTEM_ASSIGNED;

    // ── Transactional: decrement stats → cascade-delete children → delete lead ──
    await prisma.$transaction(async (tx) => {
      // ── 1. Decrement stats ─────────────────────────────────────────────────
      if (lead.admissionCounsellorId) {
        await tx.counsellorPerformance.updateMany({
          where: isSystem
            ? { counsellorId: lead.admissionCounsellorId, month, year, systemAssignedLeads: { gt: 0 } }
            : { counsellorId: lead.admissionCounsellorId, month, year, ownGeneratedLeads:   { gt: 0 } },
          data: isSystem
            ? { systemAssignedLeads: { decrement: 1 } }
            : { ownGeneratedLeads:   { decrement: 1 } },
        });
      }

      if (lead.admissionConsultantId) {
        await tx.consultantPerformance.updateMany({
          where: isSystem
            ? { consultantId: lead.admissionConsultantId, month, year, systemAssignedLeads: { gt: 0 } }
            : { consultantId: lead.admissionConsultantId, month, year, ownGeneratedLeads:   { gt: 0 } },
          data: isSystem
            ? { systemAssignedLeads: { decrement: 1 } }
            : { ownGeneratedLeads:   { decrement: 1 } },
        });
      }

      // ── 2. Collect linked StudentAdmissionApplication IDs ─────────────────
      const apps = await tx.studentAdmissionApplication.findMany({
        where:  { enquiryId: leadId },
        select: { id: true },
      });
      const appIds = apps.map((a) => a.id);

      if (appIds.length > 0) {
        // ── 3. Finance / payment chain ───────────────────────────────────────
        // Receipts reference PaymentTransactions (required FK), so delete first
        await tx.receipt.deleteMany({
          where: { paymentTransaction: { studentAdmissionApplicationId: { in: appIds } } },
        });
        await tx.paymentTransaction.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });
        // ApplicationFee and RegistrationFee reference Invoice (required FK), delete before Invoice
        await tx.applicationFee.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });
        await tx.invoice.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });

        // ── 4. Document verification chain ───────────────────────────────────
        // VerificationItems reference DocumentVerification (required FK), delete first
        await tx.verificationItem.deleteMany({
          where: { verification: { studentAdmissionApplicationId: { in: appIds } } },
        });
        await tx.documentVerification.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });

        // ── 5. Remaining application children ────────────────────────────────
        await tx.entranceExam.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });
        await tx.studentAdmissionUndertaking.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });
        await tx.programChangeHistory.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });
        await tx.studentEducationDetails.deleteMany({
          where: { studentAdmissionApplicationId: { in: appIds } },
        });
      }

      // ── 6. Applicants reference both enquiryId and studentAdmissionApplicationId ──
      await tx.applicant.deleteMany({ where: { enquiryId: leadId } });

      // ── 7. Now safe to delete the StudentAdmissionApplications ───────────
      await tx.studentAdmissionApplication.deleteMany({ where: { enquiryId: leadId } });

      // ── 8. Call logs ──────────────────────────────────────────────────────
      await tx.counsellorCallLog.deleteMany({ where: { enquiryId: leadId } });
      await tx.consultantCallLog.deleteMany({ where: { enquiryId: leadId } });

      // ── 9. Finally delete the EnquiryForm ────────────────────────────────
      await tx.enquiryForm.delete({ where: { id: leadId } });
    });

    res.status(200).json({
      message:           'Lead deleted successfully.',
      deletedLeadId:     lead.id,
      studentName:       `${lead.firstName} ${lead.lastName}`,
      counsellorUpdated: !!lead.admissionCounsellorId,
      counsellorName:    lead.admissionCounsellors
        ? `${lead.admissionCounsellors.firstName} ${lead.admissionCounsellors.lastName}`
        : null,
      consultantUpdated: !!lead.admissionConsultantId,
      consultantName:    lead.admissionConsultants
        ? `${lead.admissionConsultants.firstName} ${lead.admissionConsultants.lastName}`
        : null,
    });
  } catch (error) {
    next(error);
  }
};
