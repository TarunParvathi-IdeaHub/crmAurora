import type { NextFunction, Request, Response } from "express";
import nodemailer from "nodemailer";
import prisma from "../../config/database";

// Application error carrying HTTP status information.
class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

type DynamicModelDelegate = {
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
};

type EditableEmployeeFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  mobileNo?: string;
  alternateMobileNo?: string;
  emergencyContact?: string;
  address?: string;
  bloodGroup?: string;
  caste?: string;
  isActive?: boolean;
  sscMemo?: string | null;
  intermediateMemo?: string | null;
  ugMemo?: string | null;
  pgMemo?: string | null;
  phdMemo?: string | null;
};

type ChangedField = {
  field: keyof EditableEmployeeFields;
  oldValue: string;
  newValue: string;
};

type UpdateEmployeeServiceResult = {
  noChanges: boolean;
  updatedEmployee?: Record<string, unknown>;
  changedFields?: ChangedField[];
};

const MEMO_FIELDS = new Set([
  "sscMemo",
  "intermediateMemo",
  "ugMemo",
  "pgMemo",
  "phdMemo",
]);

const PAYLOAD_TO_DB_FIELD: Record<string, keyof EditableEmployeeFields> = {
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
  isActive: "isActive",
  sscMemo: "sscMemo",
  intermediateMemo: "intermediateMemo",
  ugMemo: "ugMemo",
  pgMemo: "pgMemo",
  phdMemo: "phdMemo",
};

/**
 * Resolve a dynamic Prisma model accessor from designation.
 * Example: "Admission Incharge" -> "admissionIncharge".
 */
function getPrismaModelByRole(role: string): string | null {
  const words = role.trim().split(/\s+/);
  if (!words.length) return null;

  const pascalCase = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  const accessor =
    pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);

  const candidate = (prisma as unknown as Record<string, unknown>)[accessor];
  if (
    !candidate ||
    typeof candidate !== "object" ||
    typeof (candidate as Record<string, unknown>).findFirst !== "function" ||
    typeof (candidate as Record<string, unknown>).update !== "function"
  ) {
    return null;
  }

  return accessor;
}

/**
 * Validate an email address format.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate a mobile number format (10 digits starting with 6-9).
 */
function isValidMobile(mobileNo: string): boolean {
  return /^[6-9]\d{9}$/.test(mobileNo);
}

/**
 * Normalize unknown value to a comparable string representation.
 */
function normalizeForCompare(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/**
 * Keep only editable fields from request body and normalize values.
 * Non-editable fields are ignored by design.
 */
function sanitizeUpdatePayload(
  body: Record<string, unknown>
): EditableEmployeeFields {
  const data: Record<keyof EditableEmployeeFields, string | boolean | null | undefined> = {} as Record<
    keyof EditableEmployeeFields,
    string | boolean | null | undefined
  >;

  for (const [inputKey, dbKey] of Object.entries(PAYLOAD_TO_DB_FIELD)) {
    if (!(inputKey in body)) continue;

    const raw = body[inputKey];
    if (raw === undefined) continue;

    if (raw === null) {
      if (MEMO_FIELDS.has(dbKey)) {
        data[dbKey] = null;
      }
      continue;
    }

    if (dbKey === "isActive") {
      if (typeof raw === "boolean") {
        data[dbKey] = raw;
      } else if (typeof raw === "string") {
        const normalized = raw.trim().toLowerCase();
        if (normalized === "true" || normalized === "false") {
          data[dbKey] = normalized === "true";
        }
      }
      continue;
    }

    const value = String(raw).trim();

    if (dbKey === "email") {
      data[dbKey] = value.toLowerCase();
      continue;
    }

    if (MEMO_FIELDS.has(dbKey)) {
      data[dbKey] = value.length ? value : null;
      continue;
    }

    data[dbKey] = value;
  }

  return data as EditableEmployeeFields;
}

/**
 * Compare previous employee record with requested updates and return changed fields only.
 */
function findChangedFields(
  previous: Record<string, unknown>,
  updates: EditableEmployeeFields
): ChangedField[] {
  const changed: ChangedField[] = [];

  for (const [field, newRawValue] of Object.entries(updates) as Array<[
    keyof EditableEmployeeFields,
    EditableEmployeeFields[keyof EditableEmployeeFields]
  ]>) {
    const oldValue = normalizeForCompare(previous[field]);
    const newValue = normalizeForCompare(newRawValue);

    if (oldValue !== newValue) {
      changed.push({ field, oldValue: oldValue || "(empty)", newValue: newValue || "(empty)" });
    }
  }

  return changed;
}

/**
 * Send profile update summary mail with only actually changed fields.
 */
async function sendProfileUpdateMail(params: {
  toEmail: string;
  firstName: string;
  empId: string;
  designation: string;
  changedFields: ChangedField[];
}): Promise<void> {
  if (params.changedFields.length === 0) return;

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const updatedFieldsHtml = params.changedFields
    .map(
      (item) =>
        `<li><strong>${item.field}</strong>: ${item.oldValue} -> ${item.newValue}</li>`
    )
    .join("");

  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME ?? "ERP Team"}" <${process.env.MAIL_USER}>`,
    to: params.toEmail,
    subject: "Your Employee Details Were Updated",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hello ${params.firstName},</p>
        <p>Your employee profile details were updated successfully.</p>
        <p>
          Employee ID: <strong>${params.empId}</strong><br />
          Designation: <strong>${params.designation}</strong>
        </p>
        <p><strong>Updated Fields:</strong></p>
        <ul>
          ${updatedFieldsHtml}
        </ul>
        <p>If you did not request these changes, please contact admin immediately.</p>
        <p>Regards,<br />ERP Team</p>
      </div>
    `,
  });
}

/**
 * Service to update an employee in dynamic role table and sync email to users table.
 */
async function updateEmployeeService(params: {
  designation: string;
  empId: string;
  body: Record<string, unknown>;
}): Promise<UpdateEmployeeServiceResult> {
  const modelAccessor = getPrismaModelByRole(params.designation);
  if (!modelAccessor) {
    throw new AppError("Unsupported designation model not found", 400);
  }

  const model = (prisma as unknown as Record<string, unknown>)[
    modelAccessor
  ] as DynamicModelDelegate;

  const existingEmployee = await model.findFirst({
    where: { empId: params.empId },
  });

  if (!existingEmployee) {
    throw new AppError("Employee not found", 404);
  }

  const updates = sanitizeUpdatePayload(params.body);

  if (updates.email && !isValidEmail(updates.email)) {
    throw new AppError("Invalid email format", 400);
  }

  if (updates.mobileNo && !isValidMobile(updates.mobileNo)) {
    throw new AppError("Invalid mobile number", 400);
  }

  // Duplicate checks excluding the current employee.
  if (updates.email) {
    const [dupInRoleTable, dupInUsers] = await Promise.all([
      model.findFirst({
        where: {
          email: updates.email,
          NOT: { empId: params.empId },
        },
      }),
      prisma.user.findFirst({
        where: {
          email: updates.email,
          NOT: { userId: params.empId },
        },
      }),
    ]);

    if (dupInRoleTable || dupInUsers) {
      throw new AppError("Email already exists", 409);
    }
  }

  if (updates.mobileNo) {
    const dupMobile = await model.findFirst({
      where: {
        mobileNo: updates.mobileNo,
        NOT: { empId: params.empId },
      },
    });

    if (dupMobile) {
      throw new AppError("Mobile number already exists", 409);
    }
  }

  const changedFields = findChangedFields(existingEmployee, updates);

  if (changedFields.length === 0) {
    return { noChanges: true };
  }

  const updatedEmployee = await prisma.$transaction(async (tx) => {
    const txModel = (tx as unknown as Record<string, unknown>)[
      modelAccessor
    ] as DynamicModelDelegate;

    const profile = await txModel.update({
      where: { empId: params.empId },
      data: updates,
    });

    if (updates.email) {
      await tx.user.updateMany({
        where: { userId: params.empId },
        data: { email: updates.email },
      });
    }

    return profile;
  });

  return {
    noChanges: false,
    updatedEmployee,
    changedFields,
  };
}

/**
 * Service to delete only the dashboard/login access from users table.
 */
async function deleteEmployeeDashboardService(params: {
  designation: string;
  empId: string;
}): Promise<void> {
  const modelAccessor = getPrismaModelByRole(params.designation);
  if (!modelAccessor) {
    throw new AppError("Unsupported designation model not found", 400);
  }

  const model = (prisma as unknown as Record<string, unknown>)[
    modelAccessor
  ] as DynamicModelDelegate;

  const employee = await model.findFirst({ where: { empId: params.empId } });
  if (!employee) {
    throw new AppError("Employee record not found", 404);
  }

  const user = await prisma.user.findUnique({
    where: { userId: params.empId },
    select: { userId: true },
  });

  if (!user) {
    throw new AppError("Employee dashboard not found", 404);
  }

  await prisma.user.delete({ where: { userId: params.empId } });
}

/**
 * Controller: Update editable employee profile details using designation + empId from JSON body.
 */
export const updateEmployeeDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const designation =
      typeof body.designation === "string" ? body.designation.trim() : "";
    const empId = typeof body.empId === "string" ? body.empId.trim() : "";

    if (!designation) {
      res.status(400).json({ success: false, message: "designation is required" });
      return;
    }

    if (!empId) {
      res.status(400).json({ success: false, message: "empId is required" });
      return;
    }

    const result = await updateEmployeeService({
      designation,
      empId,
      body,
    });

    if (result.noChanges) {
      res.status(200).json({
        success: true,
        message: "No changes detected",
      });
      return;
    }

    const updatedEmployee = result.updatedEmployee as Record<string, unknown>;
    const changedFields = result.changedFields ?? [];

    const toEmail =
      typeof updatedEmployee.email === "string" ? updatedEmployee.email : "";
    const firstName =
      typeof updatedEmployee.firstName === "string"
        ? updatedEmployee.firstName
        : "Employee";

    // Mail is intentionally non-blocking for API success because DB update is already committed.
    try {
      await sendProfileUpdateMail({
        toEmail,
        firstName,
        empId,
        designation,
        changedFields,
      });
    } catch (mailError) {
      console.error("[Mail] Failed to send profile update mail:", mailError);
    }

    res.status(200).json({
      success: true,
      message: "Employee details updated successfully",
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * Controller: Delete employee dashboard access using designation + empId from JSON body.
 */
export const deleteEmployeeDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const designation =
      typeof body.designation === "string" ? body.designation.trim() : "";
    const empId = typeof body.empId === "string" ? body.empId.trim() : "";

    if (!designation) {
      res.status(400).json({ success: false, message: "designation is required" });
      return;
    }

    if (!empId) {
      res.status(400).json({ success: false, message: "empId is required" });
      return;
    }

    await deleteEmployeeDashboardService({ designation, empId });

    res.status(200).json({
      success: true,
      message: "Employee dashboard deleted successfully",
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    next(error);
  }
};
