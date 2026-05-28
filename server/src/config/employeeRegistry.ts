/**
 * Central registry of all employee role models.
 *
 * To add a new role (e.g. HRManager, FinanceOfficer):
 *   1. Add a single entry to EMPLOYEE_MODEL_REGISTRY below.
 *   2. No controller or service changes are needed.
 */

export interface EmployeeRegistryEntry {
  /** camelCase Prisma client accessor (e.g. "admissionCounsellor") */
  prismaAccessor: string;
  /** @@map value — the actual PostgreSQL table name */
  tableName: string;
  /** Human-readable role name returned in API responses */
  roleName: string;
}

export const EMPLOYEE_MODEL_REGISTRY: Record<string, EmployeeRegistryEntry> = {
  Admin: {
    prismaAccessor: "admin",
    tableName: "admins",
    roleName: "Admin",
  },
  CollegeAdmin: {
    prismaAccessor: "collegeAdmin",
    tableName: "collegeAdmins",
    roleName: "College Admin",
  },
  AdmissionDirector: {
    prismaAccessor: "admissionDirector",
    tableName: "admissionDirectors",
    roleName: "Admission Director",
  },
  AdmissionIncharge: {
    prismaAccessor: "admissionIncharge",
    tableName: "admissionIncharges",
    roleName: "Admission Incharge",
  },
  AdmissionCounsellor: {
    prismaAccessor: "admissionCounsellor",
    tableName: "admissionCounsellors",
    roleName: "Admission Counsellor",
  },
  AdmissionConsultant: {
    prismaAccessor: "admissionConsultant",
    tableName: "admissionConsultants",
    roleName: "Admission Consultant",
  },
};

/** Set of all whitelisted employeeModel keys (used for security validation). */
export const VALID_EMPLOYEE_MODEL_KEYS = new Set(Object.keys(EMPLOYEE_MODEL_REGISTRY));

/**
 * Resolves an employeeModel key to its registry entry.
 * Returns null if the key is not in the whitelist, preventing arbitrary Prisma model access.
 */
export function resolveEmployeeModel(employeeModel: string): EmployeeRegistryEntry | null {
  if (!VALID_EMPLOYEE_MODEL_KEYS.has(employeeModel)) return null;
  return EMPLOYEE_MODEL_REGISTRY[employeeModel] ?? null;
}
