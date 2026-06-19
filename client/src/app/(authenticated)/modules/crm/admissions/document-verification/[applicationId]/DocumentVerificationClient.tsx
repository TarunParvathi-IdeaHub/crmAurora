"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  X,
  GraduationCap,
  Phone,
  Mail,
  User,
  Clock,
  FileWarning,
  Check,
} from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";

// ── Types ─────────────────────────────────────────────────────────────────────

type DocumentFieldKey =
  | "aadharCard"
  | "sscMemo"
  | "intermediateMemo"
  | "ugMemo"
  | "pgMemo"
  | "gapCertificate"
  | "bonafideCertificate"
  | "transferCertificate";

type VerificationDocumentType =
  | "AADHAR_CARD"
  | "SSC_MEMO"
  | "INTERMEDIATE_MEMO"
  | "UG_MEMO"
  | "PG_MEMO"
  | "GAP_CERTIFICATE"
  | "BONAFIDE_CERTIFICATE"
  | "TRANSFER_CERTIFICATE";

type VerificationItemStatus =
  | "DOCUMENT_VERIFICATION_PENDING"
  | "DOCUMENT_VERIFIED"
  | "DOCUMENT_REJECTED";

type VerificationFinalStatus =
  | "DOCUMENTS_VERIFICATION_PENDING"
  | "DOCUMENTS_VERIFIED"
  | "DOCUMENTS_REJECTED";

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

type AppInfo = {
  id: string;
  applicationNumber: string | null;
  institutionId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
  applicationStatus: ApplicationStatus;
  degreeLevel: { levelName: string };
  program: { programName: string; programCode: string };
  admissionCycle: { admissionCycleName: string };
};

type VerificationItem = {
  id: string;
  documentType: VerificationDocumentType;
  status: VerificationItemStatus;
  remarks: string | null;
  verifiedAt: string | null;
};

type Verification = {
  id: string;
  status: VerificationFinalStatus;
  remarks: string | null;
  verificationItems: VerificationItem[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const DOC_DEFINITIONS: Array<{
  field: DocumentFieldKey;
  docType: VerificationDocumentType;
  label: string;
}> = [
  { field: "aadharCard",          docType: "AADHAR_CARD",          label: "Aadhar Card"            },
  { field: "sscMemo",             docType: "SSC_MEMO",              label: "SSC Marksheet"          },
  { field: "intermediateMemo",    docType: "INTERMEDIATE_MEMO",     label: "Intermediate Marksheet" },
  { field: "ugMemo",              docType: "UG_MEMO",               label: "UG Degree Certificate"  },
  { field: "pgMemo",              docType: "PG_MEMO",               label: "PG Degree Certificate"  },
  { field: "gapCertificate",      docType: "GAP_CERTIFICATE",       label: "Gap Certificate"        },
  { field: "bonafideCertificate", docType: "BONAFIDE_CERTIFICATE",  label: "Bonafide Certificate"   },
  { field: "transferCertificate", docType: "TRANSFER_CERTIFICATE",  label: "Transfer Certificate"   },
];

const STATUS_META: Partial<
  Record<ApplicationStatus, { label: string; className: string }>
> = {
  DOCUMENT_VERIFICATION_PENDING:  { label: "Docs Pending",   className: "bg-amber-50 text-amber-700 border border-amber-200"     },
  DOCUMENT_VERIFIED:              { label: "Docs Verified",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  DOCUMENT_VERIFICATION_FAILED:   { label: "Docs Failed",    className: "bg-rose-50 text-rose-700 border border-rose-200"         },
  APPLICATION_SUBMITTED:          { label: "Submitted",      className: "bg-indigo-50 text-indigo-700 border border-indigo-200"   },
  AURUM_EXAM_PASSED:              { label: "Exam Passed",    className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFileType(url: string | null): "image" | "pdf" | "other" {
  if (!url) return "other";
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    const full = url.toLowerCase();
    if (/\.(jpg|jpeg|png|gif|webp)/.test(pathname) || /\.(jpg|jpeg|png|gif|webp)\b/.test(full)) {
      return "image";
    }
    if (/\.pdf/.test(pathname) || /\.pdf\b/.test(full) || /content-type=application\/pdf/.test(full)) {
      return "pdf";
    }
    return "other";
  } catch {
    return "other";
  }
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status] ?? {
    label: status.replace(/_/g, " "),
    className: "bg-slate-100 text-slate-600 border border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function InfoCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-700 font-medium">{value?.trim() || "—"}</span>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  applicationId: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DocumentVerificationClient({ applicationId }: Props) {
  const router = useRouter();
  const { profile } = useProfile();
  const role = useRole();

  // Page load state
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError]     = useState("");

  // Data state
  const [appInfo,       setAppInfo]       = useState<AppInfo | null>(null);
  const [documents,     setDocuments]     = useState<Record<DocumentFieldKey, string | null> | null>(null);
  const [verification,  setVerification]  = useState<Verification | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);

  // Verification form state
  const [checkedDocs,      setCheckedDocs]      = useState<Set<DocumentFieldKey>>(new Set());
  const [rejectionRemarks, setRejectionRemarks] = useState<Partial<Record<DocumentFieldKey, string>>>({});
  const [overallRemarks,   setOverallRemarks]   = useState("");

  // Submit state
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState("");
  const [submitted,     setSubmitted]     = useState(false);

  // Image zoom modal
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // Role guard — redirect non-allowed roles
  const isAllowedRole = role === "admissionDirector" || role === "admissionIncharge";

  useEffect(() => {
    if (role && !isAllowedRole) {
      router.replace("/dashboard");
    }
  }, [role, isAllowedRole, router]);

  // ── initiate verification ─────────────────────────────────────────────────

  const initiateVerification = useCallback(
    async (appId: string, institutionId: string): Promise<Verification | null> => {
      try {
        const res = await fetch(`${API_BASE}/api/document-verification/initiate`, {
          method:      "POST",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify({ applicationId: appId, institutionId }),
        });
        const json = (await res.json()) as { data?: Verification; error?: string };
        if (json.data) return json.data;
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  // ── Load page data ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!applicationId || !isAllowedRole) return;

    let cancelled = false;

    async function load() {
      setPageLoading(true);
      setPageError("");

      try {
        const res = await fetch(
          `${API_BASE}/api/document-verification/${applicationId}`,
          { credentials: "include" },
        );
        const json = (await res.json()) as {
          data?: {
            application: AppInfo;
            documents:   Record<DocumentFieldKey, string | null>;
            verification: Verification | null;
          };
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok || json.error || !json.data) {
          setPageError(json.error ?? "Failed to load verification data.");
          return;
        }

        const { application, documents: docs, verification: verif } = json.data;
        setAppInfo(application);
        setDocuments(docs);

        if (verif) {
          setVerification(verif);
          setVerificationId(verif.id);

          // Pre-populate checkboxes from existing item statuses
          const checked = new Set<DocumentFieldKey>();
          const remarks: Partial<Record<DocumentFieldKey, string>> = {};
          verif.verificationItems.forEach((item) => {
            const def = DOC_DEFINITIONS.find((d) => d.docType === item.documentType);
            if (!def) return;
            if (item.status === "DOCUMENT_VERIFIED") checked.add(def.field);
            if (item.status === "DOCUMENT_REJECTED" && item.remarks) {
              remarks[def.field] = item.remarks;
            }
          });
          setCheckedDocs(checked);
          setRejectionRemarks(remarks);
          if (verif.remarks) setOverallRemarks(verif.remarks);
        } else {
          // Auto-initiate
          const created = await initiateVerification(
            application.id,
            application.institutionId,
          );
          if (cancelled) return;
          if (created) {
            setVerification(created);
            setVerificationId(created.id);
          }
        }
      } catch {
        if (!cancelled) setPageError("Failed to connect to server.");
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [applicationId, isAllowedRole, initiateVerification]);

  // ── Submit verification ───────────────────────────────────────────────────

  async function handleSubmit() {
    if (!verificationId || !documents) return;

    // Build items payload — only for uploaded documents
    const uploadedDefs = DOC_DEFINITIONS.filter(({ field }) => !!documents[field]);

    if (uploadedDefs.length === 0) {
      setSubmitError("No documents have been uploaded by the applicant.");
      return;
    }

    const items = uploadedDefs.map(({ field, docType }) => ({
      documentType: docType,
      status:       checkedDocs.has(field) ? "DOCUMENT_VERIFIED" : "DOCUMENT_REJECTED",
      remarks:      !checkedDocs.has(field) ? (rejectionRemarks[field]?.trim() || undefined) : undefined,
    }));

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/document-verification/${verificationId}`,
        {
          method:      "PUT",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify({ items, remarks: overallRemarks.trim() || undefined }),
        },
      );
      const json = (await res.json()) as { data?: Verification; error?: string };

      if (!res.ok || json.error) {
        setSubmitError(json.error ?? "Failed to submit verification.");
        return;
      }

      if (json.data) {
        setVerification(json.data);
        const hasRejected = json.data.verificationItems.some((i) => i.status === "DOCUMENT_REJECTED");
        setAppInfo((prev) =>
          prev
            ? {
                ...prev,
                applicationStatus: hasRejected
                  ? "DOCUMENT_VERIFICATION_FAILED"
                  : "DOCUMENT_VERIFIED",
              }
            : prev,
        );
        setSubmitted(true);
      }
    } catch {
      setSubmitError("Failed to connect to server.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Computed values ───────────────────────────────────────────────────────

  const uploadedDefs    = DOC_DEFINITIONS.filter(({ field }) => documents?.[field]);
  const notUploadedDefs = DOC_DEFINITIONS.filter(({ field }) => !documents?.[field]);
  const verifiedCount   = uploadedDefs.filter(({ field }) => checkedDocs.has(field)).length;
  const rejectedCount   = uploadedDefs.length - verifiedCount;

  // ── Render: role check ────────────────────────────────────────────────────

  if (role && !isAllowedRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ShieldCheck size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // ── Render: loading ───────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Loading verification data…</p>
        </div>
      </div>
    );
  }

  // ── Render: error ─────────────────────────────────────────────────────────

  if (pageError || !appInfo || !documents) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="rounded-full bg-rose-50 p-4">
            <AlertCircle size={28} className="text-rose-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 mb-1">Failed to Load</h2>
            <p className="text-sm text-slate-500">{pageError || "Application not found."}</p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={14} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Render: success ───────────────────────────────────────────────────────

  if (submitted) {
    const allVerified = verification?.status === "DOCUMENTS_VERIFIED";
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-5 max-w-sm text-center bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
          <div className={`rounded-full p-4 ${allVerified ? "bg-emerald-50" : "bg-amber-50"}`}>
            {allVerified
              ? <CheckCircle2 size={32} className="text-emerald-500" />
              : <XCircle size={32} className="text-amber-500" />
            }
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              {allVerified ? "Documents Verified" : "Verification Submitted"}
            </h2>
            <p className="text-sm text-slate-500">
              {allVerified
                ? `All ${uploadedDefs.length} documents for ${appInfo.firstName} ${appInfo.lastName} have been verified.`
                : `${verifiedCount} document${verifiedCount !== 1 ? "s" : ""} verified, ${rejectedCount} rejected. The applicant has been notified to re-upload rejected documents.`
              }
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => { setSubmitted(false); }}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Review Again
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Back to Applications
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: main page ─────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 px-6 py-4 max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-slate-900">Document Verification</h1>
              <span className="text-slate-300">—</span>
              <span className="text-sm text-slate-600 truncate">
                {appInfo.firstName} {appInfo.lastName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {appInfo.program.programName} &bull; {appInfo.degreeLevel.levelName}
            </p>
          </div>
          <StatusBadge status={appInfo.applicationStatus} />
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-6 max-w-6xl mx-auto w-full">

        {/* Student info card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <User size={15} />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">Applicant Information</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCell label="Full Name"  value={`${appInfo.firstName} ${appInfo.lastName}`} />
            <InfoCell label="Mobile"     value={appInfo.mobileNo} />
            <InfoCell label="Email"      value={appInfo.email} />
            <InfoCell label="App. No."   value={appInfo.applicationNumber ?? "—"} />
            <InfoCell label="Programme"  value={appInfo.program.programName} />
            <InfoCell label="Level"      value={appInfo.degreeLevel.levelName} />
            <InfoCell label="Cycle"      value={appInfo.admissionCycle.admissionCycleName} />
          </div>
        </div>

        {/* Verification summary bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">{verifiedCount} To Verify</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-rose-50 border border-rose-200 px-3 py-1.5">
            <XCircle size={13} className="text-rose-600" />
            <span className="text-xs font-medium text-rose-700">{rejectedCount} To Reject</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5">
            <FileWarning size={13} className="text-slate-500" />
            <span className="text-xs font-medium text-slate-600">{notUploadedDefs.length} Not Uploaded</span>
          </div>
        </div>

        {/* No documents uploaded yet */}
        {uploadedDefs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center mb-6">
            <FileWarning size={36} className="text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-600">No Documents Uploaded</h3>
            <p className="mt-1 text-xs text-slate-400">The applicant has not uploaded any documents yet.</p>
          </div>
        )}

        {/* Uploaded documents grid */}
        {uploadedDefs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ShieldCheck size={15} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Uploaded Documents</h2>
              <span className="ml-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                {uploadedDefs.length} document{uploadedDefs.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uploadedDefs.map(({ field, docType, label }) => {
                const url      = documents[field]!;
                const fileType = getFileType(url);
                const checked  = checkedDocs.has(field);

                return (
                  <div
                    key={field}
                    className={`rounded-2xl border bg-white shadow-sm transition-all ${
                      checked
                        ? "border-emerald-300 ring-1 ring-emerald-200"
                        : "border-slate-200"
                    }`}
                  >
                    {/* Document header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${checked ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                          <FileText size={14} />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{label}</span>
                      </div>
                      {/* View button */}
                      {fileType === "image" ? (
                        <button
                          type="button"
                          onClick={() => setZoomUrl(url)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                        >
                          <ImageIcon size={12} />
                          Preview
                        </button>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                        >
                          <ExternalLink size={12} />
                          View
                        </a>
                      )}
                    </div>

                    {/* Image thumbnail */}
                    {fileType === "image" && (
                      <button
                        type="button"
                        onClick={() => setZoomUrl(url)}
                        className="relative w-full h-36 overflow-hidden bg-slate-100 hover:opacity-90 transition"
                        title="Click to enlarge"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={label}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition">
                          <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full">
                            Click to enlarge
                          </span>
                        </div>
                      </button>
                    )}

                    {/* PDF preview / placeholder */}
                    {fileType === "pdf" && (
                      <div className="h-56 bg-slate-50 border-b border-slate-100">
                        <object
                          data={url}
                          type="application/pdf"
                          className="h-full w-full"
                        >
                          <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                            Preview unavailable
                          </div>
                        </object>
                      </div>
                    )}
                    {fileType !== "image" && fileType !== "pdf" && (
                      <div className="flex items-center justify-center h-24 bg-slate-50 border-b border-slate-100">
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <FileText size={28} />
                          <span className="text-xs">Document Preview</span>
                        </div>
                      </div>
                    )}

                    {/* Checkbox */}
                    <div className="px-4 py-3">
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                        checked
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                          checked
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300 bg-white"
                        }`}>
                          {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => {
                            setCheckedDocs((prev) => {
                              const next = new Set(prev);
                              if (next.has(field)) next.delete(field);
                              else next.add(field);
                              return next;
                            });
                          }}
                        />
                        <div>
                          <p className={`text-sm font-medium ${checked ? "text-emerald-700" : "text-slate-700"}`}>
                            {checked ? "Marked as Verified" : "Mark as Verified"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {checked ? "Uncheck to reject this document" : "Leave unchecked to reject"}
                          </p>
                        </div>
                      </label>

                      {/* Rejection reason (shown when unchecked) */}
                      {!checked && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={rejectionRemarks[field] ?? ""}
                            onChange={(e) =>
                              setRejectionRemarks((prev) => ({ ...prev, [field]: e.target.value }))
                            }
                            placeholder="Rejection reason (optional)"
                            className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 placeholder-rose-300 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Not uploaded documents */}
        {notUploadedDefs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileWarning size={15} />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Not Uploaded</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {notUploadedDefs.map(({ field, label }) => (
                <span
                  key={field}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500"
                >
                  <Clock size={11} className="text-slate-400" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Overall remarks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Overall Remarks
            <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={overallRemarks}
            onChange={(e) => setOverallRemarks(e.target.value)}
            placeholder="Add any overall comments about the document verification…"
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Submit bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {submitError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <strong className="text-emerald-700">{verifiedCount}</strong> will be verified
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1.5">
                <XCircle size={14} className="text-rose-500" />
                <strong className="text-rose-700">{rejectedCount}</strong> will be rejected
              </span>
              {rejectedCount > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Student will be notified to re-upload rejected documents
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || uploadedDefs.length === 0}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              Submit Verification
            </button>
          </div>
        </div>

      </div>

      {/* ── Image zoom modal ────────────────────────────────────────────────── */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomUrl(null)}
        >
          <div className="relative max-w-[92vw] max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomUrl}
              alt="Document preview"
              className="max-w-[88vw] max-h-[88vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setZoomUrl(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg text-slate-700 hover:bg-slate-100 transition"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
