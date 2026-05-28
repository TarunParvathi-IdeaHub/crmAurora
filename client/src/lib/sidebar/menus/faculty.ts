import {
  BookOpen,
  Calendar,
  CheckSquare,
  LayoutDashboard,
  Users,
} from "lucide-react";
import type { MenuItem } from "../types";

export const facultyMenu: MenuItem[] = [
  { id: "dashboard",    label: "Dashboard",     icon: LayoutDashboard, path: "/modules/faculty/assignments" },
  { id: "timetable",    label: "Time Table",    icon: Calendar,        path: "/modules/academic/timetable" },
  { id: "course-profile", label: "Course Profile", icon: BookOpen,    path: "/modules/student/courses" },
  { id: "attendance",   label: "Attendance",    icon: Users,           path: "/modules/academic/attendance" },
  { id: "assessments",  label: "Assessments",   icon: CheckSquare,     path: "/modules/faculty/grading" },
];
