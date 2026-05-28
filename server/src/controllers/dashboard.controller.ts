import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import type { AuthRequest } from "../middleware/auth.middleware";

// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Raw employee record returned from whichever role table is queried.
 * All employee models in this schema share these exact fields.
 */
interface EmployeeRecord {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  designation: string;
  email: string;
  mobileNo: string;
  alternateMobileNo: string;
  emergencyContact: string;
  address: string;
  bloodGroup: string;
  caste: string;
  institutionId: string;
  departmentId: string | null;
  institution: {
    id: string;
    institutionName: string;
    institutionCode: string;
    institutionCity: string;
    institutionState: string;
  } | null;
  department: {
    id: string;
    name: string;
    departmentCode: string;
  } | null;
}

/**
 * Minimal Prisma delegate shape needed at runtime for dynamic table access.
 * Only `findFirst` is required for the profile fetch.
 */
interface PrismaFindFirstDelegate {
  findFirst(args: {
    where: Record<string, unknown>;
    select: Record<string, unknown>;
  }): Promise<EmployeeRecord | null>;
}

// ── Helper: getPrismaModelByRole ──────────────────────────────────────────────

/**
 * Converts a human-readable role string into the Prisma client accessor key.
 *
 * Algorithm:
 *  1. Trim and split the role string on whitespace.
 *  2. Capitalise the first letter of every word (PascalCase).
 *  3. Join all words into a single string.
 *  4. Lowercase the very first character to match Prisma's camelCase accessors.
 *
 * Examples:
 *  "Admin"              → "admin"
 *  "College Admin"      → "collegeAdmin"
 *  "Admission Incharge" → "admissionIncharge"
 *  "Admission Director" → "admissionDirector"
 */
const getPrismaModelByRole = (role: string): string => {
  const pascal = role
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");

  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

// ── Helper: buildProfileResponse ─────────────────────────────────────────────

/**
 * Assembles the standardised dashboard profile response from raw data.
 * `fullName` is always constructed server-side to ensure consistency.
 * Modules are intentionally excluded — the frontend derives them from `role`.
 */
const buildProfileResponse = (
  userId: string,
  role: string,
  emp: EmployeeRecord
) => {
  return {
    success: true,
    data: {
      userId,
      role,
      entityId: emp.id,
      empId: emp.empId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      designation: emp.designation,
      email: emp.email,
      mobileNo: emp.mobileNo,
      alternativeMobileNo: emp.alternateMobileNo,
      emergencyContact: emp.emergencyContact,
      address: emp.address,
      bloodGroup: emp.bloodGroup,
      caste: emp.caste,
      institution: emp.institution
        ? {
            id: emp.institution.id,
            institutionName: emp.institution.institutionName,
            institutionCode: emp.institution.institutionCode,
            institutionCity: emp.institution.institutionCity,
            institutionState: emp.institution.institutionState,
          }
        : null,
      department: emp.department
        ? {
            id: emp.department.id,
            name: emp.department.name,
            departmentCode: emp.department.departmentCode,
          }
        : null,
    },
  };
};

// ── Controller: getDashboardProfile ──────────────────────────────────────────

/**
 * POST /api/dashboard/profile
 *
 * Fetches the authenticated employee's latest profile details for the dashboard.
 * Modules are NOT included — the frontend resolves them locally using `role`.
 *
 * Security: The role received from the frontend is NEVER trusted directly.
 * All three values (userId, email, role) are cross-checked against the users
 * table before any employee data is fetched, preventing privilege escalation.
 *
 * Flow:
 *  1. Validate that userId, email, and role are present in the request body.
 *  2. Verify the combination exists in the `users` table → 401 on mismatch.
 *  3. Derive the Prisma accessor from the DB-verified role.
 *  4. Confirm the accessor maps to a real Prisma model → 400 if unsupported.
 *  5. Fetch the employee record from the role-specific table.
 *  6. Validate the institution relation is present → 404 if missing.
 *  7. Return the structured profile response.
 */
export const getDashboardProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId, email, role } = req.body as {
      userId?: unknown;
      email?: unknown;
      role?: unknown;
    };

    // ── Step 1: Validate required fields ────────────────────────────────────
    if (
      typeof userId !== "string" || !userId.trim() ||
      typeof email  !== "string" || !email.trim()  ||
      typeof role   !== "string" || !role.trim()
    ) {
      res.status(400).json({
        success: false,
        error: "userId, email, and role are required.",
      });
      return;
    }

    const sanitizedUserId = userId.trim();
    const sanitizedEmail  = email.trim().toLowerCase();
    const sanitizedRole   = role.trim();

    // ── Step 2: Verify user in the users table ───────────────────────────────
    // Matching all three fields prevents a tampered role from gaining elevated access.
    const user = await prisma.user.findFirst({
      where: {
        userId: sanitizedUserId,
        email:  sanitizedEmail,
        role:   sanitizedRole,
      },
      select: { userId: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "Invalid user." });
      return;
    }

    // ── Step 3: Derive the Prisma model accessor from the verified role ──────
    const modelAccessor = getPrismaModelByRole(user.role);

    // ── Step 4: Confirm the accessor resolves to an existing Prisma model ────
    const prismaDelegate = (prisma as unknown as Record<string, unknown>)[modelAccessor];

    if (
      !prismaDelegate ||
      typeof (prismaDelegate as Record<string, unknown>).findFirst !== "function"
    ) {
      res.status(400).json({
        success: false,
        error: `Unsupported role model: "${user.role}". No matching employee table found.`,
      });
      return;
    }

    const delegate = prismaDelegate as PrismaFindFirstDelegate;

    // ── Step 5 & 6: Fetch employee profile with institution + department ──────
    // Email was verified against the users table in step 2 and is unique across
    // every employee table, so it is used as the sole lookup key here.
    const employeeProfile = await delegate.findFirst({
      where: {
        email: sanitizedEmail,
      },
      select: {
        id:                true,
        empId:             true,
        firstName:         true,
        lastName:          true,
        designation:       true,
        email:             true,
        mobileNo:          true,
        alternateMobileNo: true,
        emergencyContact:  true,
        address:           true,
        bloodGroup:        true,
        caste:             true,
        institutionId:     true,
        departmentId:      true,
        institution: {
          select: {
            id:               true,
            institutionName:  true,
            institutionCode:  true,
            institutionCity:  true,
            institutionState: true,
          },
        },
        department: {
          select: {
            id:             true,
            name:           true,
            departmentCode: true,
          },
        },
      },
    });

    if (!employeeProfile) {
      res.status(404).json({
        success: false,
        error: "Employee profile not found.",
      });
      return;
    }

    // ── Step 7: Validate institution presence ────────────────────────────────
    if (!employeeProfile.institution) {
      res.status(404).json({
        success: false,
        error: "Institution not found for this employee.",
      });
      return;
    }

    // ── Step 8: Build and return the profile response ────────────────────────
    res.status(200).json(
      buildProfileResponse(sanitizedUserId, user.role, employeeProfile)
    );
  } catch (error) {
    next(error);
  }
};

// ── Controller: getEmployeeProfile (GET, JWT-based) ───────────────────────────

/**
 * GET /api/dashboard/employee/profile
 *
 * Returns the authenticated employee's profile using JWT claims — no request
 * body required. The role is taken directly from the verified token.
 */
export const getEmployeeProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const { userId, email, role } = req.user;

    const modelAccessor = getPrismaModelByRole(role);
    const prismaDelegate = (prisma as unknown as Record<string, unknown>)[modelAccessor];

    if (
      !prismaDelegate ||
      typeof (prismaDelegate as Record<string, unknown>).findFirst !== "function"
    ) {
      res.status(400).json({
        success: false,
        error: `Unsupported role model: "${role}". No matching employee table found.`,
      });
      return;
    }

    const delegate = prismaDelegate as PrismaFindFirstDelegate;

    const employeeProfile = await delegate.findFirst({
      where: { email },
      select: {
        id:                true,
        empId:             true,
        firstName:         true,
        lastName:          true,
        designation:       true,
        email:             true,
        mobileNo:          true,
        alternateMobileNo: true,
        emergencyContact:  true,
        address:           true,
        bloodGroup:        true,
        caste:             true,
        institutionId:     true,
        departmentId:      true,
        institution: {
          select: {
            id:               true,
            institutionName:  true,
            institutionCode:  true,
            institutionCity:  true,
            institutionState: true,
          },
        },
        department: {
          select: {
            id:             true,
            name:           true,
            departmentCode: true,
          },
        },
      },
    });

    if (!employeeProfile) {
      res.status(404).json({ success: false, error: "Employee profile not found." });
      return;
    }

    if (!employeeProfile.institution) {
      res.status(404).json({ success: false, error: "Institution not found for this employee." });
      return;
    }

    res.status(200).json(buildProfileResponse(userId, role, employeeProfile));
  } catch (error) {
    next(error);
  }
};

// ── Controller: getApplicantProfile ──────────────────────────────────────────

/**
 * GET /api/dashboard/applicant/profile
 *
 * Returns the authenticated applicant's profile.
 * The `applicationId` field maps to `studentAdmissionApplicationId` and is
 * required by the save-draft flow.
 */
export const getApplicantProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    const { userId } = req.user;

    const applicant = await prisma.applicant.findFirst({
      where: { userId },
      select: {
        id:                            true,
        firstName:                     true,
        lastName:                      true,
        email:                         true,
        mobileNo:                      true,
        role:                          true,
        studentAdmissionApplicationId: true,
        institution: {
          select: {
            id:             true,
            institutionName: true,
          },
        },
        degreeLevel: {
          select: {
            id:        true,
            levelName: true,
          },
        },
        program: {
          select: {
            id:          true,
            programName: true,
          },
        },
        admissionCycle: {
          select: {
            id:                 true,
            admissionCycleName: true,
          },
        },
      },
    });

    if (!applicant) {
      res.status(404).json({ success: false, error: "Applicant profile not found." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id:          applicant.id,
        firstName:   applicant.firstName,
        lastName:    applicant.lastName,
        email:       applicant.email,
        mobileNo:    applicant.mobileNo,
        role:        applicant.role ?? "Applicant",
        institution: applicant.institution,
        degreeLevel: applicant.degreeLevel,
        program:     applicant.program,
        admissionCycle: applicant.admissionCycle,
        // Alias for the save-draft API — frontend stores this as applicationId
        applicationId: applicant.studentAdmissionApplicationId ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Controller: getStudentProfile ─────────────────────────────────────────────

/**
 * GET /api/dashboard/student/profile
 *
 * Placeholder — Student module is under development.
 * Returns a mock response so the frontend has a stable contract to code against.
 */
export const getStudentProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        role: "Student",
        message: "Student profile module is under development",
      },
    });
  } catch (error) {
    next(error);
  }
};
