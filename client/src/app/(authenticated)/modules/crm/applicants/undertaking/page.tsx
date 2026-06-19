"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  ShieldCheck,
  Loader2,
  ChevronRight,
  IndianRupee,
  CheckSquare,
  Square,
} from "lucide-react";
import Card from "@/components/common/Card";
import { motion, type Variants } from "framer-motion";
import { useProfile } from "@/providers/ProfileProvider";
import { useRouter } from "next/navigation";
import type { UndertakingTemplateContent, SectionItem } from "@/app/(authenticated)/modules/crm/admissions/undertaking-templates/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Animation variants ────────────────────────────────────────────────────────

const staggerList: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const slideItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface RenderResponse {
  templateId: string;
  title: string;
  version: string;
  content: UndertakingTemplateContent;
  studentInfo: {
    nameOfTheStudent: string;
    applicationNumber: string | null;
    programEnrolling: string;
    applicationStatus: string;
  };
  tuitionFeeInfo: {
    fixedTuitionAmount: number;
    actualTuitionAmount: number;
    consessionAmount: number;
  } | null;
  variableMap: Record<string, string>;
}

// ── Utility: collect all checkbox items from template ─────────────────────────

function collectCheckboxIds(content: UndertakingTemplateContent): string[] {
  const ids: string[] = [];
  for (const section of content.sections) {
    for (const item of section.items) {
      if (item.type === "checkbox") {
        ids.push(item.id);
      }
    }
  }
  return ids;
}

// ── Rendered Template View ────────────────────────────────────────────────────

interface TemplateViewProps {
  content: UndertakingTemplateContent;
  studentInfo: RenderResponse["studentInfo"];
  checkedBoxes: Set<string>;
  onToggleCheckbox: (id: string) => void;
  isLocked: boolean;
}

function RenderedTemplate({
  content,
  studentInfo,
  checkedBoxes,
  onToggleCheckbox,
  isLocked,
}: TemplateViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-800 shadow-sm">
      {/* Document Header */}
      <div className="mb-6 border-b border-slate-300 pb-4 text-center">
        <h1 className="text-base font-bold uppercase tracking-wide text-slate-900">
          {content.header.title}
        </h1>
      </div>

      {/* Header fields */}
      <div className="mb-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {content.header.fields.map((field) => {
          const value =
            field.key === "nameOfTheStudent"
              ? studentInfo.nameOfTheStudent
              : field.key === "applicationId" || field.key === "applicationNumber"
              ? studentInfo.applicationNumber ?? ""
              : field.key === "programEnrolling"
              ? studentInfo.programEnrolling
              : "";

          return (
            <div key={field.key} className="flex gap-2">
              <span className="font-medium text-slate-600 shrink-0">{field.label}:</span>
              <span className="border-b border-dotted border-slate-400 text-slate-900 flex-1 min-w-0">
                {value || <span className="text-slate-400 italic">—</span>}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sections */}
      {content.sections.map((section) => {
        let numberedCount = 0;
        let alphabeticalCount = 0;

        return (
          <div key={section.id} className="mb-5">
            <div className="mb-2 rounded bg-blue-600 px-3 py-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                {section.title}
              </h2>
            </div>

            <div className="space-y-2 pl-2">
              {section.items.map((item: SectionItem) => {
                let bullet: string | null = null;

                if (item.type === "numbered") {
                  numberedCount++;
                  bullet = `${numberedCount}.`;
                }
                if (item.type === "alphabetical") {
                  alphabeticalCount++;
                  bullet = `${String.fromCharCode(96 + alphabeticalCount)}.`;
                }

                if (item.type === "checkbox") {
                  const isChecked = checkedBoxes.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg p-2 transition-colors cursor-pointer ${
                        isLocked
                          ? "cursor-default"
                          : "hover:bg-blue-50 cursor-pointer"
                      } ${isChecked ? "bg-emerald-50" : ""}`}
                      onClick={() => !isLocked && onToggleCheckbox(item.id)}
                      role={isLocked ? undefined : "checkbox"}
                      aria-checked={isChecked}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare size={18} className="text-emerald-600" />
                        ) : (
                          <Square size={18} className="text-slate-400" />
                        )}
                      </div>
                      <p className="leading-relaxed text-slate-700">{item.content}</p>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className="flex items-start gap-2">
                    {bullet && (
                      <span className="mt-0.5 shrink-0 font-medium text-slate-700">
                        {bullet}
                      </span>
                    )}
                    <p className="leading-relaxed">{item.content}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Footer signatures */}
      {content.footer.signatures.length > 0 && (
        <div className="mt-8 flex justify-around gap-4 border-t border-slate-200 pt-6">
          {content.footer.signatures.map((sig, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-10 w-36 border-b border-slate-400" />
              <span className="text-xs text-slate-500">{sig.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UndertakingPage() {
  const { profile } = useProfile();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [renderData, setRenderData] = useState<RenderResponse | null>(null);
  const [checkedBoxes, setCheckedBoxes] = useState<Set<string>>(new Set());
  const [allCheckboxIds, setAllCheckboxIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const cancelledRef = useRef(false);

  // Application status from render response
  const applicationStatus = renderData?.studentInfo?.applicationStatus ?? "";
  const normalizedApplicationStatus = applicationStatus.trim().toUpperCase().replace(/\s+/g, "_");
  const isUndertakingPending = normalizedApplicationStatus === "STUDENT_ADMISSION_UNDERTAKING_PENDING";
  const isAlreadySubmitted = normalizedApplicationStatus === "STUDENT_ADMISSION_UNDERTAKING_SUBMITTED";
  const isDocumentVerified = normalizedApplicationStatus === "DOCUMENT_VERIFIED";
  const hasFixedTuitionFee = Boolean(renderData?.tuitionFeeInfo);
  const canAcceptUndertaking = isUndertakingPending || (isDocumentVerified && hasFixedTuitionFee);

  // Locked once accepted
  const isLocked = isAlreadySubmitted || submitted;

  // All checkboxes must be checked to enable submit
  const allChecked = allCheckboxIds.length > 0 && allCheckboxIds.every((id) => checkedBoxes.has(id));

  // ── Load render data ────────────────────────────────────────────────────────

  const loadUndertaking = useCallback(async () => {
    const appId = profile?.applicationId ?? undefined;
    if (!appId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/student-undertakings/render/${appId}`,
        { credentials: "include" }
      );

      if (cancelledRef.current) return;

      if (res.status === 404) {
        // No template published for this program yet
        setRenderData(null);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Failed to load undertaking.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as RenderResponse;
      if (cancelledRef.current) return;

      setRenderData(data);

      // Collect checkbox IDs for validation
      const checkboxIds = collectCheckboxIds(data.content);
      setAllCheckboxIds(checkboxIds);

      // If already accepted, pre-check all boxes (display-only)
      if (
        data.studentInfo.applicationStatus === "STUDENT_ADMISSION_UNDERTAKING_SUBMITTED"
      ) {
        setCheckedBoxes(new Set(checkboxIds));
      }
    } catch {
      if (!cancelledRef.current) setError("Failed to load undertaking details.");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    cancelledRef.current = false;
    void loadUndertaking();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadUndertaking]);

  // ── Toggle checkbox ─────────────────────────────────────────────────────────

  function handleToggleCheckbox(id: string) {
    if (isLocked) return;
    setCheckedBoxes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Submit undertaking ──────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!allChecked || !renderData || isSubmitting) return;

    const appId = profile?.applicationId;
    if (!appId) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`${API_BASE}/api/student-undertakings/accept`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentAdmissionApplicationId: appId,
          templateId: renderData.templateId,
          studentDelaration: `I have read and accepted all terms and conditions of the Student Admission Undertaking dated ${new Date().toLocaleDateString("en-IN")}.`,
          ipAddress: "",
          userAgent: navigator.userAgent,
        }),
      });

      const json = (await res.json()) as {
        message?: string;
        error?: string;
        undertaking?: unknown;
      };

      if (!res.ok) {
        setSubmitError(json.error ?? "Submission failed. Please try again.");
        return;
      }

      setSubmitted(true);
      // Redirect to pending payments page
      setTimeout(() => {
        router.push("/modules/crm/applicants/fees/pending");
      }, 1500);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerList}
      className="mx-auto max-w-4xl space-y-6 py-2"
    >
      {/* Hero banner */}
      <motion.div variants={slideItem}>
        <Card className="overflow-hidden border-0 bg-linear-to-r from-emerald-700 via-emerald-600 to-emerald-500 p-0 text-white shadow-xl">
          <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <ClipboardCheck size={30} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-200">Student Declaration</p>
                <h1 className="mt-0.5 text-2xl font-bold md:text-3xl">Undertaking Form</h1>
                {renderData?.studentInfo && (
                  <p className="mt-1 text-emerald-100 text-sm">
                    {renderData.studentInfo.nameOfTheStudent} ·{" "}
                    {renderData.studentInfo.programEnrolling}
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-center backdrop-blur-sm">
              {isLocked || isAlreadySubmitted ? (
                <CheckCircle2 size={26} className="mx-auto text-white" />
              ) : canAcceptUndertaking ? (
                <FileSignature size={26} className="mx-auto text-white" />
              ) : (
                <Lock size={26} className="mx-auto text-white/70" />
              )}
              <p className="mt-2 text-sm font-semibold">
                {isLocked || isAlreadySubmitted
                  ? "Submitted"
                  : canAcceptUndertaking
                  ? "Action Required"
                  : "Locked"}
              </p>
              <p className="mt-0.5 text-xs text-emerald-100">
                {isLocked || isAlreadySubmitted
                  ? "Undertaking accepted"
                  : canAcceptUndertaking
                  ? "Review & accept below"
                  : "Not available yet"}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Loading */}
      {loading && (
        <motion.div variants={slideItem}>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-emerald-600" />
            Loading undertaking details...
          </div>
        </motion.div>
      )}

      {/* Error */}
      {!loading && error && (
        <motion.div variants={slideItem}>
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        </motion.div>
      )}

      {/* Not available yet */}
      {!loading && !error && !canAcceptUndertaking && !isAlreadySubmitted && !submitted && (
        <motion.div variants={slideItem}>
          <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-5">
            <Lock size={22} className="mt-0.5 shrink-0 text-slate-500" />
            <div>
              <p className="font-semibold text-slate-800">Undertaking form is currently locked</p>
              <p className="mt-1 text-sm text-slate-600">
                This form will be unlocked after your documents are verified and fee concession
                has been assigned by the admissions team. Current status:{" "}
                <span className="font-medium text-slate-700">
                  {applicationStatus.replace(/_/g, " ")}
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Already submitted banner */}
      {!loading && !error && (isAlreadySubmitted || submitted) && (
        <motion.div variants={slideItem}>
          <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">Undertaking accepted successfully!</p>
              <p className="mt-1 text-sm text-emerald-700">
                Your Registration Fee and Tuition Fee invoices have been generated.{" "}
                {submitted && "Redirecting to Pending Payments..."}
              </p>
            </div>
            {!submitted && (
              <button
                onClick={() => router.push("/modules/crm/applicants/fees/pending")}
                className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                View Fees <ChevronRight size={14} />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Tuition fee info card (shown when pending) */}
      {!loading && !error && canAcceptUndertaking && renderData?.tuitionFeeInfo && (
        <motion.div variants={slideItem}>
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <IndianRupee size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Fee Summary
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  Your Assigned Tuition Fee
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 rounded-xl bg-slate-50 p-4 text-center text-sm">
              <div>
                <p className="text-xs text-slate-500">Original Fee</p>
                <p className="mt-0.5 font-bold text-slate-700">
                  ₹{renderData.tuitionFeeInfo.actualTuitionAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Concession</p>
                <p className="mt-0.5 font-bold text-rose-600">
                  −₹{renderData.tuitionFeeInfo.consessionAmount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-100">
                <p className="text-xs text-emerald-700 pt-1">Fixed Fee</p>
                <p className="mt-0.5 font-bold text-emerald-800 pb-1">
                  ₹{renderData.tuitionFeeInfo.fixedTuitionAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Undertaking Template */}
      {!loading && !error && renderData && (canAcceptUndertaking || isAlreadySubmitted || submitted) && (
        <motion.div variants={slideItem}>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Undertaking Template v{renderData.version}
                </p>
                <h2 className="text-lg font-semibold text-slate-900">{renderData.title}</h2>
              </div>
              {canAcceptUndertaking && !isLocked && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  <AlertCircle size={12} />
                  Review &amp; Accept
                </span>
              )}
              {(isLocked || isAlreadySubmitted) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={12} />
                  Accepted
                </span>
              )}
            </div>

            <RenderedTemplate
              content={renderData.content}
              studentInfo={renderData.studentInfo}
              checkedBoxes={checkedBoxes}
              onToggleCheckbox={handleToggleCheckbox}
              isLocked={isLocked || isAlreadySubmitted}
            />
          </Card>
        </motion.div>
      )}

      {/* Checkbox progress + Submit (only when PENDING and not yet submitted) */}
      {!loading && !error && canAcceptUndertaking && !isAlreadySubmitted && !submitted && renderData && (
        <motion.div variants={slideItem}>
          <Card className="p-6">
            {/* Progress */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700">Checkbox Progress</p>
                <span className="text-sm font-bold text-slate-900">
                  {checkedBoxes.size} / {allCheckboxIds.length}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width:
                      allCheckboxIds.length > 0
                        ? `${(checkedBoxes.size / allCheckboxIds.length) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {allChecked
                  ? "All checkboxes selected. You may now submit."
                  : `Please check all ${allCheckboxIds.length} boxes to proceed.`}
              </p>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            {/* Declaration note */}
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <ShieldCheck size={18} className="shrink-0 mt-0.5 text-blue-600" />
              <p>
                By clicking <strong>Accept Undertaking</strong>, you confirm that you have
                read all the above clauses and agree to abide by the terms of this undertaking.
                This action is <strong>irreversible</strong> and will generate your Registration
                Fee and Tuition Fee invoices.
              </p>
            </div>

            {/* Submit button */}
            <button
              id="btn-accept-undertaking"
              disabled={!allChecked || isSubmitting}
              onClick={handleSubmit}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
                allChecked && !isSubmitting
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Accept Undertaking
                </>
              )}
            </button>

            {!allChecked && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Submit is disabled until all {allCheckboxIds.length} checkboxes are checked
              </p>
            )}
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
