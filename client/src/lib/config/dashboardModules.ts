/**
 * Centralized dashboard module definitions, keyed by raw backend role string.
 *
 * HOW TO ADD A NEW ROLE:
 *  1. Define a new module array below (e.g. hrManagerModules).
 *  2. Add it to roleModulesMap with the exact role string stored in the DB.
 *  No other file needs to change.
 */

import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

// ── Module type ───────────────────────────────────────────────────────────────

export interface DashboardModule {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  path: string;
}

// ── Role module arrays ────────────────────────────────────────────────────────

const adminModules: DashboardModule[] = [
  {
    id: "institute-management",
    title: "Institute Management",
    description: "Configure schools, departments, and institutional settings.",
    icon: Building2,
    path: "/modules/management/institutions",
  },
  {
    id: "user-management",
    title: "User Management",
    description: "Create, update, and govern user roles across ERP modules.",
    icon: UserCog,
    path: "/modules/management/users/employee-management",
  },
  {
    id: "roles-permissions",
    title: "Roles & Permissions",
    description: "Define role hierarchy and access control policies.",
    icon: ShieldCheck,
    path: "/modules/management/roles",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Generate performance and audit reports.",
    icon: TrendingUp,
    path: "/modules/management/reports",
  },
  {
    id: "fee-management",
    title: "Fee Management",
    description: "Configure and manage fee structures.",
    icon: TrendingUp,
    path: "/modules/crm/feemanagement/fee-category",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Configure institution and system-wide settings.",
    icon: Settings,
    path: "/settings",
  },
];

const collegeAdminModules: DashboardModule[] = [
  {
    id: "institute-management",
    title: "Institute Management",
    description: "Configure schools, departments, and institutional settings.",
    icon: Building2,
    path: "/modules/management/school",
  },
  {
    id: "user-management",
    title: "User Management",
    description: "Create, update, and govern user roles across ERP modules.",
    icon: UserCog,
    path: "/modules/management/users/employee-management",
  }
];

const admissionDirectorModules: DashboardModule[] = [
  {
    id: "crm",
    title: "CRM",
    description: "Review and manage student enquiries.",
    icon: UserPlus,
    path: "/modules/crm/leads",
  },
  {
    id: "admissions",
    title: "Admissions",
    description: "Review applicants and manage undertaking templates.",
    icon: FileText,
    path: "/modules/crm/admissions",
  },
  {
    id: "aurum-exam-management",
    title: "AURUM Exam Management",
    description: "Manage AURUM entrance exam assignments and results.",
    icon: BookOpen,
    path: "/modules/crm/aurum",
  },
  {
    id: "fee-management",
    title: "Fee Management",
    description: "Configure and manage fee structures.",
    icon: TrendingUp,
    path: "/modules/crm/feemanagement/fee-category",
  },
  {
    id: "reports",
    title: "Reports",
    description: "View counsellor and consultant performance reports.",
    icon: BarChart3,
    path: "/modules/crm/reports",
  },
];

const admissionInchargeModules: DashboardModule[] = [
  {
    id: "crm",
    title: "CRM",
    description: "Review and manage student enquiries.",
    icon: UserPlus,
    path: "/modules/crm/leads",
  },
  {
    id: "admissions",
    title: "Admissions",
    description: "Review applicants & manage undertaking templates.",
    icon: FileText,
    path: "/modules/crm/admissions",
  },
  {
    id: "aurum-exam-management",
    title: "AURUM Exam Management",
    description: "Manage entrance exam scheduling and results",
    icon: Users,
    path: "/modules/crm/aurum",
  },
  {
    id: "fee-management",
    title: "Fee Management",
    description: "Configure and manage fee structures.",
    icon: TrendingUp,
    path: "/modules/crm/feemanagement/fee-category",
  },
  {
    id: "reports",
    title: "Reports",
    description: "View counsellor & consultant performance reports.",
    icon: BarChart3,
    path: "/modules/crm/reports",
  },
];

const admissionConsultantModules: DashboardModule[] = [
  {
    id: "crm",
    title: "CRM",
    description: "Review and manage student enquiries.",
    icon: UserPlus,
    path: "/modules/crm/leads",
  },
  {
    id: "admissions",
    title: "Admissions",
    description: "Review applicants & manage undertaking templates.",
    icon: FileText,
    path: "/modules/crm/admissions",
  },  
  {
    id: "reports",
    title: "Reports",
    description: "View your performance and conversion reports.",
    icon: BarChart3,
    path: "/modules/crm/reports",
  },
];

const admissionCounsellorModules: DashboardModule[] = [
  {
    id: "crm",
    title: "CRM",
    description: "Review and manage student enquiries.",
    icon: UserPlus,
    path: "/modules/crm/leads",
  },
  {
    id: "admissions",
    title: "Admissions",
    description: "Review applicants & manage undertaking templates.",
    icon: FileText,
    path: "/modules/crm/admissions",
  },
  {
    id: "reports",
    title: "Reports",
    description: "View your performance and conversion reports.",
    icon: BarChart3,
    path: "/modules/crm/reports",
  },
];

const applicantModules: DashboardModule[] = [
  {
    id: "my-application",
    title: "My Application",
    description:
      "Fill and track your admission application, documents & verification status.",
    icon: FileText,
    path: "/modules/crm/applicants/application",
  },
  {
    id: "aurum-exam",
    title: "AURUM Exam",
    description:
      "Access your entrance exam details, admit card, slot booking, and results.",
    icon: BookOpen,
    path: "/modules/crm/applicants/aurum",
  },
  {
    id: "undertaking",
    title: "Undertaking",
    description:
      "Review &sign the undertaking documents required to complete your admission.",
    icon: ClipboardCheck,
    path: "/modules/crm/applicants/undertaking",
  },
];

// ── Centralized role → modules map ────────────────────────────────────────────
// Keys are the exact role strings stored in the backend `users` table.
// The dashboard page reads this map using the validated profile.role value.

export const roleModulesMap: Record<string, DashboardModule[]> = {
  Admin: adminModules,
  "College Admin": collegeAdminModules,
  "Admission Director": admissionDirectorModules,
  "Admission Incharge": admissionInchargeModules,
  "Admission Consultant": admissionConsultantModules,
  "Admission Counsellor": admissionCounsellorModules,
  "Applicant"  : applicantModules,
};
