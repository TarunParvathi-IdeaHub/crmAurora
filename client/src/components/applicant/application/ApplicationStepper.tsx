"use client";

import { Check } from "lucide-react";

type Step = {
  id: number;
  label: string;
  description: string;
};

const STEPS: Step[] = [
  { id: 0, label: "Basic Details", description: "Personal & contact info" },
  { id: 1, label: "Education", description: "Academic history" },
  { id: 2, label: "Entrance Exam", description: "Exam & AURUM details" },
  { id: 3, label: "Documents", description: "Upload required files" },
  { id: 4, label: "Preview", description: "Review your application" },
  { id: 5, label: "Payment", description: "Application fee & submit" },
];

type ApplicationStepperProps = {
  currentStep: number;
  completedSteps: Set<number>;
};

export default function ApplicationStepper({
  currentStep,
  completedSteps,
}: ApplicationStepperProps) {
  return (
    <nav aria-label="Application progress">
      <ol className="flex flex-col">
        {STEPS.map((step, idx) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = currentStep === step.id;
          const isLast = idx === STEPS.length - 1;

          return (
            <li key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isCurrent
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={15} strokeWidth={2.5} />
                  ) : (
                    <span>{step.id + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`my-1 w-0.5 min-h-9 ${
                      isCompleted ? "bg-emerald-400" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
              <div className={`pt-1.5 ${isLast ? "" : "pb-4"}`}>
                <p
                  className={`text-sm font-semibold leading-tight ${
                    isCurrent
                      ? "text-blue-600"
                      : isCompleted
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

