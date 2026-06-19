"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Eye,
  Pencil,
  EllipsisVertical,
  ShieldCheck,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Loader2,
  FileText,
  GraduationCap,
  Phone,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  BadgeIndianRupee,
  ThumbsUp,
  ThumbsDown,
  Lock,
} from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";
import UploadDocumentsStep from "@/components/applicant/application/steps/UploadDocumentsStep";
import type { DocumentFile, UploadedDocuments } from "@/types/applicant";
import FeeConcessionDialog from "@/components/applicant/application/FeeConcessionDialog";
import {
  canManageFeeConcession,
  canUseFeeConcession,
  canVerifyDocuments,
} from "@/lib/utils/feeConcession";
import {
  admitApplicant,
  rejectApplicant,
  fetchAdmitDialogData,
  type AdmitDialogData,
} from "@/lib/api/admission";

// ── Finalization guard ────────────────────────────────────────────────────────

function isFinalized(status: ApplicationStatus): boolean {
  return status === "ADMISSION_GRANTED" || status === "ADMISSION_REJECTED";
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ApplicationStatus =
  | "SAVED_AS_DRAFT"
  | "APPLICATION_FEE_DUE"
  | "APPLICATION_FEE_PAID"
  | "APPLICATION_SUBMITTED"
  | "AURUM_EXAM_PENDING"
  | "AURUM_EXAM_PASSED"
  | "AURUM_EXAM_FAILED"
  | "DOCUMENT_VERIFICATION_PENDING"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_VERIFICATION_FAILED"
  | "REGISTRATION_FEE_DUE"
  | "TUITION_FEE_DUE"
  | "STUDENT_ADMISSION_UNDERTAKING_PENDING"
  | "STUDENT_ADMISSION_UNDERTAKING_SUBMITTED"
  | "ADMISSION_GRANTED"
  | "ADMISSION_REJECTED";

type StaffInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
};

type Application = {
  id: string;
  applicationStatus: ApplicationStatus;
  firstName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  studyLevel: string;
  programApplied: string;
  admissionCycle: string;
  // Only present for director/incharge
  admissionCounsellor?: StaffInfo | null;
  admissionConsultant?: StaffInfo | null;
};

type ApplicationDetail = {
  id: string;
  applicationStatus: ApplicationStatus;
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
  gender: string | null;
  fatherName: string | null;
  fatherMobileNo: string | null;
  fatherEmail: string | null;
  motherName: string | null;
  motherMobileNo: string | null;
  motherEmail: string | null;
  dateOfBirth: string | null;
  aadharNo: string | null;
  bloodGroup: string | null;
  caste: string | null;
  subCaste: string | null;
  state: string | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  quallingEntranceExam: string | null;
  entranceExamHallTicketNo: string | null;
  entranceExamRank: string | null;
  intrestedInAurumExam: boolean;
  applicationStatus_label?: string;
  documents: Record<DocumentKey, string | null>;
  degreeLevel: { levelName: string };
  program: { programName: string; programCode?: string };
  admissionCycle: { admissionCycleName: string };
  institution: { institutionName: string; institutionCode?: string };
  studentEducationDetails: EducationDetail[];
  createdAt: string;
  updatedAt: string;
};

type EducationDetail = {
  id: string;
  sscBoard: string | null;
  sscYearOfPassing: number | null;
  sscHallTicketNo: string | null;
  sscInstitutionName: string | null;
  sscPercentage: number | null;
  intermediateBoard: string | null;
  intermediateYearOfPassing: number | null;
  intermediateHallTicketNo: string | null;
  intermediateInstitutionName: string | null;
  intermediatePercentage: number | null;
  ugBoard: string | null;
  ugYearOfPassing: number | null;
  ugHallTicketNo: string | null;
  ugInstitutionName: string | null;
  ugPercentage: number | null;
  pgBoard: string | null;
  pgYearOfPassing: number | null;
  pgHallTicketNo: string | null;
  pgInstitutionName: string | null;
  pgPercentage: number | null;
};

type PaymentInfo = {
  paymentStatus: string | null;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  amount: number | null;
  amountPaid: number | null;
  amountDue: number | null;
  paidAt: string | null;
};

function createEmptyEducationDetail(): EducationDetail {
  return {
    id: "",
    sscBoard: null,
    sscYearOfPassing: null,
    sscHallTicketNo: null,
    sscInstitutionName: null,
    sscPercentage: null,
    intermediateBoard: null,
    intermediateYearOfPassing: null,
    intermediateHallTicketNo: null,
    intermediateInstitutionName: null,
    intermediatePercentage: null,
    ugBoard: null,
    ugYearOfPassing: null,
    ugHallTicketNo: null,
    ugInstitutionName: null,
    ugPercentage: null,
    pgBoard: null,
    pgYearOfPassing: null,
    pgHallTicketNo: null,
    pgInstitutionName: null,
    pgPercentage: null,
  };
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function dlIsPG(dl: string): boolean {
  const n = dl.toLowerCase();
  return n.includes("post graduate") || n.includes("post graduation") || n.includes("pg");
}

function dlIsPhd(dl: string): boolean {
  const n = dl.toLowerCase();
  return n.includes("doctor of philosophy") || n.includes("phd");
}

async function fetchPaymentInfo(applicationId: string): Promise<PaymentInfo | null> {
  try {
    const res = await fetch(`${API_BASE}/api/application-fee/status/${applicationId}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as PaymentInfo;
    return json;
  } catch {
    return null;
  }
}

type DocumentKey = keyof UploadedDocuments;

const DOCUMENT_LABELS: Record<DocumentKey, string> = {
  aadharCard: "Aadhaar Card",
  passportPhoto: "Photograph",
  studentSignature: "Signature",
  sscMemo: "SSC / 10th Memo",
  intermediateMemo: "Intermediate / 12th Memo",
  ugMemo: "UG Degree Certificate",
  pgMemo: "PG Degree Certificate",
  gapCertificate: "Gap Certificate",
  bonafideCertificate: "Bonafide Certificate",
  transferCertificate: "Transfer Certificate",
};

const DOCUMENT_KEYS: DocumentKey[] = [
  "aadharCard",
  "passportPhoto",
  "studentSignature",
  "sscMemo",
  "intermediateMemo",
  "ugMemo",
  "pgMemo",
  "gapCertificate",
  "bonafideCertificate",
  "transferCertificate",
];

const EMPTY_DOCUMENTS: UploadedDocuments = {
  aadharCard: null,
  passportPhoto: null,
  studentSignature: null,
  sscMemo: null,
  intermediateMemo: null,
  ugMemo: null,
  pgMemo: null,
  gapCertificate: null,
  bonafideCertificate: null,
  transferCertificate: null,
};

function buildDocumentFile(url: string | null, label: string): DocumentFile {
  return url
    ? { name: label, size: 0, previewUrl: url, file: null }
    : null;
}

// ── Types (filter) ──────────────────────────────────────────────────────────

export type ApplicationFilter = "all" | "ug" | "pg" | "phd";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const PAGE_SIZE = 10;

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; className: string; icon: "draft" | "pending" | "ok" | "fail" }
> = {
  SAVED_AS_DRAFT:                          { label: "Draft",                        className: "bg-slate-100 text-slate-600 border-slate-200",   icon: "draft"   },
  APPLICATION_FEE_DUE:                     { label: "Fee Due",                      className: "bg-amber-50 text-amber-700 border-amber-200",     icon: "pending" },
  APPLICATION_FEE_PAID:                    { label: "Fee Paid",                     className: "bg-blue-50 text-blue-700 border-blue-200",        icon: "ok"      },
  APPLICATION_SUBMITTED:                   { label: "Submitted",                    className: "bg-indigo-50 text-indigo-700 border-indigo-200",   icon: "ok"      },
  AURUM_EXAM_PENDING:                      { label: "Exam Pending",                 className: "bg-amber-50 text-amber-700 border-amber-200",     icon: "pending" },
  AURUM_EXAM_PASSED:                       { label: "Exam Passed",                  className: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: "ok"      },
  AURUM_EXAM_FAILED:                       { label: "Exam Failed",                  className: "bg-rose-50 text-rose-700 border-rose-200",        icon: "fail"    },
  DOCUMENT_VERIFICATION_PENDING:           { label: "Docs Pending",                 className: "bg-amber-50 text-amber-700 border-amber-200",     icon: "pending" },
  DOCUMENT_VERIFIED:                       { label: "Docs Verified",                className: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: "ok"      },
  DOCUMENT_VERIFICATION_FAILED:            { label: "Docs Failed",                  className: "bg-rose-50 text-rose-700 border-rose-200",        icon: "fail"    },
  REGISTRATION_FEE_DUE:                    { label: "Reg. Fee Due",                 className: "bg-amber-50 text-amber-700 border-amber-200",     icon: "pending" },
  TUITION_FEE_DUE:                         { label: "Tuition Fee Due",              className: "bg-amber-50 text-amber-700 border-amber-200",     icon: "pending" },
  STUDENT_ADMISSION_UNDERTAKING_PENDING:   { label: "Undertaking Pending",          className: "bg-amber-50 text-amber-700 border-amber-200",     icon: "pending" },
  STUDENT_ADMISSION_UNDERTAKING_SUBMITTED: { label: "Undertaking Submitted",        className: "bg-blue-50 text-blue-700 border-blue-200",        icon: "ok"      },
  ADMISSION_GRANTED:                       { label: "Admitted",                     className: "bg-emerald-50 text-emerald-700 border-emerald-200",icon: "ok"      },
  ADMISSION_REJECTED:                      { label: "Rejected",                     className: "bg-rose-50 text-rose-700 border-rose-200",        icon: "fail"    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildApiUrl(
  role: string,
  filter: ApplicationFilter,
  institutionId: string,
  entityId: string,
): string {
  const filterSegment = filter === "all" ? "" : `/${filter}`;

  if (role === "admissionDirector" || role === "admissionIncharge") {
    return filter === "all"
      ? `${API_BASE}/api/applications/getall/${institutionId}`
      : `${API_BASE}/api/applications${filterSegment}/${institutionId}`;
  }
  if (role === "admissionCounsellor") {
    return filter === "all"
      ? `${API_BASE}/api/applications/counsellor/${institutionId}/${entityId}`
      : `${API_BASE}/api/applications/counsellor${filterSegment}/${institutionId}/${entityId}`;
  }
  if (role === "admissionConsultant") {
    return filter === "all"
      ? `${API_BASE}/api/applications/consultant/${institutionId}/${entityId}`
      : `${API_BASE}/api/applications/consultant${filterSegment}/${institutionId}/${entityId}`;
  }
  return "";
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "draft" as const,
  };
  const Icon =
    meta.icon === "ok"
      ? CheckCircle2
      : meta.icon === "fail"
      ? XCircle
      : meta.icon === "pending"
      ? Clock
      : FileText;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-md bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value?.trim() || "—"}</span>
    </div>
  );
}

function FormRow({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  rows = 3,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      {textarea ? (
        <textarea
          value={value ?? ""}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[68px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      )}
    </div>
  );
}

function FormSelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ReviewApplicantsProps {
  filter?: ApplicationFilter;
  pageTitle?: string;
  pageDescription?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReviewApplicants({
  filter = "all",
  pageTitle,
  pageDescription,
}: ReviewApplicantsProps = {}) {
  const { profile } = useProfile();
  const role = useRole();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("search") ?? "";
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Detail panel
  const [viewApp, setViewApp] = useState<Application | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailPaymentInfo, setDetailPaymentInfo] = useState<PaymentInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Edit panel
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [editStatus, setEditStatus] = useState<ApplicationStatus>("SAVED_AS_DRAFT");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDetail, setEditDetail] = useState<ApplicationDetail | null>(null);
  const [editPaymentInfo, setEditPaymentInfo] = useState<PaymentInfo | null>(null);
  const [editDocuments, setEditDocuments] = useState<UploadedDocuments>(EMPTY_DOCUMENTS);
  const [editDetailLoading, setEditDetailLoading] = useState(false);
  const [editDetailError, setEditDetailError] = useState("");
  const [feeConcessionApplicationId, setFeeConcessionApplicationId] = useState<string | null>(null);

  // Admit dialog
  const [admitDialogApp, setAdmitDialogApp] = useState<Application | null>(null);
  const [admitDialogData, setAdmitDialogData] = useState<AdmitDialogData | null>(null);
  const [admitDialogLoading, setAdmitDialogLoading] = useState(false);
  const [admitDialogError, setAdmitDialogError] = useState("");
  const [admitSaving, setAdmitSaving] = useState(false);
  const [admitError, setAdmitError] = useState("");

  // Reject dialog
  const [rejectDialogApp, setRejectDialogApp] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState("");

  const updateEditEducation = useCallback((field: keyof EducationDetail, value: string) => {
    setEditDetail((prev) => {
      if (!prev) return prev;
      const existing = prev.studentEducationDetails?.[0] ?? createEmptyEducationDetail();
      const normalized = {
        ...existing,
        [field]:
          field.endsWith("YearOfPassing")
            ? value.trim() === ""
              ? null
              : Number(value)
            : field.endsWith("Percentage")
            ? value.trim() === ""
              ? null
              : Number(value)
            : value.trim() || null,
      } as EducationDetail;
      return { ...prev, studentEducationDetails: [{ ...normalized, id: normalized.id || existing.id }] };
    });
  }, []);

  const handleDocumentChange = useCallback((updates: Partial<UploadedDocuments>) => {
    setEditDocuments((prev) => ({ ...prev, ...updates }));
  }, []);

  // 3-dots dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const isDirectorOrIncharge =
    role === "admissionDirector" || role === "admissionIncharge";
  const canOpenFeeConcession = canUseFeeConcession(role);
  const canEditDocuments =
    role !== "admissionCounsellor" && role !== "admissionConsultant";

  const colCount = isDirectorOrIncharge ? 8 : 7;

  // ── Fetch applications ─────────────────────────────────────────────────────

  const fetchApplications = useCallback(() => {
    if (!profile || !role) return;

    const institutionId = profile.institution?.id;
    const entityId = profile.entityId ?? "";

    if (!institutionId) {
      setError("Institution not found in your profile.");
      setLoading(false);
      return;
    }

    const url = buildApiUrl(role, filter, institutionId, entityId);
    if (!url) {
      setError("You do not have permission to view applications.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setApplications([]);

    fetch(url, { credentials: "include" })
      .then((r) => r.json() as Promise<{ count?: number; data?: Application[]; error?: string }>)
      .then((res) => {
        if (res.data) {
          setApplications(res.data);
        } else {
          setError(res.error ?? "No applications found.");
        }
      })
      .catch(() => setError("Failed to connect to server."))
      .finally(() => setLoading(false));
  }, [filter, profile, role]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchApplications();
    });
  }, [fetchApplications]);

  // ── Open detail panel ──────────────────────────────────────────────────────

  function openDetail(app: Application) {
    setViewApp(app);
    setDetail(null);
    setDetailLoading(true);
    setDetailError("");

    // Use the student-application/get endpoint — no ownership check, works for all roles
    const url = `${API_BASE}/api/student-application/get/${app.id}`;

    fetch(url, { credentials: "include" })
      .then((r) => r.json() as Promise<{ data?: ApplicationDetail; error?: string }>)
      .then(async (res) => {
        if (res.error) {
          setDetailError(res.error);
        } else if (res.data) {
          setDetail(res.data);
          const paymentInfo = await fetchPaymentInfo(app.id);
          setDetailPaymentInfo(paymentInfo);
        } else {
          setDetailError("Failed to load application details.");
        }
      })
      .catch(() => setDetailError("Failed to load application details."))
      .finally(() => setDetailLoading(false));
  }

  // ── Edit application ────────────────────────────────────────────────────────

  const openEdit = useCallback((app: Application) => {
    setEditApp(app);
    setEditStatus(app.applicationStatus);
    setEditError("");
    setEditDetail(null);
    setEditDocuments(EMPTY_DOCUMENTS);
    setEditDetailError("");
    setEditDetailLoading(true);

    const setDocs = (documents: ApplicationDetail["documents"]) => {
      setEditDocuments({
        aadharCard: buildDocumentFile(documents.aadharCard, DOCUMENT_LABELS.aadharCard),
        passportPhoto: buildDocumentFile(documents.passportPhoto, DOCUMENT_LABELS.passportPhoto),
        studentSignature: buildDocumentFile(documents.studentSignature, DOCUMENT_LABELS.studentSignature),
        sscMemo: buildDocumentFile(documents.sscMemo, DOCUMENT_LABELS.sscMemo),
        intermediateMemo: buildDocumentFile(documents.intermediateMemo, DOCUMENT_LABELS.intermediateMemo),
        ugMemo: buildDocumentFile(documents.ugMemo, DOCUMENT_LABELS.ugMemo),
        pgMemo: buildDocumentFile(documents.pgMemo, DOCUMENT_LABELS.pgMemo),
        gapCertificate: buildDocumentFile(documents.gapCertificate, DOCUMENT_LABELS.gapCertificate),
        bonafideCertificate: buildDocumentFile(documents.bonafideCertificate, DOCUMENT_LABELS.bonafideCertificate),
        transferCertificate: buildDocumentFile(documents.transferCertificate, DOCUMENT_LABELS.transferCertificate),
      });
    };

    if (detail?.id === app.id) {
      setEditDetail(detail);
      setDocs(detail.documents);
      setEditDetailLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/student-application/get/${app.id}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ data?: ApplicationDetail; error?: string }>)
      .then(async (res) => {
        if (res.error) {
          setEditDetailError(res.error);
        } else if (res.data) {
          setEditDetail(res.data);
          setDocs(res.data.documents);
          const paymentInfo = await fetchPaymentInfo(app.id);
          setEditPaymentInfo(paymentInfo);
        } else {
          setEditDetailError("Failed to load application details.");
        }
      })
      .catch(() => setEditDetailError("Failed to load application details."))
      .finally(() => setEditDetailLoading(false));
  }, [detail]);

  useEffect(() => {
    if (!searchQuery || applications.length === 0) return;
    const q = searchQuery.toLowerCase().trim();
    const match = applications.find((a) =>
      (a.email ?? "").toLowerCase().includes(q) ||
      (a.mobileNo ?? "").includes(q) ||
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q)
    );
    if (match) {
      // Open edit for the matching application when search is prefilled.
      queueMicrotask(() => {
        openEdit(match);
      });
    }
  }, [applications, openEdit, searchQuery]);

  function openFeeConcession(app: Application) {
    if (!canManageFeeConcession(app.applicationStatus)) return;
    setFeeConcessionApplicationId(app.id);
    setOpenMenuId(null);
  }

  function openDocumentVerification(app: Application) {
    if (!canVerifyDocuments(app.applicationStatus)) return;
    setOpenMenuId(null);
    router.push(`/modules/crm/admissions/document-verification/${app.id}`);
  }

  function openAdmitDialog(app: Application) {
    if (isFinalized(app.applicationStatus)) return;
    setOpenMenuId(null);
    setAdmitDialogApp(app);
    setAdmitDialogData(null);
    setAdmitDialogError("");
    setAdmitError("");
    setAdmitDialogLoading(true);

    fetchAdmitDialogData(app.id)
      .then(({ data, error }) => {
        if (error) setAdmitDialogError(error);
        else if (data) setAdmitDialogData(data);
      })
      .catch(() => setAdmitDialogError("Failed to load admit data."))
      .finally(() => setAdmitDialogLoading(false));
  }

  function openRejectDialog(app: Application) {
    if (isFinalized(app.applicationStatus)) return;
    setOpenMenuId(null);
    setRejectDialogApp(app);
    setRejectReason("");
    setRejectError("");
  }

  async function handleAdmit() {
    if (!admitDialogApp || admitSaving) return;
    setAdmitSaving(true);
    setAdmitError("");

    const { error, applicationStatus } = await admitApplicant(admitDialogApp.id);
    setAdmitSaving(false);

    if (error) {
      setAdmitError(error);
      return;
    }

    // Update list + close dialog
    const newStatus = (applicationStatus ?? "ADMISSION_GRANTED") as ApplicationStatus;
    setApplications((prev) =>
      prev.map((a) => (a.id === admitDialogApp.id ? { ...a, applicationStatus: newStatus } : a))
    );
    setAdmitDialogApp(null);
    setAdmitDialogData(null);
  }

  async function handleReject() {
    if (!rejectDialogApp || rejectSaving || !rejectReason.trim()) return;
    setRejectSaving(true);
    setRejectError("");

    const { error, applicationStatus } = await rejectApplicant(rejectDialogApp.id, rejectReason.trim());
    setRejectSaving(false);

    if (error) {
      setRejectError(error);
      return;
    }

    const newStatus = (applicationStatus ?? "ADMISSION_REJECTED") as ApplicationStatus;
    setApplications((prev) =>
      prev.map((a) => (a.id === rejectDialogApp.id ? { ...a, applicationStatus: newStatus } : a))
    );
    setRejectDialogApp(null);
    setRejectReason("");
  }

  function updateEditDetail(field: keyof ApplicationDetail, value: string | boolean | null) {
    setEditDetail((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function saveEdit() {
    if (!editApp || !profile || !editDetail) return;
    setEditSaving(true);
    setEditError("");
    const entityId = profile.entityId ?? "";

    const formData = new FormData();
    formData.append("applicationStatus", editStatus);
    formData.append("firstName", editDetail.firstName ?? "");
    formData.append("lastName", editDetail.lastName ?? "");
    formData.append("email", editDetail.email ?? "");
    formData.append("mobileNo", editDetail.mobileNo ?? "");
    formData.append("gender", editDetail.gender ?? "");
    formData.append("fatherName", editDetail.fatherName ?? "");
    formData.append("fatherMobileNo", editDetail.fatherMobileNo ?? "");
    formData.append("fatherEmail", editDetail.fatherEmail ?? "");
    formData.append("motherName", editDetail.motherName ?? "");
    formData.append("motherMobileNo", editDetail.motherMobileNo ?? "");
    formData.append("motherEmail", editDetail.motherEmail ?? "");
    formData.append("dateOfBirth", editDetail.dateOfBirth ? editDetail.dateOfBirth.split("T")[0] : "");
    formData.append("aadharNo", editDetail.aadharNo ?? "");
    formData.append("bloodGroup", editDetail.bloodGroup ?? "");
    formData.append("caste", editDetail.caste ?? "");
    formData.append("subCaste", editDetail.subCaste ?? "");
    formData.append("state", editDetail.state ?? "");
    formData.append("presentAddress", editDetail.presentAddress ?? "");
    formData.append("permanentAddress", editDetail.permanentAddress ?? "");
    formData.append("quallingEntranceExam", editDetail.quallingEntranceExam ?? "");
    formData.append("entranceExamHallTicketNo", editDetail.entranceExamHallTicketNo ?? "");
    formData.append("entranceExamRank", editDetail.entranceExamRank ?? "");
    formData.append("intrestedInAurumExam", String(editDetail.intrestedInAurumExam));

    // Education details
    const education = editDetail.studentEducationDetails?.[0];
    if (education) {
      formData.append("sscBoard", education.sscBoard ?? "");
      formData.append("sscInstitutionName", education.sscInstitutionName ?? "");
      formData.append("sscHallTicketNo", education.sscHallTicketNo ?? "");
      formData.append("sscYearOfPassing", education.sscYearOfPassing?.toString() ?? "");
      formData.append("sscPercentage", education.sscPercentage?.toString() ?? "");
      formData.append("intermediateBoard", education.intermediateBoard ?? "");
      formData.append("intermediateInstitutionName", education.intermediateInstitutionName ?? "");
      formData.append("intermediateHallTicketNo", education.intermediateHallTicketNo ?? "");
      formData.append("intermediateYearOfPassing", education.intermediateYearOfPassing?.toString() ?? "");
      formData.append("intermediatePercentage", education.intermediatePercentage?.toString() ?? "");
      formData.append("ugBoard", education.ugBoard ?? "");
      formData.append("ugInstitutionName", education.ugInstitutionName ?? "");
      formData.append("ugHallTicketNo", education.ugHallTicketNo ?? "");
      formData.append("ugYearOfPassing", education.ugYearOfPassing?.toString() ?? "");
      formData.append("ugPercentage", education.ugPercentage?.toString() ?? "");
      formData.append("pgBoard", education.pgBoard ?? "");
      formData.append("pgInstitutionName", education.pgInstitutionName ?? "");
      formData.append("pgHallTicketNo", education.pgHallTicketNo ?? "");
      formData.append("pgYearOfPassing", education.pgYearOfPassing?.toString() ?? "");
      formData.append("pgPercentage", education.pgPercentage?.toString() ?? "");
    }

    for (const key of DOCUMENT_KEYS) {
      const doc = editDocuments[key];
      if (doc?.file) {
        formData.append(key, doc.file, doc.name);
      }
    }

    const updateUrl = isDirectorOrIncharge
      ? `${API_BASE}/api/applications/director/${editApp.id}`
      : `${API_BASE}/api/applications/${entityId}/${editApp.id}`;

    fetch(updateUrl, {
      method: "PUT",
      credentials: "include",
      body: formData,
    })
      .then((r) => r.json() as Promise<{ error?: string; application?: Application }>)
      .then((res) => {
        if (res.error) {
          setEditError(res.error);
        } else {
          setApplications((prev) =>
            prev.map((a) =>
              a.id === editApp.id
                ? {
                    ...a,
                    firstName: editDetail.firstName,
                    lastName: editDetail.lastName,
                    email: editDetail.email,
                    mobileNo: editDetail.mobileNo,
                    applicationStatus: editStatus,
                    studyLevel: editDetail.degreeLevel?.levelName ?? a.studyLevel,
                    programApplied: editDetail.program?.programName ?? a.programApplied,
                    admissionCycle: editDetail.admissionCycle?.admissionCycleName ?? a.admissionCycle,
                  }
                : a
            )
          );
          setViewApp((prev) =>
            prev && prev.id === editApp.id
              ? {
                  ...prev,
                  firstName: editDetail.firstName,
                  lastName: editDetail.lastName,
                  email: editDetail.email,
                  mobileNo: editDetail.mobileNo,
                  applicationStatus: editStatus,
                  studyLevel: editDetail.degreeLevel?.levelName ?? prev.studyLevel,
                  programApplied: editDetail.program?.programName ?? prev.programApplied,
                  admissionCycle: editDetail.admissionCycle?.admissionCycleName ?? prev.admissionCycle,
                }
              : prev
          );
          setDetail((prev) =>
            prev && prev.id === editApp.id
              ? {
                  ...prev,
                  firstName: editDetail.firstName,
                  lastName: editDetail.lastName,
                  email: editDetail.email,
                  mobileNo: editDetail.mobileNo,
                  applicationStatus: editStatus,
                  degreeLevel: editDetail.degreeLevel ?? prev.degreeLevel,
                  program: editDetail.program ?? prev.program,
                  admissionCycle: editDetail.admissionCycle ?? prev.admissionCycle,
                }
              : prev
          );
          setEditApp(null);
        }
      })
      .catch(() => setEditError("Failed to save changes."))
      .finally(() => setEditSaving(false));
  }

  // ── Filtered + paginated ────────────────────────────────────────────────────

  const filtered = applications.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.mobileNo.includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.programApplied.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!loading && error && applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
        <div className="mb-4 rounded-full bg-rose-50 p-4">
          <Users size={28} className="text-rose-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">No Applications Found</h3>
        <p className="mt-1 max-w-xs text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Optional page header — shown when pageTitle prop is provided */}
      {pageTitle && (
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
          {pageDescription && (
            <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
          )}
        </div>
      )}
      {/* Search + stats */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search name, phone, app. no., program…"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {loading ? "Loading…" : `${filtered.length} applicant${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 w-10">S.No</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Study Level</th>
              <th className="px-4 py-3">Programme</th>
              <th className="px-4 py-3">Cycle</th>
              {isDirectorOrIncharge && <th className="px-4 py-3">Assigned To</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} cols={colCount + 1} />
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount + 1}
                  className="px-4 py-14 text-center text-sm text-slate-400"
                >
                  {searchQuery ? "No applications match your search." : "No applications yet."}
                </td>
              </tr>
            ) : (
              paginated.map((app, idx) => {
                const sNo = (currentPage - 1) * PAGE_SIZE + idx + 1;
                const assignedTo =
                  app.admissionCounsellor
                    ? `${app.admissionCounsellor.firstName} ${app.admissionCounsellor.lastName}`
                    : app.admissionConsultant
                    ? `${app.admissionConsultant.firstName} ${app.admissionConsultant.lastName}`
                    : "—";

                return (
                  <tr key={app.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 font-medium">{sNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{app.mobileNo}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {app.studyLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-44 truncate">
                      {app.programApplied}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {app.admissionCycle}
                    </td>
                    {isDirectorOrIncharge && (
                      <td className="px-4 py-3 text-slate-600">{assignedTo}</td>
                    )}
                    <td className="px-4 py-3">
                      <StatusBadge status={app.applicationStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* View */}
                        <button
                          type="button"
                          title="View application details"
                          onClick={() => openDetail(app)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit — locked when finalized */}
                        <button
                          type="button"
                          title={isFinalized(app.applicationStatus) ? "Cannot edit a finalized application" : "Edit application"}
                          onClick={() => !isFinalized(app.applicationStatus) && openEdit(app)}
                          disabled={isFinalized(app.applicationStatus)}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                            isFinalized(app.applicationStatus)
                              ? "cursor-not-allowed text-slate-200"
                              : "text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                          }`}
                        >
                          <Pencil size={14} />
                        </button>

                        {/* 3-dots */}
                        <div className="relative">
                          <button
                            type="button"
                            title="More actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = e.currentTarget as HTMLElement;
                              const rect = el.getBoundingClientRect();
                              setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                              setOpenMenuId(openMenuId === app.id ? null : app.id);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <EllipsisVertical size={15} />
                          </button>

                          {openMenuId === app.id && menuPos && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div
                                ref={menuRef}
                                style={{
                                  position: "fixed",
                                  left: Math.max(
                                    Math.min(menuPos.x + menuPos.w - 176, window.innerWidth - 192),
                                    8
                                  ),
                                  top: menuPos.y + menuPos.h + 4,
                                }}
                                className="z-50 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                              >
                                 {(() => {
                                   const appFinalized = isFinalized(app.applicationStatus);
                                   const canVerifyDocumentsForApp = !appFinalized && canVerifyDocuments(app.applicationStatus);
                                   const canManageFeeConcessionForApp = !appFinalized && canManageFeeConcession(app.applicationStatus);

                                   return (
                                     <>
                                       {isDirectorOrIncharge && (
                                         <button
                                           type="button"
                                           disabled={!canVerifyDocumentsForApp}
                                           onClick={() => openDocumentVerification(app)}
                                           className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${canVerifyDocumentsForApp ? "text-slate-700 hover:bg-slate-50" : "cursor-not-allowed text-slate-300"}`}
                                         >
                                           <ShieldCheck size={14} className={canVerifyDocumentsForApp ? "text-emerald-500" : "text-slate-300"} />
                                           Document Verification
                                         </button>
                                       )}
                                       {canOpenFeeConcession && (
                                         <button
                                           type="button"
                                           disabled={!canManageFeeConcessionForApp}
                                           onClick={() => openFeeConcession(app)}
                                           className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${canManageFeeConcessionForApp ? "text-slate-700 hover:bg-slate-50" : "cursor-not-allowed text-slate-300"}`}
                                         >
                                           <BadgeIndianRupee size={14} className={canManageFeeConcessionForApp ? "text-blue-500" : "text-slate-300"} />
                                           Fee Concession
                                         </button>
                                       )}
                                       {isDirectorOrIncharge && <div className="my-1 border-t border-slate-100" />}
                                       {isDirectorOrIncharge && (
                                         <button
                                           type="button"
                                           disabled={appFinalized}
                                           onClick={() => openAdmitDialog(app)}
                                           className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${appFinalized ? "cursor-not-allowed text-slate-300" : "text-emerald-700 hover:bg-emerald-50"}`}
                                         >
                                           {appFinalized ? <Lock size={14} className="text-slate-300" /> : <ThumbsUp size={14} className="text-emerald-500" />}
                                           {app.applicationStatus === "ADMISSION_GRANTED" ? "Admitted ✓" : "Admit Applicant"}
                                         </button>
                                       )}
                                       {isDirectorOrIncharge && (
                                         <button
                                           type="button"
                                           disabled={appFinalized}
                                           onClick={() => openRejectDialog(app)}
                                           className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${appFinalized ? "cursor-not-allowed text-slate-300" : "text-rose-700 hover:bg-rose-50"}`}
                                         >
                                           {appFinalized ? <Lock size={14} className="text-slate-300" /> : <ThumbsDown size={14} className="text-rose-500" />}
                                           {app.applicationStatus === "ADMISSION_REJECTED" ? "Rejected ✓" : "Reject Application"}
                                         </button>
                                       )}
                                     </>
                                   );
                                 })()}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} &mdash; {filtered.length} total
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item as number)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                      currentPage === item
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Application Detail Panel ────────────────────────────────────────── */}
      {viewApp && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm overflow-y-auto">
          <div className="relative flex h-auto w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {viewApp.firstName} {viewApp.lastName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {viewApp.programApplied} &mdash; {viewApp.studyLevel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={viewApp.applicationStatus} />
                <button
                  type="button"
                  onClick={() => { setViewApp(null); setDetail(null); }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
                      {detailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : detailError ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {detailError}
                </div>
              ) : detail ? (
                <>
                  <ApplicationDetailContent detail={detail} />
                  {detailPaymentInfo && (
                    <Section icon={<FileText size={15} />} title="Payment Details">
                      <div className="grid grid-cols-2 gap-3">
                        <InfoRow label="Payment Status" value={detailPaymentInfo.paymentStatus ?? "—"} />
                        <InfoRow label="Invoice Number" value={detailPaymentInfo.invoiceNumber} />
                        <InfoRow label="Receipt Number" value={detailPaymentInfo.receiptNumber} />
                        <InfoRow label="Amount" value={formatCurrency(detailPaymentInfo.amount)} />
                        <InfoRow label="Amount Paid" value={formatCurrency(detailPaymentInfo.amountPaid)} />
                        <InfoRow label="Amount Due" value={formatCurrency(detailPaymentInfo.amountDue)} />
                        <InfoRow label="Paid At" value={detailPaymentInfo.paidAt ? new Date(detailPaymentInfo.paidAt).toLocaleString("en-IN") : null} />
                      </div>
                    </Section>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Application Panel ─────────────────────────────────────────── */}
      {editApp && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm overflow-y-auto">
          <div className="relative flex h-auto w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Pencil size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Edit Application</h3>
                  <p className="text-xs text-slate-400">{editApp.firstName} {editApp.lastName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditApp(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {editDetailLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : editDetailError ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {editDetailError}
                </div>
              ) : editDetail ? (
                <ApplicationDetailForm
                  detail={editDetail}
                  onChange={updateEditDetail}
                  onEducationChange={updateEditEducation}
                  paymentInfo={editPaymentInfo}
                  documents={editDocuments}
                  onDocumentsChange={handleDocumentChange}
                  showDocuments={true}
                />
              ) : null}

              <div className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-slate-500">Application Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ApplicationStatus)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {(Object.keys(STATUS_META) as ApplicationStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>

                {editError && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    {editError}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setEditApp(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={editSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      <FeeConcessionDialog
        applicationId={feeConcessionApplicationId ?? ""}
        open={Boolean(feeConcessionApplicationId)}
        onOpenChange={(open) => {
          if (!open) setFeeConcessionApplicationId(null);
        }}
      />

      {/* ── Admit Dialog ──────────────────────────────────────────────────── */}
      {admitDialogApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <ThumbsUp size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Admit Applicant</h3>
                  <p className="text-xs text-slate-400">
                    {admitDialogApp.firstName} {admitDialogApp.lastName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setAdmitDialogApp(null); setAdmitDialogData(null); }}
                disabled={admitSaving}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {admitDialogLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                </div>
              )}

              {admitDialogError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {admitDialogError}
                </div>
              )}

              {!admitDialogLoading && admitDialogData && (
                <>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Admitting this applicant will create a <strong>Student record</strong> and update all linked fee records. This action is <strong>irreversible</strong>.
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                    {[
                      { label: "Programme", value: admitDialogData.program?.programName ?? "—" },
                      { label: "Degree Level", value: admitDialogData.degreeLevel?.levelName ?? "—" },
                      { label: "Batch", value: admitDialogData.batch?.batchName ?? "Not assigned" },
                      { label: "School", value: admitDialogData.program?.school?.name ?? "—" },
                      { label: "Department", value: admitDialogData.program?.department?.name ?? "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-slate-500 font-medium">{label}</span>
                        <span className="text-slate-800 font-semibold text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                  {!admitDialogData.batch && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      No batch assigned. Please assign a fee concession and batch before admitting.
                    </div>
                  )}
                </>
              )}

              {admitError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {admitError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => { setAdmitDialogApp(null); setAdmitDialogData(null); }}
                disabled={admitSaving}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-admit"
                type="button"
                onClick={handleAdmit}
                disabled={admitSaving || admitDialogLoading || !admitDialogData?.batch}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {admitSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {admitSaving ? "Admitting..." : "Confirm Admit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Dialog ─────────────────────────────────────────────────── */}
      {rejectDialogApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <ThumbsDown size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Reject Application</h3>
                  <p className="text-xs text-slate-400">
                    {rejectDialogApp.firstName} {rejectDialogApp.lastName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setRejectDialogApp(null); setRejectReason(""); }}
                disabled={rejectSaving}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Rejecting this application is <strong>irreversible</strong>. Please provide a reason so the applicant understands why their application was not approved.
              </p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reject-reason" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="reject-reason"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Documents incomplete, eligibility criteria not met..."
                  disabled={rejectSaving}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 resize-none disabled:opacity-60"
                />
                <p className="text-xs text-slate-400">{rejectReason.trim().length} / 500 characters</p>
              </div>

              {rejectError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {rejectError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => { setRejectDialogApp(null); setRejectReason(""); }}
                disabled={rejectSaving}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-reject"
                type="button"
                onClick={handleReject}
                disabled={rejectSaving || !rejectReason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectSaving ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                {rejectSaving ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function ApplicationDetailContent({ detail }: { detail: ApplicationDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <Section icon={<GraduationCap size={15} />} title="Programme">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Study Level" value={detail.degreeLevel?.levelName} />
          <InfoRow label="Programme" value={detail.program?.programName} />
          <InfoRow label="Admission Cycle" value={detail.admissionCycle?.admissionCycleName} />
          <InfoRow label="Institution" value={detail.institution?.institutionName} />
        </div>
      </Section>

      <Section icon={<User size={15} />} title="Personal Details">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="First Name" value={detail.firstName} />
          <InfoRow label="Last Name" value={detail.lastName} />
          <InfoRow label="Date of Birth" value={detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString("en-IN") : null} />
          <InfoRow label="Gender" value={detail.gender} />
          <InfoRow label="Blood Group" value={detail.bloodGroup} />
          <InfoRow label="Aadhar No." value={detail.aadharNo} />
          <InfoRow label="Caste" value={detail.caste} />
          <InfoRow label="Sub-Caste" value={detail.subCaste} />
          <InfoRow label="State" value={detail.state} />
        </div>
      </Section>

      <Section icon={<Phone size={15} />} title="Contact">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Mobile" value={detail.mobileNo} />
          <InfoRow label="Email" value={detail.email} />
          <InfoRow label="Present Address" value={detail.presentAddress} />
          <InfoRow label="Permanent Address" value={detail.permanentAddress} />
        </div>
      </Section>

      <Section icon={<Users size={15} />} title="Parent / Guardian">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Father Name" value={detail.fatherName} />
          <InfoRow label="Father Mobile" value={detail.fatherMobileNo} />
          <InfoRow label="Father Email" value={detail.fatherEmail} />
          <InfoRow label="Mother Name" value={detail.motherName} />
          <InfoRow label="Mother Mobile" value={detail.motherMobileNo} />
          <InfoRow label="Mother Email" value={detail.motherEmail} />
        </div>
      </Section>

      {detail.studentEducationDetails?.length > 0 && (
        <Section icon={<BookOpen size={15} />} title="Education Details">
          {detail.studentEducationDetails.map((edu) => {
            const degreeLevel = detail.degreeLevel?.levelName ?? "";
            const showUG = dlIsPG(degreeLevel) || dlIsPhd(degreeLevel);
            const showPG = dlIsPhd(degreeLevel);
            return (
              <div key={edu.id} className="grid grid-cols-2 gap-3">
                <InfoRow label="SSC Board" value={edu.sscBoard} />
                <InfoRow label="SSC Institution" value={edu.sscInstitutionName} />
                <InfoRow label="SSC Hall Ticket" value={edu.sscHallTicketNo} />
                <InfoRow label="SSC Year" value={edu.sscYearOfPassing?.toString()} />
                <InfoRow label="SSC %" value={edu.sscPercentage?.toString()} />
                <InfoRow label="Intermediate Board" value={edu.intermediateBoard} />
                <InfoRow label="Intermediate Institution" value={edu.intermediateInstitutionName} />
                <InfoRow label="Intermediate Hall Ticket" value={edu.intermediateHallTicketNo} />
                <InfoRow label="Intermediate Year" value={edu.intermediateYearOfPassing?.toString()} />
                <InfoRow label="Intermediate %" value={edu.intermediatePercentage?.toString()} />
                {showUG && (
                  <>
                    <InfoRow label="UG Board / University" value={edu.ugBoard} />
                    <InfoRow label="UG Institution" value={edu.ugInstitutionName} />
                    <InfoRow label="UG Hall Ticket" value={edu.ugHallTicketNo} />
                    <InfoRow label="UG Year" value={edu.ugYearOfPassing?.toString()} />
                    <InfoRow label="UG %" value={edu.ugPercentage?.toString()} />
                  </>
                )}
                {showPG && (
                  <>
                    <InfoRow label="PG Board / University" value={edu.pgBoard} />
                    <InfoRow label="PG Institution" value={edu.pgInstitutionName} />
                    <InfoRow label="PG Hall Ticket" value={edu.pgHallTicketNo} />
                    <InfoRow label="PG Year" value={edu.pgYearOfPassing?.toString()} />
                    <InfoRow label="PG %" value={edu.pgPercentage?.toString()} />
                  </>
                )}
              </div>
            );
          })}
        </Section>
      )}

      <Section icon={<FileText size={15} />} title="Entrance Exam">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Exam Name" value={detail.quallingEntranceExam} />
          <InfoRow label="Hall Ticket No." value={detail.entranceExamHallTicketNo} />
          <InfoRow label="Rank" value={detail.entranceExamRank} />
          <InfoRow label="Interested in Aurum Exam" value={detail.intrestedInAurumExam ? "Yes" : "No"} />
        </div>
      </Section>

      <Section icon={<FileText size={15} />} title="Documents">
        <div className="grid gap-3 sm:grid-cols-2">
          {(() => {
            const degreeLevel = detail.degreeLevel?.levelName ?? "";
            const showUG = dlIsPG(degreeLevel) || dlIsPhd(degreeLevel);
            const showPG = dlIsPhd(degreeLevel);
            const visibleKeys: DocumentKey[] = [
              "aadharCard",
              "passportPhoto",
              "studentSignature",
              "sscMemo",
              "intermediateMemo",
              "bonafideCertificate",
              "transferCertificate",
              ...(showUG ? (["ugMemo"] as DocumentKey[]) : []),
              ...(showPG ? (["pgMemo"] as DocumentKey[]) : []),
              "gapCertificate",
            ];
            return visibleKeys.map((key) => (
              <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">{DOCUMENT_LABELS[key]}</span>
                  {detail.documents?.[key] ? (
                    <a
                      href={detail.documents[key] ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs font-semibold text-rose-500">Not uploaded</span>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      </Section>
    </div>
  );
}

function ApplicationDetailForm({
  detail,
  onChange,
  onEducationChange,
  paymentInfo,
  documents,
  onDocumentsChange,
  showDocuments,
}: {
  detail: ApplicationDetail;
  onChange: (field: keyof ApplicationDetail, value: string | boolean | null) => void;
  onEducationChange: (field: keyof EducationDetail, value: string) => void;
  paymentInfo: PaymentInfo | null;
  documents: UploadedDocuments;
  onDocumentsChange: (updates: Partial<UploadedDocuments>) => void;
  showDocuments: boolean;
}) {
  const education = detail.studentEducationDetails?.[0] ?? createEmptyEducationDetail();

  return (
    <div className="flex flex-col gap-6">
      <Section icon={<GraduationCap size={15} />} title="Programme">
        <div className="grid grid-cols-2 gap-3">
          <InfoRow label="Study Level" value={detail.degreeLevel?.levelName} />
          <InfoRow label="Programme" value={detail.program?.programName} />
          <InfoRow label="Admission Cycle" value={detail.admissionCycle?.admissionCycleName} />
          <InfoRow label="Institution" value={detail.institution?.institutionName} />
        </div>
      </Section>

      <Section icon={<User size={15} />} title="Personal Details">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="First Name" value={detail.firstName} onChange={(value) => onChange("firstName", value)} />
          <FormRow label="Last Name" value={detail.lastName} onChange={(value) => onChange("lastName", value)} />
          <FormRow label="Date of Birth" type="date" value={detail.dateOfBirth ? detail.dateOfBirth.split("T")[0] : null} onChange={(value) => onChange("dateOfBirth", value)} />
          <FormSelectRow
            label="Gender"
            value={detail.gender}
            onChange={(value) => onChange("gender", value)}
            options={[
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
            ]}
          />
          <FormRow label="Blood Group" value={detail.bloodGroup} onChange={(value) => onChange("bloodGroup", value)} />
          <FormRow label="Aadhar No." value={detail.aadharNo} onChange={(value) => onChange("aadharNo", value)} />
          <FormRow label="Caste" value={detail.caste} onChange={(value) => onChange("caste", value)} />
          <FormRow label="Sub-Caste" value={detail.subCaste} onChange={(value) => onChange("subCaste", value)} />
          <FormRow label="State" value={detail.state} onChange={(value) => onChange("state", value)} />
        </div>
      </Section>

      <Section icon={<Phone size={15} />} title="Contact">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Mobile" type="tel" value={detail.mobileNo} onChange={(value) => onChange("mobileNo", value)} />
          <FormRow label="Email" type="email" value={detail.email} onChange={(value) => onChange("email", value)} />
          <FormRow label="Present Address" textarea value={detail.presentAddress} onChange={(value) => onChange("presentAddress", value)} rows={4} />
          <FormRow label="Permanent Address" textarea value={detail.permanentAddress} onChange={(value) => onChange("permanentAddress", value)} rows={4} />
        </div>
      </Section>

      <Section icon={<Users size={15} />} title="Parent / Guardian">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Father Name" value={detail.fatherName} onChange={(value) => onChange("fatherName", value)} />
          <FormRow label="Father Mobile" type="tel" value={detail.fatherMobileNo} onChange={(value) => onChange("fatherMobileNo", value)} />
          <FormRow label="Father Email" type="email" value={detail.fatherEmail} onChange={(value) => onChange("fatherEmail", value)} />
          <FormRow label="Mother Name" value={detail.motherName} onChange={(value) => onChange("motherName", value)} />
          <FormRow label="Mother Mobile" type="tel" value={detail.motherMobileNo} onChange={(value) => onChange("motherMobileNo", value)} />
          <FormRow label="Mother Email" type="email" value={detail.motherEmail} onChange={(value) => onChange("motherEmail", value)} />
        </div>
      </Section>

      <Section icon={<BookOpen size={15} />} title="Education Details">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="SSC Board" value={education.sscBoard} onChange={(value) => onEducationChange("sscBoard", value)} />
          <FormRow label="SSC Institution" value={education.sscInstitutionName} onChange={(value) => onEducationChange("sscInstitutionName", value)} />
          <FormRow label="SSC Hall Ticket" value={education.sscHallTicketNo} onChange={(value) => onEducationChange("sscHallTicketNo", value)} />
          <FormRow label="SSC Year" value={education.sscYearOfPassing?.toString() ?? null} onChange={(value) => onEducationChange("sscYearOfPassing", value)} />
          <FormRow label="SSC %" value={education.sscPercentage?.toString() ?? null} onChange={(value) => onEducationChange("sscPercentage", value)} />
          <FormRow label="Intermediate Board" value={education.intermediateBoard} onChange={(value) => onEducationChange("intermediateBoard", value)} />
          <FormRow label="Intermediate Institution" value={education.intermediateInstitutionName} onChange={(value) => onEducationChange("intermediateInstitutionName", value)} />
          <FormRow label="Intermediate Hall Ticket" value={education.intermediateHallTicketNo} onChange={(value) => onEducationChange("intermediateHallTicketNo", value)} />
          <FormRow label="Intermediate Year" value={education.intermediateYearOfPassing?.toString() ?? null} onChange={(value) => onEducationChange("intermediateYearOfPassing", value)} />
          <FormRow label="Intermediate %" value={education.intermediatePercentage?.toString() ?? null} onChange={(value) => onEducationChange("intermediatePercentage", value)} />
          {(() => {
            const degreeLevel = detail.degreeLevel?.levelName ?? "";
            const showUG = dlIsPG(degreeLevel) || dlIsPhd(degreeLevel);
            const showPG = dlIsPhd(degreeLevel);
            return (
              <>
                {showUG && (
                  <>
                    <FormRow label="UG Board / University" value={education.ugBoard} onChange={(value) => onEducationChange("ugBoard", value)} />
                    <FormRow label="UG Institution" value={education.ugInstitutionName} onChange={(value) => onEducationChange("ugInstitutionName", value)} />
                    <FormRow label="UG Hall Ticket" value={education.ugHallTicketNo} onChange={(value) => onEducationChange("ugHallTicketNo", value)} />
                    <FormRow label="UG Year" value={education.ugYearOfPassing?.toString() ?? null} onChange={(value) => onEducationChange("ugYearOfPassing", value)} />
                    <FormRow label="UG %" value={education.ugPercentage?.toString() ?? null} onChange={(value) => onEducationChange("ugPercentage", value)} />
                  </>
                )}
                {showPG && (
                  <>
                    <FormRow label="PG Board / University" value={education.pgBoard} onChange={(value) => onEducationChange("pgBoard", value)} />
                    <FormRow label="PG Institution" value={education.pgInstitutionName} onChange={(value) => onEducationChange("pgInstitutionName", value)} />
                    <FormRow label="PG Hall Ticket" value={education.pgHallTicketNo} onChange={(value) => onEducationChange("pgHallTicketNo", value)} />
                    <FormRow label="PG Year" value={education.pgYearOfPassing?.toString() ?? null} onChange={(value) => onEducationChange("pgYearOfPassing", value)} />
                    <FormRow label="PG %" value={education.pgPercentage?.toString() ?? null} onChange={(value) => onEducationChange("pgPercentage", value)} />
                  </>
                )}
              </>
            );
          })()}
        </div>
      </Section>

      <Section icon={<FileText size={15} />} title="Entrance Exam">
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Exam Name" value={detail.quallingEntranceExam} onChange={(value) => onChange("quallingEntranceExam", value)} />
          <FormRow label="Hall Ticket No." value={detail.entranceExamHallTicketNo} onChange={(value) => onChange("entranceExamHallTicketNo", value)} />
          <FormRow label="Rank" value={detail.entranceExamRank} onChange={(value) => onChange("entranceExamRank", value)} />
          <FormSelectRow
            label="Interested in Aurum Exam"
            value={detail.intrestedInAurumExam ? "yes" : "no"}
            onChange={(value) => onChange("intrestedInAurumExam", value === "yes")}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </div>
      </Section>

      {paymentInfo && (
        <Section icon={<FileText size={15} />} title="Payment Details">
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="Payment Status" value={paymentInfo.paymentStatus ?? "—"} />
            <InfoRow label="Invoice Number" value={paymentInfo.invoiceNumber} />
            <InfoRow label="Receipt Number" value={paymentInfo.receiptNumber} />
            <InfoRow label="Amount" value={formatCurrency(paymentInfo.amount)} />
            <InfoRow label="Amount Paid" value={formatCurrency(paymentInfo.amountPaid)} />
            <InfoRow label="Amount Due" value={formatCurrency(paymentInfo.amountDue)} />
            <InfoRow label="Paid At" value={paymentInfo.paidAt ? new Date(paymentInfo.paidAt).toLocaleString("en-IN") : null} />
          </div>
        </Section>
      )}

      {showDocuments && (
        <Section icon={<FileText size={15} />} title="Documents">
          <UploadDocumentsStep
            data={documents}
            errors={{}}
            onChange={onDocumentsChange}
            degreeLevel={detail.degreeLevel?.levelName}
          />
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center gap-2 text-slate-700">
        <span className="text-blue-500">{icon}</span>
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      {children}
    </div>
  );
}
