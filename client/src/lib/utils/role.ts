import type { Role } from "@/types/role";

const roleAliasMap: Record<string, Role> = {
  admin: "admin",
  collegeadmin: "collegeAdmin",
  academicdirector: "academicDirector",
  admissiondirector: "admissionDirector",
  admissionincharge: "admissionIncharge",
  admissionconsultant: "admissionConsultant",
  admissioncounsellor: "admissionCounsellor",
  dean: "dean",
  hod: "hod",
  faculty: "faculty",
  student: "student",
  applicant: "Applicant",
  studentapplicant: "Applicant", // backward-compat: old sessions stored "Student Applicant"
};

export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") {
    return null;
  }

  const compact = value.trim().toLowerCase().replace(/[\s_-]/g, "");
  return roleAliasMap[compact] ?? null;
}
