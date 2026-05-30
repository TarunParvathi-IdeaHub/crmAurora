"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, PhoneCall, Send } from "lucide-react";
import type { ApplicationStatus, PaymentStatus } from "@/types/applicant";

const CONSENT_TEXT =
  "I hereby declare that all the information provided in this application is true, correct, and complete to the best of my knowledge and belief. I understand that any false, misleading, or incomplete information may result in the rejection of my application or cancellation of admission at any stage.";

type PaymentSectionProps = {
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationStatus;
  onPay: () => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  consentDeclaration: string;
  onConsentChange: (value: string) => void;
};

export default function PaymentSection({
  paymentStatus,
  applicationStatus,
  onPay,
  onSubmit,
  onBack,
  isSubmitting,
  consentDeclaration,
  onConsentChange,
}: PaymentSectionProps) {
  const isPaid = paymentStatus === "SUCCESS";
  const isFailed = paymentStatus === "FAILED";
  const isSubmitted = applicationStatus === "SUBMITTED";
  const hasConsent = consentDeclaration.trim().length > 0;

  if (isSubmitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">
              Application Submitted Successfully
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Your application has been submitted. A confirmation has been sent
              to your registered email. Keep your Application ID safe for
              future reference.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Payment failed — ask applicant to contact admin
  if (isFailed) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold text-rose-800">Payment Failed</p>
              <p className="mt-1 text-sm text-rose-700">
                Your payment could not be processed. If the amount was deducted
                from your account, it will be refunded within 5–7 business days.
              </p>
              <p className="mt-3 text-sm text-rose-700 font-medium flex items-center gap-1.5">
                <PhoneCall size={14} className="shrink-0" />
                Please contact the admissions office for assistance.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onPay}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
        >
          <CreditCard size={15} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      {/* Payment Status Banner */}
      <div
        className={`rounded-2xl border p-4 ${
          isPaid
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-start gap-3">
          {isPaid ? (
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          )}
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold ${
                isPaid ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              {isPaid
                ? "Payment completed successfully."
                : "Complete payment to submit your application."}
            </p>
            {!isPaid && (
              <p className="mt-0.5 text-xs text-amber-600">
                Application fee: ₹1,000 (non-refundable)
              </p>
            )}
          </div>
          {!isPaid && (
            <button
              type="button"
              onClick={onPay}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
            >
              <CreditCard size={14} />
              Pay Now
            </button>
          )}
        </div>
      </div>

      {/* Consent / Declaration checkbox */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          type="checkbox"
          checked={hasConsent}
          onChange={(e) => onConsentChange(e.target.checked ? CONSENT_TEXT : "")}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
        />
        <span className="text-xs leading-relaxed text-slate-600">
          {CONSENT_TEXT}
        </span>
      </label>

      {/* Submit Button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!isPaid || !hasConsent || isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
      >
        <Send size={15} />
        {isSubmitting ? "Submitting…" : "Submit Application"}
      </button>

      {(!isPaid || !hasConsent) && (
        <p className="text-center text-xs text-slate-400">
          {!isPaid
            ? "Complete payment before submitting."
            : "Please read and agree to the declaration above to enable submission."}
        </p>
      )}
    </div>
  );
}
