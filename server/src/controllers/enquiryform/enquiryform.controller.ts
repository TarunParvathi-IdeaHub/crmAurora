import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import prisma from '../../config/database';
import { stat } from 'fs';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const NAME_RE = /^[A-Za-z\s]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MOBILE_RE = /^[6-9]\d{9}$/;

const getEnquiryFormPayload = (body: Record<string, unknown>) => ({
  id: normalizeString(body.id),
  firstName: normalizeString(body.firstName),
  lastName: normalizeString(body.lastName),
  mobileNo: normalizeString(body.mobileNo),
  email: normalizeString(body.email),
  state: normalizeString(body.state),
  institutionId: normalizeString(body.institutionId),
  levelId: normalizeString(body.levelId),
  programId: normalizeString(body.programId),
  admissionCycleId: normalizeString(body.admissionCycleId),
});

const validateCreatePayload = (payload: ReturnType<typeof getEnquiryFormPayload>) => {
  if (!payload.firstName) return 'First name is required.';
  if (!payload.lastName) return 'Last name is required.';
  if (!payload.mobileNo) return 'Mobile number is required.';
  if (!payload.email) return 'Email is required.';
  if (!payload.state) return 'State is required.';
  if (!payload.institutionId) return 'Institution ID is required.';
  if (!payload.levelId) return 'Degree level ID is required.';
  if (!payload.programId) return 'Program ID is required.';
  if (!payload.admissionCycleId) return 'Admission cycle ID is required.';
  if (!NAME_RE.test(payload.firstName)) return 'First name should contain only letters and spaces.';
  if (!NAME_RE.test(payload.lastName)) return 'Last name should contain only letters and spaces.';
  if (!MOBILE_RE.test(payload.mobileNo)) return 'Mobile number must be a 10-digit number starting with 6-9.';
  if (!GMAIL_RE.test(payload.email)) return 'Email must be a valid Gmail address.';
  return null;
};

const validateUpdatePayload = (payload: ReturnType<typeof getEnquiryFormPayload>) => {
  if (!payload.id) return 'Enquiry form ID is required.';
  return validateCreatePayload(payload);
};

const buildEnquiryFormWhere = (body: Record<string, unknown>) => {
  const payload = getEnquiryFormPayload(body);

  return {
    ...(payload.id ? { id: payload.id } : {}),
    ...(payload.firstName ? { firstName: payload.firstName } : {}),
    ...(payload.lastName ? { lastName: payload.lastName } : {}),
    ...(payload.mobileNo ? { mobileNo: payload.mobileNo } : {}),
    ...(payload.email ? { email: payload.email } : {}),
    ...(payload.state ? { state: payload.state } : {}),
    ...(payload.institutionId ? { institutionId: payload.institutionId } : {}),
    ...(payload.levelId ? { levelId: payload.levelId } : {}),
    ...(payload.programId ? { programId: payload.programId } : {}),
    ...(payload.admissionCycleId ? { admissionCycleId: payload.admissionCycleId } : {}),
  };
};

const checkReferencesExist = async (
  payload: ReturnType<typeof getEnquiryFormPayload>
): Promise<string | null> => {
  const [institution, degreeLevel, program, admissionCycle] =
    await Promise.all([
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
        select: { id: true },
      }),
      prisma.admissionCycle.findUnique({
        where: { id: payload.admissionCycleId },
        select: { id: true },
      }),
    ]);

  if (!institution) return 'Institution not found.';
  if (!degreeLevel) return 'Degree level not found.';
  if (!program) return 'Program not found.';
  if (!admissionCycle) return 'Admission cycle not found.';

  return null;
};

const includeRelations = {
  institution: true,
  degreeLevel: true,
  program: true,
  admissionCycle: true,
};


async function sendApplicantWelcomeMail(params: {
  toEmail: string;
  firstName: string;
  lastName: string;
  userId: string;
  plainPassword: string;
  applicationId: string;
  institutionName: string;
  programName: string;
}): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT ?? 587),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME ?? 'Admissions Team'}" <${process.env.MAIL_USER}>`,
      to: params.toEmail,
      subject: 'Your Admission Application – Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome, ${params.firstName} ${params.lastName}!</h2>
          <p>Your admission application has been registered at <strong>${params.institutionName}</strong>.</p>
          <table cellpadding="8" style="border-collapse: collapse; width: 100%; max-width: 480px;">
            <tr>
              <td style="font-weight:bold; border: 1px solid #ddd;">Programme</td>
              <td style="border: 1px solid #ddd;">${params.programName}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; border: 1px solid #ddd;">User ID</td>
              <td style="border: 1px solid #ddd;">${params.userId}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; border: 1px solid #ddd;">Password</td>
              <td style="border: 1px solid #ddd;">${params.plainPassword}</td>
            </tr>
            <tr>
              <td style="font-weight:bold; border: 1px solid #ddd;">Application ID</td>
              <td style="border: 1px solid #ddd;">${params.applicationId}</td>
            </tr>
          </table>
          <p style="margin-top: 16px;">Please log in and complete your application at the earliest.</p>
          <p>Regards,<br /><strong>${params.institutionName} – Admissions Team</strong></p>
        </div>
      `,
    });
  } catch (mailError) {
    // Mail failure must never roll back the main flow
    console.error('[sendApplicantWelcomeMail] Failed to send email:', mailError);
  }
}

// ── POST /api/enquiry-forms/create ──────────────────────────────────────────
// Creates EnquiryForm + User + Applicant + StudentAdmissionApplication in one
// serializable transaction. Automatically assigns the least-loaded active
// counsellor and generates a level-scoped running ID.
// ─────────────────────────────────────────────────────────────────────────────
export const createEnquiryForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const institutionId    = normalizeString(body.institutionId);
    const levelId          = normalizeString(body.degreeLevelId ?? body.levelId);
    const programId        = normalizeString(body.programId);
    const admissionCycleId = normalizeString(body.admissionCycleId);
    const firstName        = normalizeString(body.firstName);
    const lastName         = normalizeString(body.lastName);
    const mobileNo         = normalizeString(body.mobileNo);
    const email            = normalizeString(body.email);
    const state            = normalizeString(body.state);

    // ── Required field validation ─────────────────────────────────────────
    if (!institutionId)    { res.status(400).json({ error: 'institutionId is required.' });    return; }
    if (!levelId)          { res.status(400).json({ error: 'degreeLevelId is required.' });    return; }
    if (!programId)        { res.status(400).json({ error: 'programId is required.' });         return; }
    if (!admissionCycleId) { res.status(400).json({ error: 'admissionCycleId is required.' }); return; }
    if (!firstName)        { res.status(400).json({ error: 'firstName is required.' });         return; }
    if (!lastName)         { res.status(400).json({ error: 'lastName is required.' });          return; }
    if (!mobileNo)         { res.status(400).json({ error: 'mobileNo is required.' });          return; }
    if (!email)            { res.status(400).json({ error: 'email is required.' });              return; }
    if (!state)            { res.status(400).json({ error: 'state is required.' });                return; }

    if (!NAME_RE.test(firstName)) {
      res.status(400).json({ error: 'First name should contain only letters and spaces.' });
      return;
    }
    if (!NAME_RE.test(lastName)) {
      res.status(400).json({ error: 'Last name should contain only letters and spaces.' });
      return;
    }
    if (!MOBILE_RE.test(mobileNo)) {
      res.status(400).json({ error: 'Mobile number must be a 10-digit number starting with 6-9.' });
      return;
    }
    if (!GMAIL_RE.test(email)) {
      res.status(400).json({ error: 'Email must be a valid Gmail address.' });
      return;
    }
    // ── Batch fetch all references in parallel ───────────────────────────
    const [
      institution,
      degreeLevel,
      program,
      admissionCycle,
      existingEnquiry,
      existingUser,
    ] = await Promise.all([
      prisma.institution.findUnique({
        where: { id: institutionId },
        select: { id: true, institutionName: true, institutionArea: true, isActive: true },
      }),
      prisma.degreeLevel.findUnique({
        where: { id: levelId },
        select: { id: true, levelName: true, isActive: true, institutionId: true },
      }),
      prisma.program.findUnique({
        where: { id: programId },
        select: { id: true, programName: true, programSname: true, institutionId: true, levelId: true, isActive: true },
      }),
      prisma.admissionCycle.findUnique({
        where: { id: admissionCycleId },
        select: { id: true, institutionId: true, isActive: true },
      }),
      prisma.enquiryForm.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);

    // ── Entity existence + active checks ────────────────────────────────
    if (!institution)          { res.status(404).json({ error: 'Institution not found.' });          return; }
    if (!institution.isActive) { res.status(400).json({ error: 'Institution is inactive.' });       return; }
    if (!degreeLevel)          { res.status(404).json({ error: 'Degree level not found.' });         return; }
    if (!degreeLevel.isActive) { res.status(400).json({ error: 'Degree level is inactive.' });      return; }
    if (!program)              { res.status(404).json({ error: 'Program not found.' });              return; }
    if (!program.isActive)     { res.status(400).json({ error: 'Program is inactive.' });           return; }
    if (!admissionCycle)       { res.status(404).json({ error: 'Admission cycle not found.' });     return; }
    if (!admissionCycle.isActive) { res.status(400).json({ error: 'Admission cycle is inactive.' }); return; }

    // ── Cross-institution membership checks ──────────────────────────────
    if (degreeLevel.institutionId !== institutionId) {
      res.status(400).json({ error: 'Degree level does not belong to the specified institution.' });
      return;
    }
    if (program.institutionId !== institutionId) {
      res.status(400).json({ error: 'Program does not belong to the specified institution.' });
      return;
    }
    if (program.levelId !== levelId) {
      res.status(400).json({ error: 'Program does not belong to the specified degree level.' });
      return;
    }
    if (admissionCycle.institutionId !== institutionId) {
      res.status(400).json({ error: 'Admission cycle does not belong to the specified institution.' });
      return;
    }

    // ── Email uniqueness checks ──────────────────────────────────────────
    if (existingEnquiry) {
      res.status(409).json({ error: 'An enquiry with this email already exists.' });
      return;
    }
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    // ── Counsellor assignment: find active counsellors ───────────────────
    const activeCounsellors = await prisma.admissionCounsellor.findMany({
      where: { institutionId, isActive: true },
      select: { id: true },
    });

    if (activeCounsellors.length === 0) {
      res.status(422).json({ error: 'No active admission counsellors are available for this institution.' });
      return;
    }

    const counsellorIds = activeCounsellors.map((c) => c.id);
    const now           = new Date();
    const currentMonth  = now.getMonth() + 1;
    const currentYear   = now.getFullYear();

    // Fetch current-month performances for all active counsellors
    const performances = await prisma.counsellorPerformance.findMany({
      where: {
        counsellorId: { in: counsellorIds },
        month: currentMonth,
        year: currentYear,
      },
      select: { counsellorId: true, systemAssignedLeads: true },
    });

    // Build map: counsellorId → systemAssignedLeads (0 if no record yet)
    const performanceMap = new Map<string, number>(
      performances.map((p) => [p.counsellorId, p.systemAssignedLeads])
    );
    const countsArray = counsellorIds.map((id) => ({
      id,
      count: performanceMap.get(id) ?? 0,
    }));

    const minCount          = Math.min(...countsArray.map((c) => c.count));
    const eligibleCounsellors = countsArray.filter((c) => c.count === minCount);
    const assignedCounsellor  =
      eligibleCounsellors[Math.floor(Math.random() * eligibleCounsellors.length)];

    // ── Generate plain password ──────────────────────────────────────────
    const random4       = String(Math.floor(1000 + Math.random() * 9000));
    const plainPassword = `${firstName}@${random4}`;

    // ── ID prefix components ─────────────────────────────────────────────
    const areaLetter  = institution.institutionArea.charAt(0).toUpperCase();
    const idPrefix    = `AU${areaLetter}${currentYear}`; // e.g. UGU2026

    // ── Transactional create (SERIALIZABLE prevents concurrent ID collision)
    const result = await prisma.$transaction(
      async (tx) => {
        // Derive running number from the highest existing User userId (deletion-safe:
        // Applicants are deleted on lead removal but User records are never deleted)
        const latestUser = await tx.user.findFirst({
          where:   { userId: { startsWith: `${idPrefix}-` } },
          orderBy: { userId: 'desc' },
          select:  { userId: true },
        });
        const lastNumber    = latestUser?.userId ? parseInt(latestUser.userId.slice(idPrefix.length + 1), 10) : 0;
        const runningNumber = String(lastNumber + 1).padStart(4, '0');
        const generatedId   = `${idPrefix}-${runningNumber}`; // e.g. AUX2026-0001

        // 1. EnquiryForm
        const enquiryForm = await tx.enquiryForm.create({
          data: {
            firstName,
            lastName,
            mobileNo,
            email,
            state,
            institutionId,
            levelId,
            programId,
            admissionCycleId,
            leadSourceType: 'SYSTEM_ASSIGNED',
            admissionCounsellorId: assignedCounsellor.id,
          },
          select: { id: true },
        });

        // 2. User
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        await tx.user.create({
          data: {
            userId: generatedId,
            email,
            password: hashedPassword,
            role: 'Applicant',
          },
        });

        // 3. StudentAdmissionApplication
        const application = await tx.studentAdmissionApplication.create({
          data: {
            institutionId,
            degreeLevelId: levelId,
            programId,
            admissionCycleId,
            admissionCounsellorId: assignedCounsellor.id,
            enquiryId: enquiryForm.id,
            firstName,
            lastName,
            email,
            mobileNo,
            state,
          },
          select: { id: true, applicationNumber: true },
        });

        // 4. Applicant
        await tx.applicant.create({
          data: {
            firstName,
            lastName,
            mobileNo,
            email,
            role: 'Applicant',
            userId: generatedId,
            institutionId,
            levelId,
            programId,
            admissionCycleId,
            enquiryId: enquiryForm.id,
            studentAdmissionApplicationId: application.id,
          },
        });

        // 5. Upsert CounsellorPerformance – increment systemAssignedLeads
        await tx.counsellorPerformance.upsert({
          where: {
            counsellorId_month_year: {
              counsellorId: assignedCounsellor.id,
              month: currentMonth,
              year: currentYear,
            },
          },
          update: { systemAssignedLeads: { increment: 1 } },
          create: {
            institutionId,
            counsellorId: assignedCounsellor.id,
            month: currentMonth,
            year: currentYear,
            systemAssignedLeads: 1,
          },
        });

        return {
          enquiryFormId: enquiryForm.id,
          applicationId: generatedId,
          applicationDbId: application.id,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // ── Fire-and-forget welcome email (failure must not affect response) ──
    void sendApplicantWelcomeMail({
      toEmail: email,
      firstName,
      lastName,
      userId: result.applicationId,
      plainPassword,
      applicationId: result.applicationId,
      institutionName: institution.institutionName,
      programName: program.programName,
    });

    res.status(201).json({
      message: 'Enquiry form created and application registered successfully.',
      applicationId: result.applicationId,
      userId: result.applicationId,
      enquiryFormId: result.enquiryFormId,
      studentAdmissionApplicationId: result.applicationDbId,
      assignedCounsellorId: assignedCounsellor.id,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A duplicate enquiry form could not be created.',
      });
      return;
    }
    next(error);
  }
};

export const getEnquiryForms = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const where = buildEnquiryFormWhere(req.body as Record<string, unknown>);

    const enquiryForms = await prisma.enquiryForm.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: 'desc' },
      include: includeRelations,
    });

    res.status(200).json({ enquiryForms });
  } catch (error) {
    next(error);
  }
};

export const updateEnquiryForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getEnquiryFormPayload(req.body as Record<string, unknown>);
    const validationError = validateUpdatePayload(payload);

    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existingForm = await prisma.enquiryForm.findUnique({
      where: { id: payload.id },
    });

    if (!existingForm) {
      res.status(404).json({ error: 'Enquiry form not found.' });
      return;
    }

    const referenceError = await checkReferencesExist(payload);
    if (referenceError) {
      res.status(404).json({ error: referenceError });
      return;
    }

    const enquiryForm = await prisma.enquiryForm.update({
      where: { id: payload.id },
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        mobileNo: payload.mobileNo,
        email: payload.email,
        state: payload.state,
        institutionId: payload.institutionId,
        levelId: payload.levelId,
        programId: payload.programId,
        admissionCycleId: payload.admissionCycleId,
      },
      include: includeRelations,
    });

    res.status(200).json({
      message: 'Enquiry form updated successfully.',
      enquiryForm,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'A duplicate enquiry form update could not be applied.',
      });
      return;
    }

    next(error);
  }
};

export const deleteEnquiryForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payload = getEnquiryFormPayload(req.body as Record<string, unknown>);

    if (!payload.id) {
      res.status(400).json({ error: 'Enquiry form ID is required.' });
      return;
    }

    const existingForm = await prisma.enquiryForm.findUnique({
      where: { id: payload.id },
    });

    if (!existingForm) {
      res.status(404).json({ error: 'Enquiry form not found.' });
      return;
    }

    await prisma.enquiryForm.delete({
      where: { id: payload.id },
    });

    res.status(200).json({ message: 'Enquiry form deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
