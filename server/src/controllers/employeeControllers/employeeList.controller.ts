import type { NextFunction, Request, Response } from "express";
import prisma from "../../config/database";
import { EMPLOYEE_MODEL_REGISTRY, resolveEmployeeModel } from "../../config/employeeRegistry";

// ─── Error class ──────────────────────────────────────────────────────────────

class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PrismaDelegate = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
};

type EnrichedEmployee = Record<string, unknown> & {
  employeeModel: string;
  roleName: string;
  tableName: string;
};

type EditableFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNo?: string;
  alternateMobileNo?: string;
  emergencyContact?: string;
  address?: string;
  bloodGroup?: string;
  caste?: string;
  empId?: string;
  isActive?: boolean;
  sscMemo?: string | null;
  intermediateMemo?: string | null;
  ugMemo?: string | null;
  pgMemo?: string | null;
  phdMemo?: string | null;
};

// ─── Validation helpers ───────────────────────────────────────────────────────

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

// ─── Prisma delegate resolver ─────────────────────────────────────────────────

function getPrismaDelegate(accessor: string): PrismaDelegate {
  const delegate = (prisma as unknown as Record<string, unknown>)[accessor];
  if (
    !delegate ||
    typeof delegate !== "object" ||
    typeof (delegate as Record<string, unknown>).findMany !== "function"
  ) {
    throw new AppError(`Prisma model accessor "${accessor}" not found`, 500);
  }
  return delegate as unknown as PrismaDelegate;
}

// ─── Payload sanitisation ─────────────────────────────────────────────────────

const MEMO_FIELDS = new Set([
  "sscMemo",
  "intermediateMemo",
  "ugMemo",
  "pgMemo",
  "phdMemo",
]);

/**
 * Maps accepted request body keys to their canonical DB field names.
 * Accepts both naming conventions used across the codebase.
 */
const EDITABLE_FIELD_MAP: Record<string, keyof EditableFields> = {
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  mobileNo: "mobileNo",
  alternateMobileNo: "alternateMobileNo",
  alternativeMobileNo: "alternateMobileNo",
  emergencyContact: "emergencyContact",
  address: "address",
  bloodGroup: "bloodGroup",
  caste: "caste",
  empId: "empId",
  isActive: "isActive",
  sscMemo: "sscMemo",
  intermediateMemo: "intermediateMemo",
  ugMemo: "ugMemo",
  pgMemo: "pgMemo",
  phdMemo: "phdMemo",
};

function sanitizeEditPayload(body: Record<string, unknown>): EditableFields {
  const result: Record<string, unknown> = {};

  for (const [inputKey, dbKey] of Object.entries(EDITABLE_FIELD_MAP)) {
    if (!(inputKey in body)) continue;

    const raw = body[inputKey];
    if (raw === undefined) continue;

    if (raw === null) {
      if (MEMO_FIELDS.has(dbKey)) result[dbKey] = null;
      continue;
    }

    if (dbKey === "isActive") {
      if (typeof raw === "boolean") {
        result[dbKey] = raw;
      } else if (typeof raw === "string") {
        const lower = raw.trim().toLowerCase();
        if (lower === "true" || lower === "false") {
          result[dbKey] = lower === "true";
        }
      }
      continue;
    }

    const value = String(raw).trim();

    if (dbKey === "email") {
      result[dbKey] = value.toLowerCase();
      continue;
    }

    if (MEMO_FIELDS.has(dbKey)) {
      result[dbKey] = value.length ? value : null;
      continue;
    }

    result[dbKey] = value;
  }

  return result as EditableFields;
}

// ─── Core fetch service ───────────────────────────────────────────────────────

/**
 * Fetches employees from every registered model in parallel.
 * Each record is enriched with employeeModel, roleName, and tableName.
 * The institution relation is flattened so institutionName is a top-level field.
 * Results are sorted by createdAt descending across all models.
 */
async function fetchEmployeesFromAllModels(
  institutionId?: string
): Promise<EnrichedEmployee[]> {
  const fetchPromises = Object.entries(EMPLOYEE_MODEL_REGISTRY).map(
    async ([modelKey, entry]) => {
      const model = getPrismaDelegate(entry.prismaAccessor);

      const records = await model.findMany({
        where: institutionId ? { institutionId } : undefined,
        include: {
          institution: {
            select: { institutionName: true, institutionCode: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return records.map((record) => {
        const institution = record.institution as
          | Record<string, unknown>
          | null
          | undefined;
        const { institution: _inst, ...rest } = record;

        return {
          ...rest,
          institutionName: institution?.institutionName ?? null,
          institutionCode: institution?.institutionCode ?? null,
          employeeModel: modelKey,
          roleName: entry.roleName,
          tableName: entry.tableName,
        } as EnrichedEmployee;
      });
    }
  );

  const results = await Promise.all(fetchPromises);
  const combined = results.flat();

  combined.sort((a, b) => {
    const toMs = (v: unknown) =>
      v instanceof Date
        ? v.getTime()
        : new Date(String(v ?? 0)).getTime();
    return toMs(b.createdAt) - toMs(a.createdAt);
  });

  return combined;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * GET /api/employees/all
 *
 * Returns every employee across all registered models, enriched with
 * employeeModel, roleName, and tableName. Latest created first.
 */
export const getAllEmployees = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employees = await fetchEmployeesFromAllModels();

    if (employees.length === 0) {
      res.status(404).json({ success: false, message: "No employees found" });
      return;
    }

    res.status(200).json({ success: true, employees, total: employees.length });
  } catch (error) {
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/employees/all/:institutionId
 *
 * Returns all employees belonging to the given institution, enriched with
 * employeeModel, roleName, and tableName. Latest created first.
 */
export const getEmployeesByInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const institutionId = typeof req.params.institutionId === "string" ? req.params.institutionId.trim() : "undefined";

    if (!institutionId || !isValidUuid(institutionId)) {
      res.status(400).json({
        success: false,
        message: "institutionId must be a valid UUID",
      });
      return;
    }

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      res
        .status(404)
        .json({ success: false, message: "Institution not found" });
      return;
    }

    const employees = await fetchEmployeesFromAllModels(institutionId);

    if (employees.length === 0) {
      res.status(404).json({
        success: false,
        message: "No employees found for this institution",
      });
      return;
    }

    res.status(200).json({ success: true, employees, total: employees.length });
  } catch (error) {
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

/**
 * PUT /api/employees/edit
 *
 * Edits an employee identified by UUID id + whitelisted employeeModel key.
 * The employeeModel value comes from the fetch response itself, so the
 * frontend never guesses it — it just echoes back what the backend sent.
 *
 * Body: { employeeId: string, employeeModel: string, ...editable fields }
 */
export const editEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const employeeId =
      typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const employeeModel =
      typeof body.employeeModel === "string" ? body.employeeModel.trim() : "";

    if (!employeeId) {
      res
        .status(400)
        .json({ success: false, message: "employeeId is required" });
      return;
    }

    if (!isValidUuid(employeeId)) {
      res
        .status(400)
        .json({ success: false, message: "employeeId must be a valid UUID" });
      return;
    }

    if (!employeeModel) {
      res
        .status(400)
        .json({ success: false, message: "employeeModel is required" });
      return;
    }

    // Security: validate against whitelist before any Prisma access.
    const entry = resolveEmployeeModel(employeeModel);
    if (!entry) {
      res.status(400).json({ success: false, message: "Invalid employeeModel" });
      return;
    }

    const model = getPrismaDelegate(entry.prismaAccessor);

    const existing = await model.findFirst({ where: { id: employeeId } });
    if (!existing) {
      res.status(404).json({ success: false, message: "Employee not found" });
      return;
    }

    const updates = sanitizeEditPayload(body);

    if (Object.keys(updates).length === 0) {
      res
        .status(400)
        .json({ success: false, message: "No editable fields provided" });
      return;
    }

    if (updates.email !== undefined && !isValidEmail(updates.email)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
      return;
    }

    if (updates.mobileNo !== undefined && !isValidMobile(updates.mobileNo)) {
      res.status(400).json({
        success: false,
        message: "Invalid mobile number (10 digits, starting with 6–9)",
      });
      return;
    }

    // Uniqueness checks — run in parallel, each excluding the current record.
    const uniquenessChecks: Promise<void>[] = [];

    if (updates.email) {
      uniquenessChecks.push(
        model
          .findFirst({
            where: { email: updates.email, NOT: { id: employeeId } },
            select: { id: true },
          })
          .then((dup) => {
            if (dup)
              throw new AppError(
                "Email is already in use by another employee",
                409
              );
          })
      );
    }

    if (updates.mobileNo) {
      uniquenessChecks.push(
        model
          .findFirst({
            where: { mobileNo: updates.mobileNo, NOT: { id: employeeId } },
            select: { id: true },
          })
          .then((dup) => {
            if (dup)
              throw new AppError(
                "Mobile number is already in use by another employee",
                409
              );
          })
      );
    }

    if (updates.empId) {
      uniquenessChecks.push(
        model
          .findFirst({
            where: { empId: updates.empId, NOT: { id: employeeId } },
            select: { id: true },
          })
          .then((dup) => {
            if (dup)
              throw new AppError("Employee ID is already in use", 409);
          })
      );
    }

    await Promise.all(uniquenessChecks);

    const updated = await model.update({
      where: { id: employeeId },
      data: updates,
    });

    // If email changed, keep the User table in sync.
    if (
      updates.email &&
      typeof existing.email === "string" &&
      updates.email !== existing.email
    ) {
      await prisma.user.updateMany({
        where: { email: existing.email },
        data: { email: updates.email },
      });
    }

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: {
        ...updated,
        employeeModel,
        roleName: entry.roleName,
        tableName: entry.tableName,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
