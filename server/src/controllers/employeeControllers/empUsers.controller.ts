import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import multer from "multer";
import xlsx from "xlsx";
import csvParser from "csv-parser";
import { Readable } from "stream";
import prisma from "../../config/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeeInput {
  institutionId: string;
  departmentId?: string | null;
  firstName: string;
  lastName: string;
  designation: string;
  staffType: string;
  email: string;
  mobileNo: string;
  alternateMobileNo: string;
  emergencyContact: string;
  address: string;
  bloodGroup: string;
  caste: string;
}

interface CreateEmployeeResult {
  empId: string;
  email: string;
  designation: string;
  plainPassword: string;
}

interface FailedRecord {
  rowNumber: number;
  email?: string;
  reason: string;
}

// Tagged error with an HTTP status code attached
class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Helper: Dynamic Prisma Model Resolution ──────────────────────────────────

/**
 * Convert a designation / role name into the Prisma camelCase model accessor.
 *
 * Algorithm:
 *   1. Split by whitespace
 *   2. Capitalise first letter of each word, lowercase the rest  → PascalCase
 *   3. Lowercase the very first character                        → camelCase
 *
 * Examples:
 *   "Admin"              → "admin"
 *   "College Admin"      → "collegeAdmin"
 *   "Admission Incharge" → "admissionIncharge"
 *   "HR Manager"         → "hrManager"
 *
 * Returns null when the resulting accessor does not map to a Prisma model
 * delegate (i.e. the table/model does not exist).
 */
function getPrismaModelByRole(role: string): string | null {
  const words = role.trim().split(/\s+/);

  const pascal = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);

  // A Prisma model delegate exposes a `create` function.
  // If the accessor doesn't resolve to a delegate, the role is unsupported.
  const candidate = (prisma as unknown as Record<string, unknown>)[camel];
  if (
    !candidate ||
    typeof candidate !== "object" ||
    typeof (candidate as Record<string, unknown>)["create"] !== "function"
  ) {
    return null;
  }

  return camel;
}

// ─── Helper: Employee ID Generation ──────────────────────────────────────────

/**
 * Generate the next employee ID.
 *
 * Format: <rolePrefix><3-digit-padded-incremented-count>
 *
 * Examples:
 *   prefix="AUNTD", currentCount=0  → "AUNTD001"
 *   prefix="AUNTD", currentCount=2  → "AUNTD003"
 */
function generateEmployeeId(prefix: string, currentCount: number): string {
  const next = currentCount + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

// ─── Helper: Password Generation & Hashing ───────────────────────────────────

/**
 * Generate a plain-text password from the employee's first name.
 * Pattern: <Capitalised first name>@123
 *
 * Example: "john" → "John@123"
 */
function generatePassword(firstName: string): string {
  const trimmed = firstName.trim();
  const capitalised =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return `${capitalised}@123`;
}

/** Hash a plain-text password with bcrypt (cost factor 12). */
async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

// ─── Helper: Email Sending ────────────────────────────────────────────────────

/**
 * Send login-credentials email to the newly created employee.
 *
 * Reads SMTP config from environment variables:
 *   MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS, MAIL_FROM_NAME
 */
async function sendEmployeeMail(params: {
  toEmail: string;
  firstName: string;
  empId: string;
  designation: string;
  plainPassword: string;
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME ?? "ERP System"}" <${process.env.MAIL_USER}>`,
    to: params.toEmail,
    subject: "Employee Dashboard Created Successfully",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #2c3e50;">Employee Dashboard Created Successfully</h2>
        <p>Hello <strong>${params.firstName}</strong>,</p>
        <p>Your dashboard has been created successfully. Below are your login credentials:</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold; width: 40%;">User ID</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd;">${params.empId}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Designation</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd;">${params.designation}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Password</td>
            <td style="padding: 10px 14px; border: 1px solid #ddd; font-family: monospace;">${params.plainPassword}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #e74c3c;">
          <strong>Important:</strong> Please log in and change your password immediately after your first login.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #aaa;">This is an automated email. Please do not reply.</p>
      </div>
    `,
  });
}

// ─── Helper: Input Validation ─────────────────────────────────────────────────

/**
 * Validate required and format-sensitive fields for a single employee record.
 * Returns an error message string on failure, or null when valid.
 */
function validateEmployeeInput(data: Partial<EmployeeInput>): string | null {
  if (!data.institutionId?.trim()) return "institutionId is required.";
  if (!data.firstName?.trim()) return "firstName is required.";
  if (!data.lastName?.trim()) return "lastName is required.";
  if (!data.designation?.trim()) return "designation is required.";
  if (!data.staffType?.trim()) return "staffType is required.";
  if (!data.email?.trim()) return "email is required.";
  if (!data.mobileNo?.trim()) return "mobileNo is required.";
  if (!data.alternateMobileNo?.trim()) return "alternateMobileNo is required.";
  if (!data.emergencyContact?.trim()) return "emergencyContact is required.";
  if (!data.address?.trim()) return "address is required.";
  if (!data.bloodGroup?.trim()) return "bloodGroup is required.";
  if (!data.caste?.trim()) return "caste is required.";

  const nameRegex = /^[A-Za-z\s]+$/;
  if (!nameRegex.test(data.firstName.trim())) {
    return "Invalid firstName. Only letters and spaces are allowed.";
  }
  if (!nameRegex.test(data.lastName.trim())) {
    return "Invalid lastName. Only letters and spaces are allowed.";
  }

  const casteRegex = /^[A-Za-z\s-]+$/;
  if (!casteRegex.test(data.caste.trim())) {
    return "Invalid caste. Only letters, spaces, and hyphens are allowed.";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email.trim())) return "Invalid email format.";

  // Accept 10-digit Indian mobile numbers starting with 6–9
  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobileRegex.test(data.mobileNo.trim())) {
    return "Invalid mobile number. Must be a 10-digit number starting with 6–9.";
  }

  if (!mobileRegex.test(data.alternateMobileNo.trim())) {
    return "Invalid alternateMobileNo. Must be a 10-digit number starting with 6–9.";
  }

  if (!mobileRegex.test(data.emergencyContact.trim())) {
    return "Invalid emergencyContact. Must be a 10-digit number starting with 6–9.";
  }

  return null;
}

// ─── Core Service: Create One Employee ───────────────────────────────────────

/**
 * Reusable service that orchestrates all steps required to onboard one employee:
 *
 *  1. Validate institution exists.
 *  2. Look up the EmployeeRole for the given designation.
 *  3. Resolve the dynamic Prisma model accessor from the designation.
 *  4. Check for duplicate email / mobile in both the role table and users table.
 *  5. Run a Prisma transaction:
 *       a. Create the employee profile in the dynamic role table.
 *       b. Create the User account.
 *       c. Increment EmployeeRole.roleCount.
 *
 * Throws AppError (with an HTTP statusCode) on any business-logic failure.
 * Throws a generic Error on unexpected failures (caught by errorHandler middleware).
 */
async function createEmployeeService(
  data: EmployeeInput
): Promise<CreateEmployeeResult> {
  // ── Step 1: Validate institution ────────────────────────────────────────────
  const institution = await prisma.institution.findUnique({
    where: { id: data.institutionId },
    select: { id: true },
  });

  if (!institution) {
    throw new AppError(
      `Institution with id "${data.institutionId}" not found.`,
      404
    );
  }

  // ── Step 2: Find EmployeeRole ────────────────────────────────────────────────
  const employeeRole = await prisma.employeeRole.findFirst({
    where: {
      institutionId: data.institutionId,
      role: data.designation,
    },
    select: { id: true, rolePrefix: true, roleCount: true, staffType: true },
  });

  if (!employeeRole) {
    throw new AppError(
      `Employee role "${data.designation}" is not configured for this institution.`,
      404
    );  
  }

  // ── Step 3: Resolve dynamic Prisma model ─────────────────────────────────────
  const modelAccessor = getPrismaModelByRole(data.designation);

  if (!modelAccessor) {
    throw new AppError(
      `Unsupported designation: no Prisma model found for "${data.designation}". ` +
        `Ensure the model exists in the schema and matches the role name.`,
      400
    );
  }

  const dynamicModel = (prisma as unknown as Record<string, unknown>)[
    modelAccessor
  ] as Record<string, (...args: unknown[]) => Promise<unknown>>;

  // ── Step 4: Duplicate checks ─────────────────────────────────────────────────
  const normalisedEmail = data.email.trim().toLowerCase();
  const normalisedMobile = data.mobileNo.trim();

  const [profileByEmail, profileByMobile, userByEmail] = await Promise.all([
    dynamicModel["findFirst"]({ where: { email: normalisedEmail } }),
    dynamicModel["findFirst"]({ where: { mobileNo: normalisedMobile } }),
    prisma.user.findFirst({ where: { email: normalisedEmail } }),
  ]);

  if (profileByEmail || userByEmail) {
    throw new AppError(
      `Email "${normalisedEmail}" is already registered.`,
      409
    );
  }

  if (profileByMobile) {
    throw new AppError(
      `Mobile number "${normalisedMobile}" is already registered.`,
      409
    );
  }

  // ── Step 5: Generate credentials ─────────────────────────────────────────────
  const empId = generateEmployeeId(
    employeeRole.rolePrefix,
    employeeRole.roleCount
  );
  const plainPassword = generatePassword(data.firstName);
  const hashedPassword = await hashPassword(plainPassword);

  // ── Step 6: Prisma transaction ───────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    const txModel = (tx as unknown as Record<string, unknown>)[modelAccessor] as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >;

    // 6a. Create employee profile in the dynamic role table
    await txModel["create"]({
      data: {
        institutionId: data.institutionId,
        departmentId: data.departmentId ?? null,
        empId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        designation: data.designation.trim(),
        staffType: employeeRole.staffType,
        email: normalisedEmail,
        mobileNo: normalisedMobile,
        alternateMobileNo: data.alternateMobileNo.trim(),
        emergencyContact: data.emergencyContact.trim(),
        address: data.address.trim(),
        bloodGroup: data.bloodGroup.trim(),
        caste: data.caste.trim(),
      },
    });

    // 6b. Create user account
    await tx.user.create({
      data: {
        userId: empId,
        email: normalisedEmail,
        password: hashedPassword,
        role: data.designation.trim(),
        isFirstLogin: true,
        isBlocked: false,
      },
    });

    // 6c. Increment roleCount
    await tx.employeeRole.update({
      where: { id: employeeRole.id },
      data: { roleCount: { increment: 1 } },
    });
  });

  return {
    empId,
    email: normalisedEmail,
    designation: data.designation.trim(),
    plainPassword,
  };
}

// ─── Helper: File Parsing ─────────────────────────────────────────────────────

/**
 * Parse an Excel (.xlsx / .xls) file buffer.
 * Returns an array of row objects using the first sheet.
 */
function parseExcelFile(buffer: Buffer): Record<string, unknown>[] {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
}

/**
 * Parse a CSV file buffer into an array of row objects.
 * Uses csv-parser which handles quoted fields and various delimiters.
 */
function parseCsvFile(buffer: Buffer): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const results: Record<string, unknown>[] = [];
    const stream = Readable.from(buffer.toString("utf8"));

    stream
      .pipe(csvParser())
      .on("data", (row: Record<string, unknown>) => results.push(row))
      .on("end", () => resolve(results))
      .on("error", (err: Error) => reject(err));
  });
}

// ─── Helper: Row → EmployeeInput Mapping ──────────────────────────────────────

/**
 * Map a raw Excel/CSV row object to EmployeeInput.
 *
 * Column headers are normalised to lowercase with spaces/underscores removed
 * so that both "First Name", "firstName", and "first_name" all resolve correctly.
 */
function mapRowToEmployeeInput(
  raw: Record<string, unknown>
): Partial<EmployeeInput> {
  // Build a normalised key→value lookup
  const row: Record<string, string> = {};
  for (const key of Object.keys(raw)) {
    const normKey = key.toLowerCase().replace(/[\s_]/g, "");
    row[normKey] = String(raw[key] ?? "").trim();
  }

  const pick = (...keys: string[]): string | undefined =>
    keys.map((k) => row[k]).find((v) => v !== undefined && v !== "");

  const pickBoolean = (...keys: string[]): boolean | undefined => {
    const value = pick(...keys)?.toLowerCase();
    if (value === "true" || value === "yes" || value === "1") return true;
    if (value === "false" || value === "no" || value === "0") return false;
    return undefined;
  };

  return {
    institutionId: pick("institutionid"),
    departmentId: pick("departmentid") ?? null,
    firstName: pick("firstname"),
    lastName: pick("lastname"),
    designation: pick("designation", "role"),
    staffType: pick("stafftype", "staff_type", "type"),
    email: pick("email"),
    mobileNo: pick("mobileno", "mobile"),
    alternateMobileNo: pick("alternatemobileno", "alternativemobileno"),
    emergencyContact: pick("emergencycontact"),
    address: pick("address"),
    bloodGroup: pick("bloodgroup"),
    caste: pick("caste"),
  };
}

// ─── Multer Middleware ────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
  "text/csv",
  "application/csv",
  "text/comma-separated-values",
]);

/**
 * Multer middleware for bulk-upload endpoint.
 * - Memory storage (no disk writes).
 * - Accepts only .xlsx, .xls, .csv files.
 * - Max file size: 5 MB.
 * - Expects the form-data field name to be "file".
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx, .xls, and .csv files are accepted."));
    }
  },
}).single("file");

// ─── Controller: Create Single Employee ───────────────────────────────────────

/**
 * POST /employees/create
 *
 * Creates a single employee from a JSON request body.
 *
 * Flow:
 *   1. Extract and validate input fields.
 *   2. Delegate to createEmployeeService (validates institution, role, duplicates,
 *      generates empId, persists profile + user in a transaction).
 *   3. Send credentials email (non-fatal if mail fails).
 *   4. Return 201 success response.
 */
export const createSingleEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const input: Partial<EmployeeInput> = {
      institutionId:
        typeof body.institutionId === "string" ? body.institutionId : undefined,
      departmentId:
        typeof body.departmentId === "string" ? body.departmentId : null,
      firstName:
        typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      designation:
        typeof body.designation === "string" ? body.designation : undefined,
      staffType:
        typeof body.staffType === "string" ? body.staffType : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      mobileNo: typeof body.mobileNo === "string" ? body.mobileNo : undefined,
      // Accept both spellings from the client
      alternateMobileNo:
        typeof body.alternateMobileNo === "string"
          ? body.alternateMobileNo
          : typeof body.alternativeMobileNo === "string"
            ? body.alternativeMobileNo
            : undefined,
      emergencyContact:
        typeof body.emergencyContact === "string"
          ? body.emergencyContact
          : undefined,
      address: typeof body.address === "string" ? body.address : undefined,
      bloodGroup:
        typeof body.bloodGroup === "string" ? body.bloodGroup : undefined,
      caste: typeof body.caste === "string" ? body.caste : undefined,
    };

    // Validate required fields and formats
    const validationError = validateEmployeeInput(input);
    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }

    const result = await createEmployeeService(input as EmployeeInput);

    // Send credentials email — failure is logged but does NOT roll back creation
    try {
      await sendEmployeeMail({
        toEmail: result.email,
        firstName: input.firstName!,
        empId: result.empId,
        designation: result.designation,
        plainPassword: result.plainPassword,
      });
    } catch (mailErr) {
      console.error("[Mail] Failed to send credentials email:", mailErr);
    }

    res.status(201).json({
      success: true,
      message: "Employee dashboard created successfully.",
      data: {
        empId: result.empId,
        email: result.email,
        designation: result.designation,
      },
    });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, message: err.message });
      return;
    }
    next(err);
  }
};

// ─── Controller: Create Bulk Employees ────────────────────────────────────────

/**
 * POST /employees/bulk-create
 *
 * Creates multiple employees from an uploaded Excel (.xlsx / .xls) or CSV file.
 *
 * Flow:
 *   1. Parse the uploaded file into an array of row objects.
 *   2. For each row (skipping the header which xlsx/csv-parser handles):
 *        a. Map raw row data to EmployeeInput.
 *        b. Validate required fields.
 *        c. Call createEmployeeService — failure is isolated per row.
 *        d. Send credentials email — failure marks the row as partial success.
 *   3. Return a summary response including per-row failure details.
 *
 * Rules:
 *   - A single row failure does NOT stop processing of remaining rows.
 *   - Email failure does NOT delete or rollback the created employee record.
 *   - Mail-failed rows are listed in failedRecords with the reason
 *     "Employee created but mail sending failed."
 */
export const createBulkEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res
        .status(400)
        .json({ success: false, message: "No file uploaded. Use field name 'file'." });
      return;
    }

    const { mimetype, buffer } = req.file;

    // ── Parse file ────────────────────────────────────────────────────────────
    let rows: Record<string, unknown>[];

    if (mimetype === "text/csv" || mimetype === "application/csv" || mimetype === "text/comma-separated-values") {
      rows = await parseCsvFile(buffer);
    } else {
      rows = parseExcelFile(buffer);
    }

    if (rows.length === 0) {
      res.status(400).json({
        success: false,
        message: "Uploaded file contains no data rows.",
      });
      return;
    }

    // ── Process rows ─────────────────────────────────────────────────────────
    const totalRows = rows.length;
    let successCount = 0;
    let failedCount = 0;
    let mailSentCount = 0;
    let mailFailedCount = 0;
    const failedRecords: FailedRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      // Row number is 1-based + 1 header row = data starts at row 2
      const rowNumber = i + 2;
      const raw = rows[i];

      // Map raw row to typed input
      const input = mapRowToEmployeeInput(raw);

      // Validate required fields before hitting the database
      const validationError = validateEmployeeInput(input);
      if (validationError) {
        failedCount++;
        failedRecords.push({
          rowNumber,
          email: input.email,
          reason: validationError,
        });
        continue;
      }

      // Attempt to create employee; isolate per-row failures
      let result: CreateEmployeeResult;

      try {
        result = await createEmployeeService(input as EmployeeInput);
        successCount++;
      } catch (err) {
        failedCount++;
        failedRecords.push({
          rowNumber,
          email: input.email,
          reason:
            err instanceof Error ? err.message : "Unknown error during creation.",
        });
        continue;
      }

      // Send credentials email after successful DB commit
      try {
        await sendEmployeeMail({
          toEmail: result.email,
          firstName: input.firstName!,
          empId: result.empId,
          designation: result.designation,
          plainPassword: result.plainPassword,
        });
        mailSentCount++;
      } catch (_mailErr) {
        // Employee is created — only mark mail as failed, do not rollback
        mailFailedCount++;
        failedRecords.push({
          rowNumber,
          email: result.email,
          reason: "Employee created but mail sending failed.",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Bulk employee creation completed.",
      totalRows,
      successCount,
      failedCount,
      mailSentCount,
      mailFailedCount,
      failedRecords,
    });
  } catch (err) {
    next(err);
  }
};
