import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileSearch,
  FileText,     
  Phone,
  ScrollText,
  Settings,
  TrendingUp,
  UserPlus,
  Users,
  LayoutDashboard,
  BadgeCheck,
  RefreshCcw,
  FileClock,
  CreditCard,
  GraduationCap,
  Award,
  Microscope,
  CogIcon,
} from "lucide-react";
import type { MenuItem } from "../types";

// ─── CRM: Default menus (role-level, shown when anywhere in /modules/crm/*) ──

export const admissionDirectorDefaultMenu: MenuItem[] = [
  { id: "dashboard",       label: "Dashboard",         icon: LayoutDashboard, path: "/dashboard" },
  { id: "enquiry",         label: "Enquiry",           icon: UserPlus,        path: "/modules/crm/enquiry" },
  { id: "admissions",      label: "Admissions",        icon: FileText,        path: "/modules/crm/admissions" },
  { id: "aurum",           label: "AURUM Exam",        icon: BookOpen,        path: "/modules/crm/aurum" },
  { id: "admission-cycle", label: "Admission Cycle",   icon: Calendar,        path: "/modules/crm/admission-cycle" },
  { id: "program-fee",     label: "Program Fee",       icon: TrendingUp,      path: "/modules/crm/programfeemanagement" },
  { id: "reports",         label: "Reports",           icon: BarChart3,       path: "/modules/crm/reports" },
];

export const admissionCounsellorDefaultMenu: MenuItem[] = [
  { id: "dashboard",  label: "Dashboard",          icon: LayoutDashboard, path: "/dashboard" },
  { id: "enquiry",    label: "Enquiry Management", icon: UserPlus,        path: "/modules/crm/enquiry" },
  { id: "applicants", label: "Applicant Management",icon: FileText,       path: "/modules/crm/applicants" },
  { id: "reports",    label: "Reports",            icon: BarChart3,       path: "/modules/crm/reports" },
];

// ─── CRM Sub-Module: Admissions ───────────────────────────────────────────────

export const admissionsMenu: MenuItem[] = [
  { id: "dashboard",              label: "Dashboard",               icon: LayoutDashboard, path: "/dashboard"},
  { id: "batch",  label: "Batch",   icon: CheckCircle2,    path: "/modules/crm/admissions/batch" },
  { id: "admission-cycle",         label: "Admission Cycle", icon: Calendar,        path: "/modules/crm/admissions/admission-cycle" },
  { id: "undertaking-templates",  label: "Undertaking Templates",   icon: ClipboardCheck,  path: "/modules/crm/admissions/undertaking-templates" },
  { id: "review-applications", label: "Review Applications", icon: FileSearch,    path: "/modules/crm/admissions/review" },
  { id: "ug-application",     label: "UG Applications",    icon: GraduationCap, path: "/modules/crm/admissions/ug" },
  { id: "pg-application",     label: "PG Applications",    icon: BookOpen,      path: "/modules/crm/admissions/pg" },
  { id: "phd-application",    label: "Phd Applications",   icon: Microscope,    path: "/modules/crm/admissions/phd" },
];

// ─── CRM Sub-Module: Enquiry ──────────────────────────────────────────────────

export const enquiryMenu: MenuItem[] = [
  { id: "dashboard", label: "Dashboard",  icon: LayoutDashboard, path: "/dashboard" },
  { id: "leads",     label: "All Leads",  icon: Users,           path: "/modules/crm/leads/all" },
  { id: "ug-leads",  label: "UG Leads",   icon: GraduationCap,   path: "/modules/crm/leads/ug" },
  { id: "pg-leads",  label: "PG Leads",   icon: BookOpen,        path: "/modules/crm/leads/pg" },
  { id: "phd-leads", label: "Phd Leads",  icon: Microscope,      path: "/modules/crm/leads/phd" },
  { id: "call-logs", label: "Call Logs",  icon: Phone,           path: "/modules/crm/leads/call-logs" },
  //{ id: "reports",  label: "Reports",   icon: BarChart3,        path: "/modules/crm/leads/reports" },
];

// ─── CRM Sub-Module: AURUM Exam ───────────────────────────────────────────────

export const aurumMenu: MenuItem[] = [
  { id: "dashboard",         label: "Dashboard",              icon: LayoutDashboard, path: "/dashboard"},
  { id: "exam-schedule",     label: "Exam Schedule",          icon: Calendar,        path: "/modules/crm/aurum/schedule" },
  { id: "registrations",     label: "Registered Candidates",  icon: Users,           path: "/modules/crm/aurum/registrations" },
  { id: "hall-tickets",      label: "Hall Tickets",           icon: ScrollText,      path: "/modules/crm/aurum/hall-tickets" },
  { id: "results",           label: "Exam Results",           icon: BadgeCheck,      path: "/modules/crm/aurum/results" },
  // { id: "settings",          label: "Settings",               icon: Settings,        path: "/modules/crm/aurum/settings" },
];



// ─── CRM Sub-Module: Program Fee ──────────────────────────────────────────────

export const programFeeMenu: MenuItem[] = [
  { id: "dashboard",       label: "Dashboard",           icon: LayoutDashboard,   path: "/dashboard"},
  { id: "fee-category",    label: "Fee Category",        icon: Settings,          path: "/modules/crm/feemanagement/fee-category" },
  { id: "tution-fee",      label: "Tution Fee",          icon: CreditCard,        path: "/modules/crm/feemanagement/tution-fee" },
  //{ id: "invoices",        label: "Invoices",            icon: ScrollText,        path: "/modules/crm/feemanagement/invoices" },
  // { id: "settings",        label: "Settings",            icon: Settings,          path: "/modules/crm/feemanagement/settings" },
];

// Admin variant of the program fee menu retains Invoice Config for admins
export const programFeeAdminMenu: MenuItem[] = [
  { id: "dashboard",       label: "Dashboard",           icon: LayoutDashboard,   path: "/dashboard"},
  { id: "fee-category",    label: "Fee Category",        icon: Settings,          path: "/modules/crm/feemanagement/fee-category" },
  { id: "tution-fee",      label: "Tution Fee",          icon: CreditCard,        path: "/modules/crm/feemanagement/tution-fee" },
  { id: "invoice-config",  label: "Invoice Config",      icon: CogIcon,           path: "/modules/crm/feemanagement/invoice-config" },
  //{ id: "invoices",        label: "Invoices",            icon: ScrollText,        path: "/modules/crm/feemanagement/invoices" },
  // { id: "settings",        label: "Settings",            icon: Settings,          path: "/modules/crm/feemanagement/settings" },
];

// Menu variant for admission roles — remove Invoice Config from view
export const programFeeMenuAdmissions: MenuItem[] = [
  { id: "dashboard",       label: "Dashboard",           icon: LayoutDashboard,   path: "/dashboard"},
  { id: "fee-category",    label: "Fee Category",        icon: Settings,          path: "/modules/crm/feemanagement/fee-category" },
  { id: "tution-fee",      label: "Tution Fee",          icon: CreditCard,        path: "/modules/crm/feemanagement/tution-fee" },
  //{ id: "invoices",        label: "Invoices",            icon: ScrollText,        path: "/modules/crm/feemanagement/invoices" },
  // { id: "settings",        label: "Settings",            icon: Settings,          path: "/modules/crm/feemanagement/settings" },
];

// ─── CRM Sub-Module: Reports ──────────────────────────────────────────────────

export const crmReportsMenu: MenuItem[] = [
  { id: "dashboard",         label: "Dashboard",         icon: LayoutDashboard, path: "/dashboard"},
  { id: "enquiry-reports",   label: "Enquiry Reports",   icon: BarChart3,       path: "/modules/crm/reports/enquiry" },
  { id: "admission-reports", label: "Admission Reports", icon: FileCheck2,      path: "/modules/crm/reports/admissions" },
  { id: "revenue-reports",   label: "Revenue Reports",   icon: TrendingUp,      path: "/modules/crm/reports/revenue" },
  { id: "counsellor-stats",  label: "Counsellor Stats",  icon: Users,           path: "/modules/crm/reports/counsellors" },
  { id: "export",            label: "Export Data",       icon: Download,        path: "/modules/crm/reports/export" },
];

// ─── CRM Sub-Module: Applicants (counsellor-level) ───────────────────────────

export const applicantMgmtMenu: MenuItem[] = [
  { id: "dashboard",        label: "Dashboard",       icon: LayoutDashboard, path: "/dashboard" },
  { id: "all-applicants",   label: "All Applications",icon: Users,           path: "/modules/crm/admissions/review" },
  { id: "ug-applications",  label: "UG Applications", icon: GraduationCap,   path: "/modules/crm/admissions/ug" },
  { id: "pg-applications",  label: "PG Applications", icon: BookOpen,        path: "/modules/crm/admissions/pg" },
  { id: "phd-applications", label: "Phd Applications",icon: Microscope,      path: "/modules/crm/admissions/phd" },
  { id: "undertaking",      label: "Undertaking",     icon: ClipboardCheck,  path: "/modules/crm/applicants/undertaking" },
];

