"use client";

import { useEffect, useRef, useState } from "react";
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
  Mail,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
} from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";

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
  pgPercentage: number | null;
};

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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Detail panel
  const [viewApp, setViewApp] = useState<Application | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Edit panel
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [editStatus, setEditStatus] = useState<ApplicationStatus>("SAVED_AS_DRAFT");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // 3-dots dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  const isDirectorOrIncharge =
    role === "admissionDirector" || role === "admissionIncharge";

  const colCount = isDirectorOrIncharge ? 8 : 7;

  // ── Fetch applications ─────────────────────────────────────────────────────

  useEffect(() => {
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
  }, [profile, role, filter]);

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
      .then((res) => {
        if (res.error) {
          setDetailError(res.error);
        } else if (res.data) {
          setDetail(res.data);
        } else {
          setDetailError("Failed to load application details.");
        }
      })
      .catch(() => setDetailError("Failed to load application details."))
      .finally(() => setDetailLoading(false));
  }

  // ── Edit application ────────────────────────────────────────────────────────

  function openEdit(app: Application) {
    setEditApp(app);
    setEditStatus(app.applicationStatus);
    setEditError("");
  }

  function saveEdit() {
    if (!editApp || !profile) return;
    setEditSaving(true);
    setEditError("");
    const entityId = profile.entityId ?? "";
    fetch(`${API_BASE}/api/applications/${entityId}/${editApp.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationStatus: editStatus }),
    })
      .then((r) => r.json() as Promise<{ error?: string }>)
      .then((res) => {
        if (res.error) {
          setEditError(res.error);
        } else {
          setApplications((prev) =>
            prev.map((a) => a.id === editApp.id ? { ...a, applicationStatus: editStatus } : a)
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

                        {/* Edit */}
                        <button
                          type="button"
                          title="Edit application"
                          onClick={() => openEdit(app)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
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
                                className="z-50 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                              >
                                {isDirectorOrIncharge && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      router.push(
                                        `/modules/crm/admissions/document-verification/${app.id}`,
                                      );
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                  >
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    Document Verification
                                  </button>
                                )}
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
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
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
            <div className="flex-1 overflow-y-auto px-6 py-5">
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
                <div className="flex flex-col gap-6">
                  {/* Programme info */}
                  <Section icon={<GraduationCap size={15} />} title="Programme">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow label="Study Level" value={detail.degreeLevel?.levelName} />
                      <InfoRow label="Programme" value={detail.program?.programName} />
                      <InfoRow label="Admission Cycle" value={detail.admissionCycle?.admissionCycleName} />
                      <InfoRow label="Institution" value={detail.institution?.institutionName} />
                    </div>
                  </Section>

                  {/* Personal details */}
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

                  {/* Contact */}
                  <Section icon={<Phone size={15} />} title="Contact">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow label="Mobile" value={detail.mobileNo} />
                      <InfoRow label="Email" value={detail.email} />
                      <InfoRow label="Present Address" value={detail.presentAddress} />
                      <InfoRow label="Permanent Address" value={detail.permanentAddress} />
                    </div>
                  </Section>

                  {/* Parent details */}
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

                  {/* Education */}
                  {detail.studentEducationDetails?.length > 0 && (
                    <Section icon={<BookOpen size={15} />} title="Education Details">
                      {detail.studentEducationDetails.map((edu) => (
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
                          {edu.ugBoard && (
                            <>
                              <InfoRow label="UG Board / University" value={edu.ugBoard} />
                              <InfoRow label="UG Institution" value={edu.ugInstitutionName} />
                              <InfoRow label="UG Year" value={edu.ugYearOfPassing?.toString()} />
                              <InfoRow label="UG %" value={edu.ugPercentage?.toString()} />
                            </>
                          )}
                          {edu.pgBoard && (
                            <>
                              <InfoRow label="PG Board / University" value={edu.pgBoard} />
                              <InfoRow label="PG Year" value={edu.pgYearOfPassing?.toString()} />
                              <InfoRow label="PG %" value={edu.pgPercentage?.toString()} />
                            </>
                          )}
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* Entrance Exam */}
                  <Section icon={<FileText size={15} />} title="Entrance Exam">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow label="Exam Name" value={detail.quallingEntranceExam} />
                      <InfoRow label="Hall Ticket No." value={detail.entranceExamHallTicketNo} />
                      <InfoRow label="Rank" value={detail.entranceExamRank} />
                      <InfoRow label="Interested in Aurum Exam" value={detail.intrestedInAurumExam ? "Yes" : "No"} />
                    </div>
                  </Section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Application Panel ─────────────────────────────────────────── */}
      {editApp && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
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
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-4">
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

    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

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
