import type { NextFunction, Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../../config/database';

// ─── Prisma selects ───────────────────────────────────────────────────────────

const ENQUIRY_SELECT = {
  id:                    true,
  institutionId:         true,
  firstName:             true,
  lastName:              true,
  email:                 true,
  mobileNo:              true,
  admissionCounsellorId: true,   // needed to detect the previous assignment
} satisfies Prisma.EnquiryFormSelect;

const COUNSELLOR_SELECT = {
  id:            true,
  empId:         true,
  firstName:     true,
  lastName:      true,
  email:         true,
  mobileNo:      true,
  designation:   true,
  institutionId: true,
  isActive:      true,
} satisfies Prisma.AdmissionCounsellorSelect;

// ─── PUT /api/leads/change-counsellor ─────────────────────────────────────────
//
// Changes the admissionCounsellor on the EnquiryForm (lead) and propagates the
// change to every linked StudentAdmissionApplication.  Also keeps the monthly
// CounsellorPerformance.systemAssignedLeads counters in sync.

export const changeCounsellor = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const enquiryFormId =
      typeof body.enquiryFormId === 'string'
        ? body.enquiryFormId.trim()
        : '';

    const admissionCounsellorId =
      typeof body.admissionCounsellorId === 'string'
        ? body.admissionCounsellorId.trim()
        : '';

    // ── Required field validation ─────────────────────────────────────────
    if (!enquiryFormId) {
      res.status(400).json({ error: 'enquiryFormId is required.' });
      return;
    }
    if (!admissionCounsellorId) {
      res.status(400).json({ error: 'admissionCounsellorId is required.' });
      return;
    }

    // ── Batch fetch enquiry form and counsellor ───────────────────────────
    const [enquiry, counsellor] = await Promise.all([
      prisma.enquiryForm.findUnique({
        where:  { id: enquiryFormId },
        select: ENQUIRY_SELECT,
      }),
      prisma.admissionCounsellor.findUnique({
        where:  { id: admissionCounsellorId },
        select: COUNSELLOR_SELECT,
      }),
    ]);

    // ── Validate enquiry form ─────────────────────────────────────────────
    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry form (lead) not found.' });
      return;
    }

    // ── Validate counsellor ───────────────────────────────────────────────
    if (!counsellor) {
      res.status(404).json({ error: 'Admission counsellor not found.' });
      return;
    }
    if (!counsellor.isActive) {
      res.status(400).json({ error: 'Cannot assign an inactive counsellor.' });
      return;
    }
    if (counsellor.institutionId !== enquiry.institutionId) {
      res.status(400).json({
        error: 'Counsellor does not belong to the same institution as the lead.',
      });
      return;
    }

    // ── Guard: same counsellor already assigned ───────────────────────────
    const oldCounsellorId = enquiry.admissionCounsellorId ?? null;

    if (oldCounsellorId === admissionCounsellorId) {
      res.status(200).json({
        message: 'Counsellor is already assigned to this lead. No changes made.',
        enquiryFormId: enquiry.id,
        assignedCounsellor: {
          id:          counsellor.id,
          empId:       counsellor.empId,
          firstName:   counsellor.firstName,
          lastName:    counsellor.lastName,
          fullName:    `${counsellor.firstName} ${counsellor.lastName}`,
          email:       counsellor.email,
          mobileNo:    counsellor.mobileNo,
          designation: counsellor.designation,
        },
      });
      return;
    }

    // ── Current tracking period ───────────────────────────────────────────
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const { institutionId } = enquiry;

    // ── Transactional update ──────────────────────────────────────────────
    const updatedEnquiry = await prisma.$transaction(async (tx) => {
      // 1. Reassign counsellor on the enquiry form (lead)
      const lead = await tx.enquiryForm.update({
        where:  { id: enquiryFormId },
        data:   { admissionCounsellorId },
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          email:     true,
          mobileNo:  true,
          admissionCounsellors: {
            select: {
              id:          true,
              empId:       true,
              firstName:   true,
              lastName:    true,
              email:       true,
              mobileNo:    true,
              designation: true,
            },
          },
        },
      });

      // 2. Propagate the new counsellor to all linked StudentAdmissionApplications
      await tx.studentAdmissionApplication.updateMany({
        where: { enquiryId: enquiryFormId },
        data:  { admissionCounsellorId },
      });

      // 3. Decrement old counsellor (safe — never goes below 0)
      if (oldCounsellorId) {
        await tx.counsellorPerformance.updateMany({
          where: {
            counsellorId:        oldCounsellorId,
            month,
            year,
            systemAssignedLeads: { gt: 0 },
          },
          data: { systemAssignedLeads: { decrement: 1 } },
        });
      }

      // 4. Increment new counsellor (upsert — creates row if first lead this month)
      await tx.counsellorPerformance.upsert({
        where: {
          counsellorId_month_year: { counsellorId: admissionCounsellorId, month, year },
        },
        create: {
          institutionId,
          counsellorId: admissionCounsellorId,
          month,
          year,
          systemAssignedLeads: 1,
        },
        update: { systemAssignedLeads: { increment: 1 } },
      });

      return lead;
    });

    const ac = updatedEnquiry.admissionCounsellors;

    res.status(200).json({
      message:       'Counsellor assigned successfully.',
      enquiryFormId: updatedEnquiry.id,
      lead: {
        id:        updatedEnquiry.id,
        firstName: updatedEnquiry.firstName,
        lastName:  updatedEnquiry.lastName,
        fullName:  `${updatedEnquiry.firstName} ${updatedEnquiry.lastName}`,
        email:     updatedEnquiry.email,
        mobileNo:  updatedEnquiry.mobileNo,
      },
      assignedCounsellor: ac
        ? {
            id:          ac.id,
            empId:       ac.empId,
            firstName:   ac.firstName,
            lastName:    ac.lastName,
            fullName:    `${ac.firstName} ${ac.lastName}`,
            email:       ac.email,
            mobileNo:    ac.mobileNo,
            designation: ac.designation,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
};
