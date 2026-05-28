import type { NextFunction, Response } from 'express';
import { ApplicationStatus } from '@prisma/client';
import type { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

const SUBMITTABLE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPLICATION_FEE_PAID,
  ApplicationStatus.SAVED_AS_DRAFT,
];

export async function submitApplication(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const applicationId = (req.params.applicationId as string)?.trim();

    if (!applicationId) {
      res.status(400).json({ error: 'applicationId is required.' });
      return;
    }

    const { consentDeclaration } = req.body as { consentDeclaration?: string };

    if (!consentDeclaration || consentDeclaration.trim().length === 0) {
      res.status(400).json({ error: 'consentDeclaration is required to submit the application.' });
      return;
    }

    const application = await prisma.studentAdmissionApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        applicationStatus: true,
        applicationNumber: true,
        firstName: true,
        lastName: true,
        applicants: { select: { userId: true } },
      },
    });

    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    const userId = req.user?.userId;
    const isOwner = application.applicants.some((a) => a.userId === userId);

    if (!isOwner) {
      res.status(403).json({ error: 'You are not authorised to submit this application.' });
      return;
    }

    if (!SUBMITTABLE_STATUSES.includes(application.applicationStatus)) {
      res.status(409).json({
        error: `Application cannot be submitted from status "${application.applicationStatus}".`,
        currentStatus: application.applicationStatus,
      });
      return;
    }

    const updated = await prisma.studentAdmissionApplication.update({
      where: { id: applicationId },
      data: {
        applicationStatus: ApplicationStatus.APPLICATION_SUBMITTED,
        consentDeclaration: consentDeclaration.trim(),
      },
      select: {
        id: true,
        applicationNumber: true,
        applicationStatus: true,
        firstName: true,
        lastName: true,
      },
    });

    res.status(200).json({
      message: 'Application submitted successfully.',
      application: updated,
    });
  } catch (error) {
    next(error);
  }
}
