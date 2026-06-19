import type { PermissionName } from "@/types/permissions";
import type { Role } from "@/types/role";

export const permissions: Record<Role, PermissionName[]> = {
  admin: ["academic", "crm", "faculty", "finance", "management", "student"],
  collegeAdmin: ["academic", "crm", "faculty", "finance", "management"],
  academicDirector: ["academic", "faculty", "management"],
  admissionDirector: ["crm"],
  admissionIncharge: ["crm"],
  admissionConsultant: ["crm"],
  admissionCounsellor: ["crm"],
  dean: ["academic", "faculty", "management"],
  hod: ["academic", "faculty"],
  faculty: ["academic", "faculty", "student"],
  student: ["student", "finance"],
  Applicant: ["crm"],
};