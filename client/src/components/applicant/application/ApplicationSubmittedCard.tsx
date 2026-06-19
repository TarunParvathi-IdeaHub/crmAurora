"use client";

import { CheckCircle2, Building2, Hash, UserRound } from "lucide-react";
import {
  getApplicationStatusLabel,
  getApplicationStatusTone,
  getLockedStatusMessage,
} from "@/lib/utils/applicationStatus";

type ApplicationSubmittedCardProps = {
  applicationNumber?: string | null;
  applicationStatus?: string | null;
  institutionName?: string;
  applicantName?: string;
};

export default function ApplicationSubmittedCard({
  applicationNumber,
  applicationStatus,
  institutionName,
  applicantName,
}: ApplicationSubmittedCardProps) {
  const statusLabel = getApplicationStatusLabel(applicationStatus);
  const statusMessage = getLockedStatusMessage(applicationStatus);
  const statusTone = getApplicationStatusTone(applicationStatus);

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={30} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Your Application Has Been Submitted Successfully
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {statusMessage}
          </p>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 md:p-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Application Number</p>
            <p className="mt-1.5 flex items-center gap-2 text-base font-semibold text-slate-900">
              <Hash size={16} className="text-slate-500" />
              {applicationNumber || "Not Generated"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current Status</p>
            <span className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone.badgeClass}`}>
              <span className={`h-2 w-2 rounded-full ${statusTone.dotClass}`} />
              {statusLabel}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Institution</p>
            <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
              <Building2 size={16} className="text-slate-500" />
              {institutionName || "Aurora University"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Applicant</p>
            <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-slate-800">
              <UserRound size={16} className="text-slate-500" />
              {applicantName || "Applicant"}
            </p>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-slate-600">
          You will be notified regarding further admission process updates.
        </p>
      </div>
    </div>
  );
}
