import type { ApplicationStatus } from "@/types/applicant";

export const editableStatuses = [
  "SAVED_AS_DRAFT",
  "APPLICATION_FEE_DUE",
  "APPLICATION_FEE_PAID",
] as const;

export type EditableApplicationStatus = (typeof editableStatuses)[number];

const editableStatusSet = new Set<string>(editableStatuses);

export function isApplicationEditable(status: string | null | undefined): boolean {
  if (!status) return false;
  return editableStatusSet.has(status);
}

export function normalizeApplicationStatus(status: string | null | undefined): ApplicationStatus {
  if (!status) return "SAVED_AS_DRAFT";
  return status as ApplicationStatus;
}

export function getApplicationStatusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

export function getLockedStatusMessage(status: string | null | undefined): string {
  switch (status) {
    case "APPLICATION_SUBMITTED":
      return "Your application has been submitted and is awaiting further processing.";
    case "AURUM_EXAM_PENDING":
      return "Your application has been submitted. Please complete the AURUM examination.";
    case "AURUM_EXAM_PASSED":
      return "You have successfully cleared the AURUM examination.";
    case "AURUM_EXAM_FAILED":
      return "Your AURUM examination result was unsuccessful.";
    case "DOCUMENT_VERIFICATION_PENDING":
      return "Your documents are under verification.";
    case "DOCUMENT_VERIFIED":
      return "Your documents have been successfully verified.";
    case "DOCUMENT_VERIFICATION_FAILED":
      return "Document verification requires attention.";
    case "REGISTRATION_FEE_DUE":
      return "Registration fee payment is pending.";
    case "TUITION_FEE_DUE":
      return "Tuition fee payment is pending.";
    case "STUDENT_ADMISSION_UNDERTAKING_PENDING":
      return "Admission undertaking submission is pending.";
    case "STUDENT_ADMISSION_UNDERTAKING_SUBMITTED":
      return "Admission undertaking submitted successfully.";
    case "ADMISSION_GRANTED":
      return "Congratulations! Admission has been granted.";
    case "ADMISSION_REJECTED":
      return "Your admission application was not approved.";
    default:
      return "Your application has been submitted successfully and is currently under processing.";
  }
}

export function getApplicationStatusTone(status: string | null | undefined): {
  badgeClass: string;
  dotClass: string;
} {
  switch (status) {
    case "ADMISSION_GRANTED":
    case "DOCUMENT_VERIFIED":
    case "AURUM_EXAM_PASSED":
      return {
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dotClass: "bg-emerald-500",
      };
    case "ADMISSION_REJECTED":
    case "DOCUMENT_VERIFICATION_FAILED":
    case "AURUM_EXAM_FAILED":
      return {
        badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
        dotClass: "bg-rose-500",
      };
    case "REGISTRATION_FEE_DUE":
    case "TUITION_FEE_DUE":
    case "APPLICATION_FEE_DUE":
      return {
        badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
        dotClass: "bg-amber-500",
      };
    default:
      return {
        badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
        dotClass: "bg-blue-500",
      };
  }
}
