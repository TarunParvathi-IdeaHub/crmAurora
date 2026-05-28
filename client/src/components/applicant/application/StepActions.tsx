"use client";

import { ArrowLeft, ArrowRight, Save } from "lucide-react";

type StepActionsProps = {
  currentStep: number;
  totalSteps: number;
  isSaving: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
};

export default function StepActions({
  currentStep,
  totalSteps,
  isSaving,
  onBack,
  onSaveDraft,
  onNext,
}: StepActionsProps) {
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
      <button
        type="button"
        onClick={onBack}
        disabled={currentStep === 0}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Save size={15} />
          {isSaving ? "Saving…" : "Save Draft"}
        </button>

        {!isLastStep && (
          <button
            type="button"
            onClick={onNext}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Next
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
