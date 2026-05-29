"use client";

import ApplicationPreview from "../ApplicationPreview";
import type { ApplicationFormState } from "@/types/applicant";

type PreviewStepProps = {
  formState: ApplicationFormState;
  onGoToStep: (step: number) => void;
};

export default function PreviewStep({
  formState,
  onGoToStep,
}: PreviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Review Your Application
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Please review all details carefully. Click{" "}
          <span className="font-medium text-slate-700">Edit</span> on any
          section to make changes. Click <span className="font-medium text-slate-700">Next</span> to proceed to payment.
        </p>
      </div>

      <ApplicationPreview formState={formState} onEditStep={onGoToStep} />
    </div>
  );
}
