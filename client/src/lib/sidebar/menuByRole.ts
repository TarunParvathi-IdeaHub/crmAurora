import { adminInstituteMenu } from "./menus/admin";
import { collegeAdminInstituteMenu } from "./menus/collegeAdmin";
import { admissionDirectorDefaultMenu, admissionCounsellorDefaultMenu } from "./menus/crm";
import { facultyMenu } from "./menus/faculty";
import { ApplicantMenu } from "./menus/applicant";
import type { MenuItem } from "./types";

/**
 * Default role-level menus.
 * These are shown when the user is NOT inside a recognized sub-module route.
 * The resolver checks the module registry first; this is the fallback.
 */
export const menuByRole: Record<string, MenuItem[]> = {
  admin:                adminInstituteMenu,
  collegeAdmin:         collegeAdminInstituteMenu,
  faculty:              facultyMenu,
  Applicant:            ApplicantMenu,
  admissionDirector:    admissionDirectorDefaultMenu,
  admissionIncharge:    admissionDirectorDefaultMenu,
  admissionConsultant:  admissionCounsellorDefaultMenu,
  admissionCounsellor:  admissionCounsellorDefaultMenu,
};
