import type { FeeConcessionContext } from "@/lib/api/feeConcession";

export const feeConcessionEditableStatuses = [
  "SAVED_AS_DRAFT",
  "APPLICATION_FEE_DUE",
  "APPLICATION_FEE_PAID",
  "APPLICATION_SUBMITTED",
  "DOCUMENT_VERIFICATION_PENDING",
  "DOCUMENT_VERIFICATION_INCOMPLETE",
  "DOCUMENT_VERIFIED",
  "STUDENT_ADMISSION_UNDERTAKING_PENDING",
] as const;

export const documentVerificationAllowedStatuses = [
  "APPLICATION_SUBMITTED",
  "DOCUMENT_VERIFICATION_PENDING",
  "DOCUMENT_VERIFICATION_INCOMPLETE",
] as const;

export const feeConcessionAllowedStatuses = [
  "APPLICATION_SUBMITTED",
  "STUDENT_ADMISSION_UNDERTAKING_PENDING",
  "DOCUMENT_VERIFICATION_PENDING",
  "DOCUMENT_VERIFICATION_INCOMPLETE",
  "DOCUMENT_VERIFIED",
] as const;

export function canUseFeeConcession(role: string | null | undefined): boolean {
  // Fee Concession is restricted to Admission Director only.
  return role === "admissionDirector";
}

export function canVerifyDocuments(status: string | null | undefined): boolean {
  if (!status) return false;
  return documentVerificationAllowedStatuses.includes(
    status as (typeof documentVerificationAllowedStatuses)[number],
  );
}

export function canManageFeeConcession(status: string | null | undefined): boolean {
  if (!status) return false;
  return feeConcessionAllowedStatuses.includes(status as (typeof feeConcessionAllowedStatuses)[number]);
}

export function getFeeConcessionDisplayStatus(applicationStatus: string): string {
  return applicationStatus.replace(/_/g, " ");
}

export function formatFeeConcessionPreviousDetails(context: FeeConcessionContext) {
  const previous = context.previousConcession;
  if (previous) {
    return {
      batch: previous.batchName ?? "—",
      program: previous.programName ?? context.application.programName,
      actualTuitionAmount: previous.actualTuitionAmount,
      consessionAmount: previous.consessionAmount,
      fixedTuitionAmount: previous.fixedTuitionAmount,
      consessionReason: previous.consessionReason ?? "—",
      lastUpdated: previous.updatedAt ?? "",
    };
  }

  const existing = context.existingConcession;
  if (!existing) return null;

  return {
    batch: existing.batchName ?? "—",
    program: existing.programName ?? context.application.programName,
    actualTuitionAmount: existing.actualTuitionAmount,
    consessionAmount: existing.consessionAmount,
    fixedTuitionAmount: existing.fixedTuitionAmount,
    consessionReason: existing.consessionReason ?? "—",
    lastUpdated: existing.updatedAt ?? "",
  };
}
