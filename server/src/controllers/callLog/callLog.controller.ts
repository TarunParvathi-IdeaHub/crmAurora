import type { NextFunction, Request, Response } from 'express';
import { CallType, CallStatus } from '@prisma/client';
import prisma from '../../config/database';

// ── String normalizer ─────────────────────────────────────────────────────────

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

// ── Enum guards ───────────────────────────────────────────────────────────────

const VALID_CALL_TYPES = new Set<string>(Object.values(CallType));
const VALID_CALL_STATUSES = new Set<string>(Object.values(CallStatus));

function isValidCallType(value: string): value is CallType {
  return VALID_CALL_TYPES.has(value);
}

function isValidCallStatus(value: string): value is CallStatus {
  return VALID_CALL_STATUSES.has(value);
}

// ── Shared input shape ────────────────────────────────────────────────────────

interface BaseCallLogData {
  enquiryId: string;
  callType: CallType;
  callStatus: CallStatus;
  callResponse: string;
  notes: string | null;
  callTime: Date;
  nextFollowUp: Date | null;
}

type ParseResult =
  | { ok: true; data: BaseCallLogData }
  | { ok: false; status: number; error: string };

// ── Shared input parser / validator ──────────────────────────────────────────

function parseBaseCallLogInput(body: Record<string, unknown>): ParseResult {
  const enquiryId = normalizeString(body.enquiryId);
  const callTypeRaw = normalizeString(body.callType);
  const callStatusRaw = normalizeString(body.callStatus);
  const callResponse = normalizeString(body.callResponse);
  const callTimeRaw = body.callTime;
  const nextFollowUpRaw = body.nextFollowUp;
  const notesRaw = body.notes;

  if (!enquiryId) return { ok: false, status: 400, error: 'enquiryId is required.' };

  if (!callTypeRaw) return { ok: false, status: 400, error: 'callType is required.' };
  if (!isValidCallType(callTypeRaw)) {
    return {
      ok: false,
      status: 400,
      error: `callType must be one of: ${Object.values(CallType).join(', ')}.`,
    };
  }

  if (!callStatusRaw) return { ok: false, status: 400, error: 'callStatus is required.' };
  if (!isValidCallStatus(callStatusRaw)) {
    return {
      ok: false,
      status: 400,
      error: `callStatus must be one of: ${Object.values(CallStatus).join(', ')}.`,
    };
  }

  if (!callResponse) return { ok: false, status: 400, error: 'callResponse is required.' };

  if (!callTimeRaw) return { ok: false, status: 400, error: 'callTime is required.' };
  const callTime = new Date(callTimeRaw as string);
  if (isNaN(callTime.getTime())) {
    return { ok: false, status: 400, error: 'callTime must be a valid ISO date string.' };
  }

  let nextFollowUp: Date | null = null;
  if (nextFollowUpRaw !== undefined && nextFollowUpRaw !== null && nextFollowUpRaw !== '') {
    nextFollowUp = new Date(nextFollowUpRaw as string);
    if (isNaN(nextFollowUp.getTime())) {
      return { ok: false, status: 400, error: 'nextFollowUp must be a valid ISO date string.' };
    }
  }

  const notes =
    typeof notesRaw === 'string' && notesRaw.trim().length > 0 ? notesRaw.trim() : null;

  return {
    ok: true,
    data: {
      enquiryId,
      callType: callTypeRaw,
      callStatus: callStatusRaw,
      callResponse,
      notes,
      callTime,
      nextFollowUp,
    },
  };
}

// ── Response mappers ──────────────────────────────────────────────────────────

function mapCounsellorCallLogResponse(log: {
  id: string;
  enquiryId: string;
  counsellorId: string;
  callType: CallType;
  callStatus: CallStatus;
  callResponse: string;
  notes: string | null;
  callTime: Date;
  nextFollowUp: Date | null;
  createdAt: Date;
  enquiry: {
    firstName: string;
    lastName: string;
    mobileNo?: string;
    email?: string;
    degreeLevel?: { levelName: string };
  };
  counsellor: { firstName: string; lastName: string };
}) {
  return {
    id: log.id,
    enquiryId: log.enquiryId,
    counsellorId: log.counsellorId,
    callType: log.callType,
    callStatus: log.callStatus,
    callResponse: log.callResponse,
    notes: log.notes,
    callTime: log.callTime,
    nextFollowUp: log.nextFollowUp,
    createdAt: log.createdAt,
    applicantName: `${log.enquiry.firstName} ${log.enquiry.lastName}`,
    ...(log.enquiry.mobileNo !== undefined && { applicantMobileNo: log.enquiry.mobileNo }),
    ...(log.enquiry.email !== undefined && { applicantEmail: log.enquiry.email }),
    ...(log.enquiry.degreeLevel !== undefined && {
      applicantStudyLevel: log.enquiry.degreeLevel.levelName,
    }),
    counsellorName: `${log.counsellor.firstName} ${log.counsellor.lastName}`,
  };
}

function mapConsultantCallLogResponse(log: {
  id: string;
  enquiryId: string;
  consultantId: string;
  callType: CallType;
  callStatus: CallStatus;
  callResponse: string;
  notes: string | null;
  callTime: Date;
  nextFollowUp: Date | null;
  createdAt: Date;
  enquiry: {
    firstName: string;
    lastName: string;
    mobileNo?: string;
    email?: string;
    degreeLevel?: { levelName: string };
  };
  consultant: { firstName: string; lastName: string };
}) {
  return {
    id: log.id,
    enquiryId: log.enquiryId,
    consultantId: log.consultantId,
    callType: log.callType,
    callStatus: log.callStatus,
    callResponse: log.callResponse,
    notes: log.notes,
    callTime: log.callTime,
    nextFollowUp: log.nextFollowUp,
    createdAt: log.createdAt,
    applicantName: `${log.enquiry.firstName} ${log.enquiry.lastName}`,
    ...(log.enquiry.mobileNo !== undefined && { applicantMobileNo: log.enquiry.mobileNo }),
    ...(log.enquiry.email !== undefined && { applicantEmail: log.enquiry.email }),
    ...(log.enquiry.degreeLevel !== undefined && {
      applicantStudyLevel: log.enquiry.degreeLevel.levelName,
    }),
    consultantName: `${log.consultant.firstName} ${log.consultant.lastName}`,
  };
}

// ── POST /api/call-logs/admissionCounsellor/create ───────────────────────────

export const createCounsellorCallLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const counsellorId = normalizeString(body.counsellorId);
    if (!counsellorId) {
      res.status(400).json({ error: 'counsellorId is required.' });
      return;
    }

    const parsed = parseBaseCallLogInput(body);
    if (!parsed.ok) {
      res.status(parsed.status).json({ error: parsed.error });
      return;
    }
    const { data } = parsed;

    const [enquiry, counsellor] = await Promise.all([
      prisma.enquiryForm.findUnique({
        where: { id: data.enquiryId },
        select: { id: true, firstName: true, lastName: true, admissionCounsellorId: true },
      }),
      prisma.admissionCounsellor.findUnique({
        where: { id: counsellorId },
        select: { id: true, firstName: true, lastName: true, isActive: true },
      }),
    ]);

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    if (!counsellor) {
      res.status(404).json({ error: 'Counsellor not found.' });
      return;
    }
    if (!counsellor.isActive) {
      res.status(400).json({ error: 'Counsellor is not active.' });
      return;
    }
    if (enquiry.admissionCounsellorId !== counsellorId) {
      res.status(400).json({
        error: 'This enquiry is not assigned to the specified counsellor.',
      });
      return;
    }

    const log = await prisma.counsellorCallLog.create({
      data: {
        enquiryId: data.enquiryId,
        counsellorId,
        callType: data.callType,
        callStatus: data.callStatus,
        callResponse: data.callResponse,
        notes: data.notes,
        callTime: data.callTime,
        nextFollowUp: data.nextFollowUp,
      },
      select: {
        id: true,
        enquiryId: true,
        counsellorId: true,
        callType: true,
        callStatus: true,
        callResponse: true,
        notes: true,
        callTime: true,
        nextFollowUp: true,
        createdAt: true,
        enquiry: { select: { firstName: true, lastName: true } },
        counsellor: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json({
      message: 'Counsellor call log created successfully.',
      callLog: mapCounsellorCallLogResponse(log),
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/call-logs/admissionConsultant/create ───────────────────────────

export const createConsultantCallLog = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const consultantId = normalizeString(body.consultantId);
    if (!consultantId) {
      res.status(400).json({ error: 'consultantId is required.' });
      return;
    }

    const parsed = parseBaseCallLogInput(body);
    if (!parsed.ok) {
      res.status(parsed.status).json({ error: parsed.error });
      return;
    }
    const { data } = parsed;

    const [enquiry, consultant] = await Promise.all([
      prisma.enquiryForm.findUnique({
        where: { id: data.enquiryId },
        select: { id: true, firstName: true, lastName: true, admissionConsultantId: true },
      }),
      prisma.admissionConsultant.findUnique({
        where: { id: consultantId },
        select: { id: true, firstName: true, lastName: true, isActive: true },
      }),
    ]);

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    if (!consultant) {
      res.status(404).json({ error: 'Consultant not found.' });
      return;
    }
    if (!consultant.isActive) {
      res.status(400).json({ error: 'Consultant is not active.' });
      return;
    }
    if (enquiry.admissionConsultantId !== consultantId) {
      res.status(400).json({
        error: 'This enquiry is not assigned to the specified consultant.',
      });
      return;
    }

    const log = await prisma.consultantCallLog.create({
      data: {
        enquiryId: data.enquiryId,
        consultantId,
        callType: data.callType,
        callStatus: data.callStatus,
        callResponse: data.callResponse,
        notes: data.notes,
        callTime: data.callTime,
        nextFollowUp: data.nextFollowUp,
      },
      select: {
        id: true,
        enquiryId: true,
        consultantId: true,
        callType: true,
        callStatus: true,
        callResponse: true,
        notes: true,
        callTime: true,
        nextFollowUp: true,
        createdAt: true,
        enquiry: { select: { firstName: true, lastName: true } },
        consultant: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(201).json({
      message: 'Consultant call log created successfully.',
      callLog: mapConsultantCallLogResponse(log),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/call-logs/get/counsellor/:counsellorId/:enquiryId ───────────────

export const getCounsellorCallLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const counsellorId = normalizeString(req.params.counsellorId);
    const enquiryId = normalizeString(req.params.enquiryId);

    if (!counsellorId) {
      res.status(400).json({ error: 'counsellorId is required.' });
      return;
    }
    if (!enquiryId) {
      res.status(400).json({ error: 'enquiryId is required.' });
      return;
    }

    const [enquiry, counsellor] = await Promise.all([
      prisma.enquiryForm.findUnique({
        where: { id: enquiryId },
        select: { id: true },
      }),
      prisma.admissionCounsellor.findUnique({
        where: { id: counsellorId },
        select: { id: true },
      }),
    ]);

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    if (!counsellor) {
      res.status(404).json({ error: 'Counsellor not found.' });
      return;
    }

    const logs = await prisma.counsellorCallLog.findMany({
      where: { counsellorId, enquiryId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        enquiryId: true,
        counsellorId: true,
        callType: true,
        callStatus: true,
        callResponse: true,
        notes: true,
        callTime: true,
        nextFollowUp: true,
        createdAt: true,
        enquiry: { select: { firstName: true, lastName: true, mobileNo: true } },
        counsellor: { select: { firstName: true, lastName: true } },
      },
    });

    if (logs.length === 0) {
      res.status(404).json({
        error: 'No call logs found for the specified counsellor and enquiry.',
      });
      return;
    }

    res.status(200).json({
      total: logs.length,
      callLogs: logs.map(mapCounsellorCallLogResponse),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/call-logs/get/consultant/:consultantId/:enquiryId ───────────────

export const getConsultantCallLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const consultantId = normalizeString(req.params.consultantId);
    const enquiryId = normalizeString(req.params.enquiryId);

    if (!consultantId) {
      res.status(400).json({ error: 'consultantId is required.' });
      return;
    }
    if (!enquiryId) {
      res.status(400).json({ error: 'enquiryId is required.' });
      return;
    }

    const [enquiry, consultant] = await Promise.all([
      prisma.enquiryForm.findUnique({
        where: { id: enquiryId },
        select: { id: true },
      }),
      prisma.admissionConsultant.findUnique({
        where: { id: consultantId },
        select: { id: true },
      }),
    ]);

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }
    if (!consultant) {
      res.status(404).json({ error: 'Consultant not found.' });
      return;
    }

    const logs = await prisma.consultantCallLog.findMany({
      where: { consultantId, enquiryId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        enquiryId: true,
        consultantId: true,
        callType: true,
        callStatus: true,
        callResponse: true,
        notes: true,
        callTime: true,
        nextFollowUp: true,
        createdAt: true,
        enquiry: { select: { firstName: true, lastName: true, mobileNo: true } },
        consultant: { select: { firstName: true, lastName: true } },
      },
    });

    if (logs.length === 0) {
      res.status(404).json({
        error: 'No call logs found for the specified consultant and enquiry.',
      });
      return;
    }

    res.status(200).json({
      total: logs.length,
      callLogs: logs.map(mapConsultantCallLogResponse),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/call-logs/counsellor/all/:counsellorId ──────────────────────────

export const getAllCounsellorCallLogs = async (
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
      select: { id: true },
    });
    if (!counsellor) {
      res.status(404).json({ error: 'Counsellor not found.' });
      return;
    }

    const logs = await prisma.counsellorCallLog.findMany({
      where: { counsellorId },
      orderBy: { callTime: 'desc' },
      select: {
        id: true,
        enquiryId: true,
        counsellorId: true,
        callType: true,
        callStatus: true,
        callResponse: true,
        notes: true,
        callTime: true,
        nextFollowUp: true,
        createdAt: true,
        enquiry: {
          select: {
            firstName: true,
            lastName: true,
            mobileNo: true,
            email: true,
            degreeLevel: { select: { levelName: true } },
          },
        },
        counsellor: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(200).json({
      total: logs.length,
      callLogs: logs.map(mapCounsellorCallLogResponse),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/call-logs/consultant/all/:consultantId ──────────────────────────

export const getAllConsultantCallLogs = async (
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
      select: { id: true },
    });
    if (!consultant) {
      res.status(404).json({ error: 'Consultant not found.' });
      return;
    }

    const logs = await prisma.consultantCallLog.findMany({
      where: { consultantId },
      orderBy: { callTime: 'desc' },
      select: {
        id: true,
        enquiryId: true,
        consultantId: true,
        callType: true,
        callStatus: true,
        callResponse: true,
        notes: true,
        callTime: true,
        nextFollowUp: true,
        createdAt: true,
        enquiry: {
          select: {
            firstName: true,
            lastName: true,
            mobileNo: true,
            email: true,
            degreeLevel: { select: { levelName: true } },
          },
        },
        consultant: { select: { firstName: true, lastName: true } },
      },
    });

    res.status(200).json({
      total: logs.length,
      callLogs: logs.map(mapConsultantCallLogResponse),
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/call-logs/institution/:institutionId ────────────────────────────

export const getInstitutionCallLogs = async (
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

    const logSelect = {
      id: true,
      enquiryId: true,
      callType: true,
      callStatus: true,
      callResponse: true,
      notes: true,
      callTime: true,
      nextFollowUp: true,
      createdAt: true,
      enquiry: {
        select: {
          firstName: true,
          lastName: true,
          mobileNo: true,
          email: true,
          degreeLevel: { select: { levelName: true } },
        },
      },
    } as const;

    const [counsellorLogs, consultantLogs] = await Promise.all([
      prisma.counsellorCallLog.findMany({
        where: { enquiry: { institutionId } },
        orderBy: { callTime: 'desc' },
        select: {
          ...logSelect,
          counsellorId: true,
          counsellor: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.consultantCallLog.findMany({
        where: { enquiry: { institutionId } },
        orderBy: { callTime: 'desc' },
        select: {
          ...logSelect,
          consultantId: true,
          consultant: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const allLogs = [
      ...counsellorLogs.map((log) => ({
        ...mapCounsellorCallLogResponse(log),
        assignedToName: `${log.counsellor.firstName} ${log.counsellor.lastName}`,
      })),
      ...consultantLogs.map((log) => ({
        ...mapConsultantCallLogResponse(log),
        assignedToName: `${log.consultant.firstName} ${log.consultant.lastName}`,
      })),
    ].sort((a, b) => new Date(b.callTime).getTime() - new Date(a.callTime).getTime());

    res.status(200).json({
      total: allLogs.length,
      callLogs: allLogs,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/call-logs/enquiry/:enquiryId ───────────────────────────────────

export const getEnquiryCallLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const enquiryId = normalizeString(req.params.enquiryId);
    if (!enquiryId) {
      res.status(400).json({ error: 'enquiryId is required.' });
      return;
    }

    const enquiry = await prisma.enquiryForm.findUnique({
      where: { id: enquiryId },
      select: { id: true },
    });

    if (!enquiry) {
      res.status(404).json({ error: 'Enquiry not found.' });
      return;
    }

    const [counsellorLogs, consultantLogs] = await Promise.all([
      prisma.counsellorCallLog.findMany({
        where: { enquiryId },
        select: {
          id: true,
          callTime: true,
          callStatus: true,
          callType: true,
          callResponse: true,
          notes: true,
          createdAt: true,
          counsellor: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.consultantCallLog.findMany({
        where: { enquiryId },
        select: {
          id: true,
          callTime: true,
          callStatus: true,
          callType: true,
          callResponse: true,
          notes: true,
          createdAt: true,
          consultant: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const mergedLogs = [
      ...counsellorLogs.map((log) => ({
        id: log.id,
        callTime: log.callTime,
        callStatus: log.callStatus,
        callType: log.callType,
        callResponse: log.callResponse,
        notes: log.notes,
        role: 'COUNSELLOR' as const,
        assignedTo: `${log.counsellor.firstName} ${log.counsellor.lastName}`,
        createdAt: log.createdAt,
      })),
      ...consultantLogs.map((log) => ({
        id: log.id,
        callTime: log.callTime,
        callStatus: log.callStatus,
        callType: log.callType,
        callResponse: log.callResponse,
        notes: log.notes,
        role: 'CONSULTANT' as const,
        assignedTo: `${log.consultant.firstName} ${log.consultant.lastName}`,
        createdAt: log.createdAt,
      })),
    ].sort((a, b) => new Date(b.callTime).getTime() - new Date(a.callTime).getTime());

    res.status(200).json({
      total: mergedLogs.length,
      callLogs: mergedLogs.map(({ createdAt, ...rest }) => rest),
    });
  } catch (error) {
    next(error);
  }
};
