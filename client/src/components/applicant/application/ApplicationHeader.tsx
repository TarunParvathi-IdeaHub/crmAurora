"use client";

import { BookOpen, Building2, Calendar, FileText, GraduationCap } from "lucide-react";
import type { ApplicationStatus } from "@/types/applicant";

const statusConfig: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "border-amber-200 bg-amber-100 text-amber-700",
  },
  PAYMENT_PENDING: {
    label: "Payment Pending",
    className: "border-orange-200 bg-orange-100 text-orange-700",
  },
  PAYMENT_COMPLETED: {
    label: "Payment Done",
    className: "border-blue-200 bg-blue-100 text-blue-700",
  },
  SUBMITTED: {
    label: "Submitted",
    className: "border-emerald-200 bg-emerald-100 text-emerald-700",
  },
};

type ApplicationHeaderProps = {
  applicationStatus: ApplicationStatus;
  lastSavedAt: Date | null;
  institutionName?: string;
  studyLevel?: string;
  programName?: string;
  admissionCycle?: string;
};

export default function ApplicationHeader({
  applicationStatus,
  lastSavedAt,
  institutionName,
  studyLevel,
  programName,
  admissionCycle,
}: ApplicationHeaderProps) {
  const status = statusConfig[applicationStatus];

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <FileText size={20} />
        </div>
        <div className="flex flex-col gap-1.5">
          {/* Institution name as primary title */}
          <div className="flex items-center gap-2">
            {institutionName ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Building2 size={11} />
                {institutionName}
              </span>
            ) : (
              <h1 className="text-base font-semibold text-slate-900">
                Admission Application
              </h1>
            )}
          </div>

          {/* Study level + Programme pills */}
          {(studyLevel || programName) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {studyLevel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-700">
                  <GraduationCap size={10} />
                  {studyLevel}
                </span>
              )}
              {programName && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  <BookOpen size={10} />
                  {programName}
                </span>
              )}
            </div>
          )}

          {/* Admission cycle + last saved */}
          <div className="flex items-center gap-2">
            {admissionCycle && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                <Calendar size={10} />
                {admissionCycle}
              </span>
            )}
            {lastSavedAt && (
              <p className="text-[11px] text-slate-400">
                Saved{" "}
                {lastSavedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
      >
        {status.label}
      </span>
    </div>
  );
}
