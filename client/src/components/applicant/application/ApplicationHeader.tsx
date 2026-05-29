"use client";

import {
  BookOpen,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  Clock3,
} from "lucide-react";

import type { ApplicationStatus } from "@/types/applicant";

const statusConfig: Record<
  ApplicationStatus,
  {
    label: string;
    className: string;
    dotClass: string;
  }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 ring-amber-100",
    dotClass: "bg-amber-500",
  },

  PAYMENT_PENDING: {
    label: "Payment Pending",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 ring-orange-100",
    dotClass: "bg-orange-500",
  },

  PAYMENT_COMPLETED: {
    label: "Payment Completed",
    className: "border-blue-200 bg-blue-50 text-blue-700 ring-blue-100",
    dotClass: "bg-blue-500",
  },

  SUBMITTED: {
    label: "Submitted",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100",
    dotClass: "bg-emerald-500",
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

function InfoPill({
  icon: Icon,
  label,
  className,
}: {
  icon: React.ElementType;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${className}`}
    >
      <Icon size={13} />
      <span>{label}</span>
    </div>
  );
}

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
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/40" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        {/* LEFT */}
        <div className="flex min-w-0 items-start gap-4">
          {/* Icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-sm">
            <FileText size={24} strokeWidth={2.2} />
          </div>

          {/* Content */}
          <div className="min-w-0 space-y-3">
            {/* Heading */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Admission Application
                </h1>

                {institutionName && (
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                    <Building2 size={12} />
                    <span className="max-w-[220px] truncate">
                      {institutionName}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-slate-500">
                Complete your application details in the following steps. You can save and continue later at any time.
              </p>
            </div>

            {/* Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {studyLevel && (
                <InfoPill
                  icon={GraduationCap}
                  label={studyLevel}
                  className="border-violet-200 bg-violet-50 text-violet-700"
                />
              )}

              {programName && (
                <InfoPill
                  icon={BookOpen}
                  label={programName}
                  className="border-slate-200 bg-slate-50 text-slate-700"
                />
              )}

              {admissionCycle && (
                <InfoPill
                  icon={CalendarDays}
                  label={admissionCycle}
                  className="border-emerald-200 bg-emerald-50 text-emerald-700"
                />
              )}
            </div>

            {/* Footer Meta */}
            {lastSavedAt && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock3 size={13} />
                <span>
                  Last saved at{" "}
                  {lastSavedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT STATUS */}
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ring-4 ${status.className}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${status.dotClass}`}
          />

          {status.label}
        </div>
      </div>
    </div>
  );
}