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

// ─── Admin: Institute & Academic Management ─── //

export const adminInstituteMenu: MenuItem[] = [
  { id: "dashboard",            label: "Dashboard",            icon: LayoutDashboard, path: "/dashboard" },
  { id: "institute-management", label: "Institutions", icon: GraduationCap,   path: "/modules/management/institutions" },
  { id: "school",               label: "School",               icon: Building2,       path: "/modules/management/school" },
  { id: "department",           label: "Department",           icon: Library,         path: "/modules/management/departments" },
  { id: "degree-management",    label: "Study Level",          icon: GraduationCap,   path: "/modules/management/study-level" },
  { id: "programme-management", label: "Program",            icon: BookOpen,        path: "/modules/management/programme-management" },
  { id: "reports",              label: "Reports",              icon: BarChart3,       path: "/modules/management/reports" },
];

// ─── Admin: User Management  ─── //

export const adminUserMenu: MenuItem[] = [
  { id: "dashboard",        label: "Dashboard",        icon: LayoutDashboard, path: "/dashboard" },
  { id: "role-management",  label: "Role Management",  icon: ShieldCheck,     path: "/modules/management/users/role-management" },
  { id: "create-employee",  label: "Create Employees", icon: UserPlus,        path: "/modules/management/users/create-employee" },
  { id: "employee-management", label: "Employee Management", icon: Users,     path: "/modules/management/users/employee-management" },
];
