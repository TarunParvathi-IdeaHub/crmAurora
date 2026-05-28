import type { NextFunction, Request, Response } from 'express';
import { Prisma, UndertakingStatus } from '@prisma/client';
import prisma from '../../config/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toFloat = (value: unknown): number | undefined => {
  if (typeof value === 'number' && isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return isFinite(n) ? n : undefined;
  }
  return undefined;
};

// ─── POST /api/student-undertakings/accept ────────────────────────────────────
export const acceptStudentUndertaking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const studentAdmissionApplicationId = normalizeString(body.studentAdmissionApplicationId);
    const templateId                    = normalizeString(body.templateId);
    const studentDelaration             = normalizeString(body.studentDelaration);
    const tuitionFee                    = toFloat(body.tuitionFee);
    const admissionFee                  = toFloat(body.admissionFee);
    const specialFee                    = toFloat(body.specialFee);
    const placementTrainingFee          = toFloat(body.placementTrainingFee);
    const ipAddress                     = normalizeString(body.ipAddress) || undefined;
    const userAgent                     = normalizeString(body.userAgent) || undefined;

    // ── Required field validation ───────────────────────────────────────────
    if (!studentAdmissionApplicationId) {
      res.status(400).json({ error: 'studentAdmissionApplicationId is required.' });
      return;
    }
    if (!templateId) {
      res.status(400).json({ error: 'templateId is required.' });
      return;
    }
    if (!studentDelaration) {
      res.status(400).json({ error: 'studentDelaration is required.' });
      return;
    }

    // ── Batch fetch: application, template, existing undertaking ────────────
    const [application, template, existingUndertaking] = await Promise.all([
      prisma.studentAdmissionApplication.findUnique({
        where: { id: studentAdmissionApplicationId },
        select: {
          id: true,
          institutionId: true,
          programId: true,
          applicationNumber: true,
          firstName: true,
          lastName: true,
          program: { select: { id: true, programName: true } },
        },
      }),
      prisma.studentAdmissionUndertakingTemplate.findUnique({
        where: { id: templateId },
        select: {
          id: true,
          institutionId: true,
          programId: true,
          content: true,
          isActive: true,
          title: true,
          version: true,
        },
      }),
      prisma.studentAdmissionUndertaking.findUnique({
        where: { studentAdmissionApplicationId },
        select: { id: true, status: true, isLocked: true },
      }),
    ]);

    // ── Validate application ────────────────────────────────────────────────
    if (!application) {
      res.status(404).json({ error: 'Student application not found.' });
      return;
    }
    if (!application.applicationNumber) {
      res.status(400).json({ error: 'Application number has not been assigned to this application yet.' });
      return;
    }

    // ── Validate template ───────────────────────────────────────────────────
    if (!template) {
      res.status(404).json({ error: 'Undertaking template not found.' });
      return;
    }
    if (!template.isActive) {
      res.status(400).json({ error: 'Undertaking template is not active.' });
      return;
    }

    // ── Cross-validate institution and program ──────────────────────────────
    if (template.institutionId !== application.institutionId) {
      res.status(400).json({
        error: 'Template does not belong to the same institution as the application.',
      });
      return;
    }
    if (template.programId !== application.programId) {
      res.status(400).json({
        error: 'Template does not belong to the same program as the application.',
      });
      return;
    }

    // ── Check existing undertaking ──────────────────────────────────────────
    if (existingUndertaking) {
      if (
        existingUndertaking.status === UndertakingStatus.ACCEPTED ||
        existingUndertaking.isLocked
      ) {
        res.status(409).json({
          error: 'An accepted and locked undertaking already exists for this application.',
        });
        return;
      }
      if (existingUndertaking.status === UndertakingStatus.PENDING) {
        res.status(409).json({
          error: 'An undertaking is already submitted and pending review for this application.',
        });
        return;
      }
      // REJECTED → resubmission allowed; old record deleted inside the transaction
    }

    // ── Build denormalised fields ───────────────────────────────────────────
    const nameOfTheStudent   = `${application.firstName} ${application.lastName}`.trim();
    const programEnrolling   = application.program.programName;
    // Snapshot: captured at this moment so future template edits don't alter history
    const acceptedContentSnapshot = template.content;

    // ── Transactional write ─────────────────────────────────────────────────
    const undertaking = await prisma.$transaction(async (tx) => {
      // Delete the previously REJECTED undertaking before creating a fresh one
      if (existingUndertaking?.status === UndertakingStatus.REJECTED) {
        await tx.studentAdmissionUndertaking.delete({
          where: { id: existingUndertaking.id },
        });
      }

      return tx.studentAdmissionUndertaking.create({
        data: {
          institutionId:                application.institutionId,
          studentAdmissionApplicationId,
          applicationNumber:            application.applicationNumber!,
          nameOfTheStudent,
          programId:                    application.programId,
          programEnrolling,
          studentDelaration,
          templateId,
          acceptedContent:              acceptedContentSnapshot as unknown as Prisma.InputJsonValue,
          tuitionFee,
          admissionFee,
          specialFee,
          placementTrainingFee,
          studentAccepted:              true,
          studentAcceptedAt:            new Date(),
          status:                       UndertakingStatus.ACCEPTED,
          ipAddress,
          userAgent,
          isLocked:                     true,
        },
        select: {
          id: true,
          applicationNumber: true,
          nameOfTheStudent: true,
          programEnrolling: true,
          studentDelaration: true,
          acceptedContent: true,
          tuitionFee: true,
          admissionFee: true,
          specialFee: true,
          placementTrainingFee: true,
          studentAccepted: true,
          studentAcceptedAt: true,
          status: true,
          isLocked: true,
          ipAddress: true,
          createdAt: true,
          institution: { select: { id: true, institutionName: true } },
          program: { select: { id: true, programName: true, programSname: true } },
          template: { select: { id: true, title: true, version: true } },
          studentAdmissionApplication: {
            select: { id: true, applicationNumber: true, firstName: true, lastName: true, email: true },
          },
        },
      });
    });

    res.status(201).json({ undertaking });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/student-undertakings/:studentAdmissionApplicationId ─────────────
export const getStudentUndertaking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentAdmissionApplicationId = req.params.studentAdmissionApplicationId as string;

    if (!studentAdmissionApplicationId?.trim()) {
      res.status(400).json({ error: 'studentAdmissionApplicationId param is required.' });
      return;
    }

    const undertaking = await prisma.studentAdmissionUndertaking.findUnique({
      where: { studentAdmissionApplicationId },
      select: {
        id: true,
        applicationNumber: true,
        nameOfTheStudent: true,
        programEnrolling: true,
        studentDelaration: true,
        acceptedContent: true,
        tuitionFee: true,
        admissionFee: true,
        specialFee: true,
        placementTrainingFee: true,
        studentAccepted: true,
        studentAcceptedAt: true,
        status: true,
        isLocked: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
        institution: { select: { id: true, institutionName: true } },
        program: { select: { id: true, programName: true, programSname: true } },
        template: {
          select: {
            id: true,
            title: true,
            version: true,
            description: true,
            publishedAt: true,
          },
        },
        studentAdmissionApplication: {
          select: {
            id: true,
            applicationNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            mobileNo: true,
          },
        },
      },
    });

    if (!undertaking) {
      res.status(404).json({ error: 'No undertaking found for this application.' });
      return;
    }

    res.status(200).json({ undertaking });
  } catch (error) {
    next(error);
  }
};
