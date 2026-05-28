"use client";

import { ArrowLeft } from "lucide-react";
import ApplicationPreview from "../ApplicationPreview";
import PaymentSection from "../PaymentSection";
import type { ApplicationFormState } from "@/types/applicant";

type PreviewStepProps = {
  formState: ApplicationFormState;
  onGoToStep: (step: number) => void;
  onBack: () => void;
  onPay: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  consentDeclaration: string;
  onConsentChange: (value: string) => void;
};

export default function PreviewStep({
  formState,
  onGoToStep,
  onBack,
  onPay,
  onSubmit,
  isSubmitting,
  consentDeclaration,
  onConsentChange,
}: PreviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Review Your Application
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Please review all details carefully before submitting. Click{" "}
          <span className="font-medium text-slate-700">Edit</span> on any
          section to make changes.
        </p>
      </div>

      <ApplicationPreview formState={formState} onEditStep={onGoToStep} />

      <div className="border-t border-slate-200 pt-4">
        <PaymentSection
          paymentStatus={formState.paymentStatus}
          applicationStatus={formState.applicationStatus}
          onPay={onPay}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          consentDeclaration={consentDeclaration}
          onConsentChange={onConsentChange}
        />
      </div>

      {formState.applicationStatus !== "SUBMITTED" && (
        <div className="flex">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft size={15} />
            Back
          </button>
        </div>
      )}
    </div>
  );
}
