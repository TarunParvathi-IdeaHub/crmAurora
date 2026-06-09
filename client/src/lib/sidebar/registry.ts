import { adminUserMenu } from "./menus/admin";
import { collegeAdminUserMenu } from "./menus/collegeAdmin";
import {
  admissionsMenuDirector,
  admissionsMenuCounsellor,
  enquiryMenu,
  aurumMenu,
  programFeeMenu,
  programFeeAdminMenu,
  crmReportsMenu,
  applicantMgmtMenu,
} from "./menus/crm";
import { adminRolesPermissionsMenu } from "./menus/admin";
import type { ModuleRoute } from "./types";

/**
 * Global module registry — maps URL prefixes to sidebar menus.
 *
 * Rules:
 *  1. Order matters: more specific prefixes must appear BEFORE broader ones.
 *  2. `roles` is optional — omit it to apply to every role that reaches the route.
 *  3. To add a new module, append an entry here and create its menu array.
 *
 * Pattern:
 *   pathname.startsWith(routePrefix) → use this menu (if role matches)
 */
export const moduleRegistry: ModuleRoute[] = [

  // ── Admin: Roles & Permissions sub-module ────────────────────────────────
  {
    routePrefix: "/modules/management/roles",
    roles: ["admin", "collegeAdmin"],
    menu: adminRolesPermissionsMenu,
  },
  {
    routePrefix: "/modules/management/permissions",
    roles: ["admin", "collegeAdmin"],
    menu: adminRolesPermissionsMenu,
  },

  // ── Admin: User Management ─────────────────────────────────────────────────
  {
    routePrefix: "/modules/management/users",
    roles: ["admin"],
    menu: adminUserMenu,
  },

  // ── College Admin: User Management ────────────────────────────────────────
  {
    routePrefix: "/modules/management/users",
    roles: ["collegeAdmin"],
    menu: collegeAdminUserMenu,
  },

  // ── CRM: Admissions sub-module ─────────────────────────────────────────────
  {
    routePrefix: "/modules/crm/admissions",
    roles: ["admissionDirector", "admissionIncharge"],
    menu: admissionsMenuDirector,
  },
  {
    routePrefix: "/modules/crm/admissions",
    roles: ["admissionConsultant", "admissionCounsellor"],
    menu: admissionsMenuCounsellor,
  },

  // ── CRM: Leads (enquiry sub-pages) ────────────────────────────────────────
  {
    routePrefix: "/modules/crm/leads",
    roles: ["admissionDirector", "admissionIncharge", "admissionConsultant", "admissionCounsellor"],
    menu: enquiryMenu,
  },

  // ── CRM: AURUM Exam sub-module ─────────────────────────────────────────────
  {
    routePrefix: "/modules/crm/aurum",
    roles: ["admissionDirector", "admissionIncharge"],
    menu: aurumMenu,
  },

  // ── Admin: Program Fee sub-module ─────────────────────────────────────────
  {
    routePrefix: "/modules/crm/feemanagement",
    roles: ["admin"],
    menu: programFeeAdminMenu,
  },

   // ── CRM: Program Fee sub-module ────────────────────────────────────────────
  {
    routePrefix: "/modules/crm/feemanagement",
    roles: ["admissionDirector", "admissionIncharge"],
    menu: programFeeMenu,
  },

  // ── CRM: Reports sub-module ────────────────────────────────────────────────
  {
    routePrefix: "/modules/crm/reports",
    roles: ["admissionDirector", "admissionIncharge", "admissionConsultant", "admissionCounsellor"],
    menu: crmReportsMenu,
  },

  // ── CRM: Applicant Management sub-module (all admission roles) ───────────
  {
    routePrefix: "/modules/crm/applicants",
    roles: ["admissionDirector", "admissionIncharge", "admissionConsultant", "admissionCounsellor"],
    menu: applicantMgmtMenu,
  },

  {
    routePrefix: "/modules/crm/applicants/application",
    roles: ["Applicant"],
    menu: applicantMgmtMenu,
  }

  // ── Register additional modules below ─────────────────────────────────────
  // Example:
  // {
  //   routePrefix: "/modules/finance/invoices",
  //   roles: ["financeManager"],
  //   menu: invoicesMenu,
  // },
];
