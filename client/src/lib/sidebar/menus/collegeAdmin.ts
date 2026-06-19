import {
  BarChart3,
  BookOpen,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Library,
  ShieldCheck,
  Users,
  UserPlus,
} from "lucide-react";
import type { MenuItem } from "../types";

// ─── College Admin: Institution-scoped Management ─────────────────────────────
// Mirrors adminInstituteMenu but without the "Institute Management" tile
// (college admin manages within their single assigned institution).

export const collegeAdminInstituteMenu: MenuItem[] = [
  { id: "dashboard",            label: "Dashboard",            icon: LayoutDashboard, path: "/dashboard" },
  { id: "school",               label: "School",               icon: Building2,       path: "/modules/management/school" },
  { id: "department",           label: "Department",           icon: Library,         path: "/modules/management/departments" },
  { id: "study-level",          label: "Study Level",          icon: GraduationCap,   path: "/modules/management/study-level" },
  { id: "programme-management", label: "Programmes",           icon: BookOpen,        path: "/modules/management/programme-management" },
  { id: "reports",              label: "Reports",              icon: BarChart3,       path: "/modules/management/reports" },
];

// ─── College Admin: User Management ──────────────────────────────────────────

export const collegeAdminUserMenu: MenuItem[] = [
  { id: "dashboard",        label: "Dashboard",        icon: LayoutDashboard, path: "/dashboard" },
  { id: "role-management",  label: "Role Management",  icon: ShieldCheck,     path: "/modules/management/users/role-management" },
  { id: "create-employee",  label: "Create Employees", icon: UserPlus,        path: "/modules/management/users/create-employee" },
  { id: "employee-management", label: "Employee Management", icon: Users,     path: "/modules/management/users/employee-management" },
];
