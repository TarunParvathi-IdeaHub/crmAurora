import {
  ClipboardCheck,
  CreditCard,
  FileText,
  ReceiptText,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";
import type { MenuItem } from "../types";

export const ApplicantMenu: MenuItem[] = [
  { id: "undertaking", label: "Undertaking",       icon: ClipboardCheck, path: "/modules/crm/applicants/undertaking" },
  { id: "fees-pending", label: "Pending Payments", icon: CreditCard,     path: "/modules/crm/applicants/fees/pending" },
  { id: "fees-receipts", label: "Receipts",        icon: ReceiptText,    path: "/modules/crm/applicants/fees/receipts" },
];
