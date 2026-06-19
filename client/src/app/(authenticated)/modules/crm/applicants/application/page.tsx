"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useProfile } from "@/providers/ProfileProvider";
import { fetchMyAdmissionDetails, type MyAdmissionDetails } from "@/lib/api/admission";
import type {
  ApplicationFormState,
  ApplicationStatus,
  BasicDetails,
  EducationDetails,
  EntranceExamDetails,
  PaymentStatus,
  UploadedDocuments,
} from "@/types/applicant";
import ApplicationHeader from "@/components/applicant/application/ApplicationHeader";
import ApplicationStepper from "@/components/applicant/application/ApplicationStepper";
import StepActions from "@/components/applicant/application/StepActions";
import PaymentSection from "@/components/applicant/application/PaymentSection";
import BasicDetailsStep from "@/components/applicant/application/steps/BasicDetailsStep";
import EducationDetailsStep from "@/components/applicant/application/steps/EducationDetailsStep";
import EntranceDetailsStep from "@/components/applicant/application/steps/EntranceDetailsStep";
import UploadDocumentsStep from "@/components/applicant/application/steps/UploadDocumentsStep";
import PreviewStep from "@/components/applicant/application/steps/PreviewStep";
import ApplicationSubmittedCard from "@/components/applicant/application/ApplicationSubmittedCard";
import {
  getDobValidationMessage,
  getIndianCurrentYear,
  getIntermediateYears,
  getPGYears,
  getSSCYears,
  getUGYears,
  syncIndianClockWithServer,
} from "@/lib/utils/admissionDateRules";
import {
  isApplicationEditable,
  normalizeApplicationStatus,
} from "@/lib/utils/applicationStatus";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Draft key is scoped to the applicationId so that data from different
 * applicants on the same device never bleeds into each other's session.
 */
const getDraftKey = (appId: string) => `applicant-draft-${appId}`;
const APP_ID_KEY = "applicant-app-id";
const TOTAL_STEPS = 6;

// ── Default empty state ───────────────────────────────────────────────────────

const EMPTY_BASIC: BasicDetails = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "",
  mobileNo: "", email: "",
  aadharNo: "", bloodGroup: "", caste: "", subCaste: "",
  state: "", city: "", pincode: "", presentAddress: "", permanentAddress: "",
  isLocal: true,
  fatherName: "", fatherMobileNo: "", fatherEmail: "",
  motherName: "", motherMobileNo: "", motherEmail: "",
  guardianName: "", guardianMobileNo: "", guardianEmail: "",
};

const EMPTY_EDUCATION: EducationDetails = {
  sscBoard: "", sscInstitutionName: "", sscHallTicketNo: "", sscYearOfPassing: "", sscPercentage: "",
  intermediateBoard: "", intermediateInstitutionName: "", intermediateHallTicketNo: "",
  intermediateYearOfPassing: "", intermediatePercentage: "",
  hasUGDegree: false, ugBoard: "", ugInstitutionName: "", ugHallTicketNo: "", ugYearOfPassing: "", ugPercentage: "",
  hasPGDegree: false, pgBoard: "", pgInstitutionName: "", pgHallTicketNo: "", pgYearOfPassing: "", pgPercentage: "",
};

const EMPTY_ENTRANCE: EntranceExamDetails = {
  quallingEntranceExam: "",
  entranceExamHallTicketNo: "",
  entranceExamRank: "",
  intrestedInAurumExam: true,
};

const EMPTY_DOCUMENTS: UploadedDocuments = {
  aadharCard: null, passportPhoto: null, studentSignature: null, sscMemo: null, intermediateMemo: null,
  ugMemo: null, pgMemo: null, gapCertificate: null, bonafideCertificate: null, transferCertificate: null,
};

const INITIAL_STATE: ApplicationFormState = {
  applicationId: null,
  currentStep: 0,
  basicDetails: EMPTY_BASIC,
  educationDetails: EMPTY_EDUCATION,
  entranceExamDetails: EMPTY_ENTRANCE,
  documents: EMPTY_DOCUMENTS,
  paymentStatus: "PENDING",
  applicationStatus: "SAVED_AS_DRAFT",
  hasGap: false,
  consentDeclaration: "",
};

// ── Degree level helpers ─────────────────────────────────────────────────────
// Robust normalisation so variations like "Post Graduate (PG)" vs
// "Post Graduation (PG)" both resolve correctly.

function dlIsPG(dl: string): boolean {
  const n = dl.toLowerCase();
  return n.includes("post graduate") || n.includes("post graduation");
}
function dlIsPhd(dl: string): boolean {
  const n = dl.toLowerCase();
  return n.includes("doctor of philosophy") || n.includes("phd");
}

function detectAcademicGap(education: EducationDetails, dl: string): boolean {
  const sscYear = Number(education.sscYearOfPassing);
  const intermediateYear = Number(education.intermediateYearOfPassing);
  const ugYear = Number(education.ugYearOfPassing);
  const pgYear = Number(education.pgYearOfPassing);

  if (!Number.isFinite(sscYear) || !Number.isFinite(intermediateYear)) {
    return false;
  }

  const gapAfterSSC = intermediateYear > sscYear + 2;
  const gapAfterIntermediate = (dlIsPG(dl) || dlIsPhd(dl)) && Number.isFinite(ugYear)
    ? ugYear > intermediateYear + (dlIsPhd(dl) ? 3 : 4)
    : false;
  const gapAfterUG = dlIsPhd(dl) && Number.isFinite(pgYear) && Number.isFinite(ugYear)
    ? pgYear > ugYear + 2
    : false;

  return gapAfterSSC || gapAfterIntermediate || gapAfterUG;
}

// ── Validation helpers ────────────────────────────────────────────────────────

const NAME_RE = /^[A-Za-z\s]+$/;
const CASTE_RE = /^[A-Za-z\s-]+$/;
const CITY_RE = /^[A-Za-z\s]+$/;
const AADHAR_RE = /^\d{12}$/;
const PINCODE_RE = /^\d{6}$/;
const MOBILE_RE = /^\d{10}$/;
const INSTITUTION_RE = /^[A-Za-z\s]+$/;
const HALL_TICKET_RE = /^[\d.]+$/;
const PERCENT_RE = /^[\d.]+$/;
const ENTRANCE_EXAM_RE = /^[A-Za-z\s]+$/;
const ENTRANCE_NUM_RE = /^[\d.]+$/;

function isStepComplete(step: number, state: ApplicationFormState, dl = ""): boolean {
  if (step === 0) {
    const b = state.basicDetails;
    // All mandatory fields must be present
    const hasRequired = !!(
      b.firstName && b.lastName && b.dateOfBirth && b.gender &&
      MOBILE_RE.test(b.mobileNo) && b.email.includes("@")
    );
    if (!hasRequired) return false;
    if (!NAME_RE.test(b.firstName.trim())) return false;
    if (!NAME_RE.test(b.lastName.trim())) return false;
    if (b.aadharNo && !AADHAR_RE.test(b.aadharNo.trim())) return false;
    if (b.caste && !CASTE_RE.test(b.caste.trim())) return false;
    if (b.subCaste && !CASTE_RE.test(b.subCaste.trim())) return false;
    if (b.city && !CITY_RE.test(b.city.trim())) return false;
    if (b.pincode && !PINCODE_RE.test(b.pincode.trim())) return false;
    if (b.fatherName && !NAME_RE.test(b.fatherName.trim())) return false;
    if (b.motherName && !NAME_RE.test(b.motherName.trim())) return false;
    if (b.fatherMobileNo && !MOBILE_RE.test(b.fatherMobileNo.trim())) return false;
    if (b.motherMobileNo && !MOBILE_RE.test(b.motherMobileNo.trim())) return false;
    if (!b.isLocal) {
      if (!b.guardianName || !NAME_RE.test(b.guardianName.trim())) return false;
      if (!b.guardianMobileNo || !MOBILE_RE.test(b.guardianMobileNo.trim())) return false;
      if (!b.guardianEmail || !b.guardianEmail.includes("@")) return false;
    }
    return true;
  }
  if (step === 1) {
    const e = state.educationDetails;
    const currentYear = getIndianCurrentYear();
    const allowedSSCYears = getSSCYears(dl, state.basicDetails.dateOfBirth, currentYear);
    const allowedIntermediateYears = getIntermediateYears(dl, e.sscYearOfPassing, currentYear);
    const allowedUGYears = getUGYears(dl, e.intermediateYearOfPassing, currentYear);
    const allowedPGYears = getPGYears(dl, e.ugYearOfPassing, currentYear);

    const base = !!(
      e.sscBoard && e.sscInstitutionName && e.sscHallTicketNo && e.sscYearOfPassing && e.sscPercentage &&
      e.intermediateBoard && e.intermediateInstitutionName && e.intermediateHallTicketNo &&
      e.intermediateYearOfPassing && e.intermediatePercentage
    );
    if (!state.documents.sscMemo || !state.documents.intermediateMemo) return false;
    if (!base) return false;
    if (!allowedSSCYears.includes(e.sscYearOfPassing)) return false;
    if (!allowedIntermediateYears.includes(e.intermediateYearOfPassing)) return false;
    // UG fields required only for PG and PhD applicants
    const ugRequired = dlIsPG(dl) || dlIsPhd(dl);
    if (ugRequired) {
      if (!e.ugBoard || !e.ugInstitutionName || !e.ugHallTicketNo || !e.ugYearOfPassing || !e.ugPercentage) return false;
      if (!allowedUGYears.includes(e.ugYearOfPassing)) return false;
    }
    const showPG = dlIsPhd(dl) || e.hasPGDegree;
    if (showPG) {
      if (!e.pgBoard || !e.pgInstitutionName || !e.pgHallTicketNo || !e.pgYearOfPassing || !e.pgPercentage) return false;
      if (!allowedPGYears.includes(e.pgYearOfPassing)) return false;
    }
    return true;
  }
  if (step === 2) {
    const x = state.entranceExamDetails;
    if (!x.quallingEntranceExam?.trim()) return false;
    if (!x.entranceExamHallTicketNo?.trim()) return false;
    if (!x.entranceExamRank?.trim()) return false;
    if (!ENTRANCE_EXAM_RE.test(x.quallingEntranceExam.trim())) return false;
    if (!ENTRANCE_NUM_RE.test(x.entranceExamHallTicketNo.trim())) return false;
    if (!ENTRANCE_NUM_RE.test(x.entranceExamRank.trim())) return false;
    return true;
  }
  if (step === 3) {
    const d = state.documents;
    const ugDocRequired = dlIsPG(dl) || dlIsPhd(dl);
    const pgDocRequired = dlIsPhd(dl);
    return !!(
      d.aadharCard && d.sscMemo && d.intermediateMemo &&
      (!ugDocRequired || d.ugMemo) &&
      (!pgDocRequired || d.pgMemo) &&
      d.bonafideCertificate && d.transferCertificate
    );
  }
  // Step 4 (Preview) is never pre-marked complete
  return false;
}

function validateStep(
  step: number,
  state: ApplicationFormState,
  dl = ""
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    const b = state.basicDetails;
    // Always required fields
    if (!b.firstName.trim()) errors.firstName = "First name is required.";
    if (!b.lastName.trim()) errors.lastName = "Last name is required.";
    if (!b.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
    if (!b.gender) errors.gender = "Please select a gender.";
    if (!b.mobileNo.trim()) {
      errors.mobileNo = "Mobile number is required.";
    } else if (!MOBILE_RE.test(b.mobileNo.trim())) {
      errors.mobileNo = "Enter a valid 10-digit mobile number.";
    }
    if (!b.email.trim()) {
      errors.email = "Email address is required.";
    } else if (!b.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.email = "Enter a valid email address.";
    }
    const dobValidationMessage = getDobValidationMessage(dl, b.dateOfBirth);
    if (dobValidationMessage) {
      errors.dateOfBirth = dobValidationMessage;
    }
    if (b.firstName.trim() && !NAME_RE.test(b.firstName.trim())) {
      errors.firstName = "First name should contain only letters and spaces.";
    }
    if (b.lastName.trim() && !NAME_RE.test(b.lastName.trim())) {
      errors.lastName = "Last name should contain only letters and spaces.";
    }
    if (!b.aadharNo.trim()) {
      errors.aadharNo = "Aadhaar number is required.";
    } else if (!AADHAR_RE.test(b.aadharNo.trim())) {
      errors.aadharNo = "Aadhaar number must be 12 digits.";
    }
    if (!state.documents.aadharCard) {
      errors.aadharCard = "Aadhaar card is required.";
    }
    if (!b.bloodGroup) {
      errors.bloodGroup = "Blood group is required.";
    }
    if (!b.caste.trim()) {
      errors.caste = "Caste is required.";
    } else if (!CASTE_RE.test(b.caste.trim())) {
      errors.caste = "Caste should contain only letters, spaces, and hyphens.";
    }
    if (!b.subCaste.trim()) {
      errors.subCaste = "Sub-caste is required.";
    } else if (!CASTE_RE.test(b.subCaste.trim())) {
      errors.subCaste = "Sub-caste should contain only letters, spaces, and hyphens.";
    }
    if (!b.state) {
      errors.state = "State is required.";
    }
    if (!b.city.trim()) {
      errors.city = "City is required.";
    } else if (!CITY_RE.test(b.city.trim())) {
      errors.city = "City should contain only letters and spaces.";
    }
    if (!b.pincode.trim()) {
      errors.pincode = "Pincode is required.";
    } else if (!PINCODE_RE.test(b.pincode.trim())) {
      errors.pincode = "Pincode must be 6 digits.";
    }
    if (!b.presentAddress.trim()) {
      errors.presentAddress = "Present address is required.";
    }
    if (!b.permanentAddress.trim()) {
      errors.permanentAddress = "Permanent address is required.";
    }
    if (!b.fatherName.trim()) {
      errors.fatherName = "Father name is required.";
    } else if (!NAME_RE.test(b.fatherName.trim())) {
      errors.fatherName = "Father name should contain only letters and spaces.";
    }
    if (!b.fatherMobileNo.trim()) {
      errors.fatherMobileNo = "Father mobile number is required.";
    } else if (!MOBILE_RE.test(b.fatherMobileNo.trim())) {
      errors.fatherMobileNo = "Enter a valid 10-digit mobile number.";
    }
    if (!b.fatherEmail.trim()) {
      errors.fatherEmail = "Father email is required.";
    } else if (!b.fatherEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.fatherEmail = "Enter a valid email address.";
    }
    if (!b.motherName.trim()) {
      errors.motherName = "Mother name is required.";
    } else if (!NAME_RE.test(b.motherName.trim())) {
      errors.motherName = "Mother name should contain only letters and spaces.";
    }
    if (!b.motherMobileNo.trim()) {
      errors.motherMobileNo = "Mother mobile number is required.";
    } else if (!MOBILE_RE.test(b.motherMobileNo.trim())) {
      errors.motherMobileNo = "Enter a valid 10-digit mobile number.";
    }
    if (!b.motherEmail.trim()) {
      errors.motherEmail = "Mother email is required.";
    } else if (!b.motherEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.motherEmail = "Enter a valid email address.";
    }
    if (!b.isLocal) {
      if (!b.guardianName.trim()) errors.guardianName = "Guardian name is required.";
      if (!b.guardianMobileNo.trim()) errors.guardianMobileNo = "Guardian mobile number is required.";
      if (!b.guardianEmail.trim()) errors.guardianEmail = "Guardian email is required.";
      if (b.guardianName.trim() && !NAME_RE.test(b.guardianName.trim())) {
        errors.guardianName = "Guardian name should contain only letters and spaces.";
      }
      if (b.guardianMobileNo.trim() && !MOBILE_RE.test(b.guardianMobileNo.trim())) {
        errors.guardianMobileNo = "Enter a valid 10-digit mobile number.";
      }
      if (b.guardianEmail.trim() && !b.guardianEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.guardianEmail = "Enter a valid email address.";
      }
    }
    // Age validation for degree levels (PG requires minimum age)
    try {
      if ((dlIsPG(dl) || dlIsPhd(dl)) && b.dateOfBirth) {
        const dob = new Date(b.dateOfBirth);
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 20);
        if (dob > cutoff) {
          errors.dateOfBirth = "Applicant must be at least 20 years old for PG/PhD programs.";
        }
      }
    } catch {
      // ignore date parse errors here; required field check covers missing/invalid values
    }
  }

  if (step === 1) {
    const e = state.educationDetails;
    const currentYear = getIndianCurrentYear();
    const allowedSSCYears = getSSCYears(dl, state.basicDetails.dateOfBirth, currentYear);
    const allowedIntermediateYears = getIntermediateYears(dl, e.sscYearOfPassing, currentYear);
    const allowedUGYears = getUGYears(dl, e.intermediateYearOfPassing, currentYear);
    const allowedPGYears = getPGYears(dl, e.ugYearOfPassing, currentYear);

    if (!e.sscBoard) errors.sscBoard = "Board is required.";
    if (!e.sscInstitutionName.trim()) errors.sscInstitutionName = "Institution name is required.";
    if (!e.sscHallTicketNo.trim()) errors.sscHallTicketNo = "Hall ticket number is required.";
    if (e.sscInstitutionName.trim() && !INSTITUTION_RE.test(e.sscInstitutionName.trim())) {
      errors.sscInstitutionName = "Institution name should contain only letters and spaces.";
    }
    if (e.sscHallTicketNo.trim() && !HALL_TICKET_RE.test(e.sscHallTicketNo.trim())) {
      errors.sscHallTicketNo = "Hall ticket number should contain only numbers and dot.";
    }
    if (!e.sscYearOfPassing) errors.sscYearOfPassing = "Year is required.";
    if (e.sscYearOfPassing && !allowedSSCYears.includes(e.sscYearOfPassing)) {
      errors.sscYearOfPassing = "Select a valid SSC passing year.";
    }
    if (!e.sscPercentage) errors.sscPercentage = "Percentage is required.";
    if (e.sscPercentage.trim() && !PERCENT_RE.test(e.sscPercentage.trim())) {
      errors.sscPercentage = "Percentage / CGPA should contain only numbers and dot.";
    }
    if (!e.intermediateBoard) errors.intermediateBoard = "Board is required.";
    if (!e.intermediateInstitutionName.trim()) errors.intermediateInstitutionName = "Institution name is required.";
    if (!e.intermediateHallTicketNo.trim()) errors.intermediateHallTicketNo = "Hall ticket number is required.";
    if (
      e.intermediateInstitutionName.trim() &&
      !INSTITUTION_RE.test(e.intermediateInstitutionName.trim())
    ) {
      errors.intermediateInstitutionName = "Institution name should contain only letters and spaces.";
    }
    if (
      e.intermediateHallTicketNo.trim() &&
      !HALL_TICKET_RE.test(e.intermediateHallTicketNo.trim())
    ) {
      errors.intermediateHallTicketNo = "Hall ticket number should contain only numbers and dot.";
    }
    if (!e.intermediateYearOfPassing) errors.intermediateYearOfPassing = "Year is required.";
    if (e.intermediateYearOfPassing && !allowedIntermediateYears.includes(e.intermediateYearOfPassing)) {
      errors.intermediateYearOfPassing = "Select a valid Intermediate passing year.";
    }
    if (!e.intermediatePercentage) errors.intermediatePercentage = "Percentage is required.";
    if (e.intermediatePercentage.trim() && !PERCENT_RE.test(e.intermediatePercentage.trim())) {
      errors.intermediatePercentage = "Percentage / CGPA should contain only numbers and dot.";
    }
    if (!state.documents.sscMemo) errors.sscMemo = "SSC / 10th document is required.";
    if (!state.documents.intermediateMemo) errors.intermediateMemo = "Intermediate / 12th document is required.";
    const academicGapDetected = detectAcademicGap(e, dl);
    if ((academicGapDetected || state.hasGap) && !state.documents.gapCertificate) {
      errors.gapCertificate = "Gap certificate is required.";
    }
    // UG required only for PG and PhD applicants
    const ugRequired = dlIsPG(dl) || dlIsPhd(dl);
    if (ugRequired) {
      if (!e.ugBoard?.trim()) errors.ugBoard = "University / board is required.";
      if (!e.ugInstitutionName?.trim()) errors.ugInstitutionName = "Institution name is required.";
      if (!e.ugHallTicketNo?.trim()) errors.ugHallTicketNo = "Hall ticket number is required.";
      if (e.ugInstitutionName?.trim() && !INSTITUTION_RE.test(e.ugInstitutionName.trim())) {
        errors.ugInstitutionName = "Institution name should contain only letters and spaces.";
      }
      if (e.ugHallTicketNo?.trim() && !HALL_TICKET_RE.test(e.ugHallTicketNo.trim())) {
        errors.ugHallTicketNo = "Hall ticket number should contain only numbers and dot.";
      }
      if (!e.ugYearOfPassing) errors.ugYearOfPassing = "Year is required.";
      if (e.ugYearOfPassing && !allowedUGYears.includes(e.ugYearOfPassing)) {
        errors.ugYearOfPassing = "Select a valid UG passing year.";
      }
      if (!e.ugPercentage) errors.ugPercentage = "Percentage is required.";
      if (e.ugPercentage?.trim() && !PERCENT_RE.test(e.ugPercentage.trim())) {
        errors.ugPercentage = "Percentage / CGPA should contain only numbers and dot.";
      }
      if (!state.documents.ugMemo) errors.ugMemo = "UG degree document is required.";
    }
    // PG required when PG section is shown
    const showPG = dlIsPhd(dl) || e.hasPGDegree;
    if (showPG) {
      if (!e.pgBoard?.trim()) errors.pgBoard = "University / board is required.";
      if (!e.pgInstitutionName?.trim()) errors.pgInstitutionName = "Institution name is required.";
      if (e.pgInstitutionName?.trim() && !INSTITUTION_RE.test(e.pgInstitutionName.trim())) {
        errors.pgInstitutionName = "Institution name should contain only letters and spaces.";
      }
      if (!e.pgHallTicketNo?.trim()) errors.pgHallTicketNo = "Hall ticket number is required.";
      if (e.pgHallTicketNo?.trim() && !HALL_TICKET_RE.test(e.pgHallTicketNo.trim())) {
        errors.pgHallTicketNo = "Hall ticket number should contain only numbers and dot.";
      }
      if (!e.pgYearOfPassing) errors.pgYearOfPassing = "Year is required.";
      if (e.pgYearOfPassing && !allowedPGYears.includes(e.pgYearOfPassing)) {
        errors.pgYearOfPassing = "Select a valid PG passing year.";
      }
      if (!e.pgPercentage) errors.pgPercentage = "Percentage is required.";
      if (e.pgPercentage?.trim() && !PERCENT_RE.test(e.pgPercentage.trim())) {
        errors.pgPercentage = "Percentage / CGPA should contain only numbers and dot.";
      }
      if (!state.documents.pgMemo) errors.pgMemo = "PG degree document is required.";
    }
  }

  if (step === 2) {
    const x = state.entranceExamDetails;
    if (!x.quallingEntranceExam.trim()) {
      errors.quallingEntranceExam = "Entrance exam name is required.";
    } else if (!ENTRANCE_EXAM_RE.test(x.quallingEntranceExam.trim())) {
      errors.quallingEntranceExam = "Entrance exam name should contain only letters and spaces.";
    }
    if (!x.entranceExamHallTicketNo.trim()) {
      errors.entranceExamHallTicketNo = "Hall ticket number is required.";
    } else if (!ENTRANCE_NUM_RE.test(x.entranceExamHallTicketNo.trim())) {
      errors.entranceExamHallTicketNo = "Hall ticket number should contain only numbers and dot.";
    }
    if (!x.entranceExamRank.trim()) {
      errors.entranceExamRank = "Rank is required.";
    } else if (!ENTRANCE_NUM_RE.test(x.entranceExamRank.trim())) {
      errors.entranceExamRank = "Rank / score should contain only numbers and dot.";
    }
  }

  if (step === 3) {
    const d = state.documents;
    const ugDocRequired = dlIsPG(dl) || dlIsPhd(dl);
    const pgDocRequired = dlIsPhd(dl);
    if (!d.aadharCard) errors.aadharCard = "Aadhaar card is required.";
    if (!d.passportPhoto) errors.passportPhoto = "Photograph is required.";
    if (!d.studentSignature) errors.studentSignature = "Signature is required.";
    if (!d.sscMemo) errors.sscMemo = "SSC / 10th memo is required.";
    if (!d.intermediateMemo) errors.intermediateMemo = "Intermediate / 12th memo is required.";
    if (ugDocRequired && !d.ugMemo) errors.ugMemo = "UG degree certificate is required.";
    if (pgDocRequired && !d.pgMemo) errors.pgMemo = "PG degree certificate is required.";
    if (!d.bonafideCertificate) errors.bonafideCertificate = "Bonafide certificate is required.";
    if (!d.transferCertificate) errors.transferCertificate = "Transfer certificate is required.";
  }

  // Steps 2 (Entrance) and 3 (Documents): no required fields
  return errors;
}

function focusFirstErrorField(errors: Record<string, string>) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;
  // Prefer visible wrapper targets first, fall back to name attribute
  const element =
    document.querySelector<HTMLElement>(`[data-error-field="${firstKey}"]`) ||
    document.querySelector<HTMLElement>(`[name="${firstKey}"]`);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    // Try to focus a focusable descendant (label, input, button, select, textarea)
    const focusable = element.querySelector<HTMLElement>(
      'label[for], button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    try {
      if (focusable) focusable.focus();
      else element.focus();
    } catch {
      // ignore focus errors
    }
  }
}

// ── FormData builder ──────────────────────────────────────────────────────────

function buildFormData(state: ApplicationFormState): FormData {
  const fd = new FormData();
  const b = state.basicDetails;
  const e = state.educationDetails;
  const x = state.entranceExamDetails;
  const d = state.documents;

  const appendStr = (key: string, val: string | undefined) => {
    if (val?.trim()) fd.append(key, val.trim());
  };

  // Basic details
  const basicFields: (keyof BasicDetails)[] = [
    "firstName", "lastName", "dateOfBirth", "gender", "mobileNo", "email",
    "aadharNo", "bloodGroup", "caste", "subCaste",
    "state", "city", "pincode", "presentAddress", "permanentAddress",
    "fatherName", "fatherMobileNo", "fatherEmail",
    "motherName", "motherMobileNo", "motherEmail",
    "guardianName", "guardianMobileNo", "guardianEmail",
  ];
  for (const key of basicFields) appendStr(key, b[key] as string);
  fd.append("isLocal", String(b.isLocal));

  // Education details
  const sscFields: (keyof EducationDetails)[] = [
    "sscBoard", "sscInstitutionName", "sscHallTicketNo", "sscYearOfPassing", "sscPercentage",
    "intermediateBoard", "intermediateInstitutionName", "intermediateHallTicketNo",
    "intermediateYearOfPassing", "intermediatePercentage",
  ];
  for (const key of sscFields) appendStr(key, e[key] as string);
  if (e.hasUGDegree) {
    appendStr("ugBoard", e.ugBoard);
    appendStr("ugInstitutionName", e.ugInstitutionName);
    appendStr("ugHallTicketNo", e.ugHallTicketNo);
    appendStr("ugYearOfPassing", e.ugYearOfPassing);
    appendStr("ugPercentage", e.ugPercentage);
  }
  if (e.hasPGDegree) {
    appendStr("pgBoard", e.pgBoard);
    appendStr("pgInstitutionName", e.pgInstitutionName);
    appendStr("pgHallTicketNo", e.pgHallTicketNo);
    appendStr("pgYearOfPassing", e.pgYearOfPassing);
    appendStr("pgPercentage", e.pgPercentage);
  }

  // Entrance exam
  appendStr("quallingEntranceExam", x.quallingEntranceExam);
  appendStr("entranceExamHallTicketNo", x.entranceExamHallTicketNo);
  appendStr("entranceExamRank", x.entranceExamRank);
  fd.append("intrestedInAurumExam", String(x.intrestedInAurumExam));

  // Documents (PDF files)
  const docFields: (keyof UploadedDocuments)[] = [
    "aadharCard", "passportPhoto", "studentSignature", "sscMemo", "intermediateMemo", "ugMemo",
    "pgMemo", "gapCertificate", "bonafideCertificate", "transferCertificate",
  ];
  for (const key of docFields) {
    const doc = d[key];
    if (doc?.file) fd.append(key, doc.file, doc.name);
  }

  return fd;
}

// ── Section-wise FormData builder ─────────────────────────────────────────────
// Sends only the data for the current step — avoids re-uploading every field
// and every document on every save.
function buildSectionFormData(step: number, state: ApplicationFormState): FormData {
  const fd = new FormData();
  const appendStr = (key: string, val: string | undefined) => {
    if (val?.trim()) fd.append(key, val.trim());
  };

  if (step === 0) {
    const b = state.basicDetails;
    const fields: (keyof BasicDetails)[] = [
      "firstName", "lastName", "dateOfBirth", "gender", "mobileNo", "email",
      "aadharNo", "bloodGroup", "caste", "subCaste",
      "state", "city", "pincode", "presentAddress", "permanentAddress",
      "fatherName", "fatherMobileNo", "fatherEmail",
      "motherName", "motherMobileNo", "motherEmail",
      "guardianName", "guardianMobileNo", "guardianEmail",
    ];
    for (const key of fields) appendStr(key, b[key] as string);
    fd.append("isLocal", String(b.isLocal));
    if (state.documents.aadharCard?.file) {
      fd.append("aadharCard", state.documents.aadharCard.file, state.documents.aadharCard.name);
    }
  }

  if (step === 1) {
    const e = state.educationDetails;
    appendStr("sscBoard", e.sscBoard);
    appendStr("sscInstitutionName", e.sscInstitutionName);
    appendStr("sscHallTicketNo", e.sscHallTicketNo);
    appendStr("sscYearOfPassing", e.sscYearOfPassing);
    appendStr("sscPercentage", e.sscPercentage);
    appendStr("intermediateBoard", e.intermediateBoard);
    appendStr("intermediateInstitutionName", e.intermediateInstitutionName);
    appendStr("intermediateHallTicketNo", e.intermediateHallTicketNo);
    appendStr("intermediateYearOfPassing", e.intermediateYearOfPassing);
    appendStr("intermediatePercentage", e.intermediatePercentage);
    if (state.documents.sscMemo?.file) {
      fd.append("sscMemo", state.documents.sscMemo.file, state.documents.sscMemo.name);
    }
    if (state.documents.intermediateMemo?.file) {
      fd.append("intermediateMemo", state.documents.intermediateMemo.file, state.documents.intermediateMemo.name);
    }
    if (e.hasUGDegree) {
      appendStr("ugBoard", e.ugBoard);
      appendStr("ugInstitutionName", e.ugInstitutionName);
      appendStr("ugHallTicketNo", e.ugHallTicketNo);
      appendStr("ugYearOfPassing", e.ugYearOfPassing);
      appendStr("ugPercentage", e.ugPercentage);
      if (state.documents.ugMemo?.file) {
        fd.append("ugMemo", state.documents.ugMemo.file, state.documents.ugMemo.name);
      }
    }
    if (e.hasPGDegree) {
      appendStr("pgBoard", e.pgBoard);
      appendStr("pgInstitutionName", e.pgInstitutionName);
      appendStr("pgHallTicketNo", e.pgHallTicketNo);
      appendStr("pgYearOfPassing", e.pgYearOfPassing);
      appendStr("pgPercentage", e.pgPercentage);
      if (state.documents.pgMemo?.file) {
        fd.append("pgMemo", state.documents.pgMemo.file, state.documents.pgMemo.name);
      }
    }
    if (state.documents.gapCertificate?.file) {
      fd.append("gapCertificate", state.documents.gapCertificate.file, state.documents.gapCertificate.name);
    }
  }

  if (step === 2) {
    const x = state.entranceExamDetails;
    appendStr("quallingEntranceExam", x.quallingEntranceExam);
    appendStr("entranceExamHallTicketNo", x.entranceExamHallTicketNo);
    appendStr("entranceExamRank", x.entranceExamRank);
    fd.append("intrestedInAurumExam", String(x.intrestedInAurumExam));
  }

  if (step === 3) {
    const d = state.documents;
    const docFields: (keyof UploadedDocuments)[] = [
      "aadharCard", "passportPhoto", "studentSignature", "sscMemo", "intermediateMemo", "ugMemo",
      "pgMemo", "gapCertificate", "bonafideCertificate", "transferCertificate",
    ];
    for (const key of docFields) {
      const doc = d[key];
      // Only upload newly selected files — skip already-uploaded ones (file === null)
      if (doc?.file) fd.append(key, doc.file, doc.name);
    }
  }

  return fd;
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ApplicationPage() {
  const searchParams = useSearchParams();
  const { profile } = useProfile();
  const [appState, setAppState] = useState<ApplicationFormState>(INITIAL_STATE);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [degreeLevel, setDegreeLevel] = useState<string>("");
  const [institutionName, setInstitutionName] = useState<string>("");
  const [programName, setProgramName] = useState<string>("");
  const [admissionCycleName, setAdmissionCycleName] = useState<string>("");
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasFetchedApplication, setHasFetchedApplication] = useState(false);
  const hasMounted = useRef(false);
  // Set to true once the server responds successfully. Guards persistDraft so
  // that a click before data loads never writes an empty draft to localStorage
  // (an empty draft with hasDraft=true would block full server hydration on the
  // next page load, making all fields appear blank).
  const hasServerData = useRef(false);
  const dobMax = useMemo(() => {
    const today = new Date();
    if (dlIsPG(degreeLevel) || dlIsPhd(degreeLevel)) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 20);
      return d.toISOString().split("T")[0];
    }
    return today.toISOString().split("T")[0];
  }, [degreeLevel]);

  // ── Mount: resolve applicationId + load scoped local draft ──────────────────

  useEffect(() => {
    const fromUrl = searchParams.get("applicationId");
    const appId = fromUrl ?? localStorage.getItem(APP_ID_KEY) ?? null;

    if (appId) {
      if (fromUrl) localStorage.setItem(APP_ID_KEY, fromUrl);
      setApplicationId(appId);

      // Load draft scoped to this application (never leaks to other applicants)
      try {
        const raw = localStorage.getItem(getDraftKey(appId));
        if (raw) {
          const parsed = JSON.parse(raw) as ApplicationFormState;
          // Blob URLs / File objects cannot survive serialisation — nullify them
          const docs = { ...parsed.documents };
          for (const k of Object.keys(docs) as (keyof UploadedDocuments)[]) {
            if (docs[k]) docs[k] = { ...docs[k]!, previewUrl: null, file: null };
          }
          setAppState({
            ...INITIAL_STATE,
            ...parsed,
            currentStep: 0,
            entranceExamDetails: parsed.entranceExamDetails ?? EMPTY_ENTRANCE,
            consentDeclaration: parsed.consentDeclaration ?? "",
            documents: docs,
          });
        }
      } catch {
        // Corrupt draft — start fresh
      }
    }

    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fallback: use profile.applicationId when URL / localStorage has nothing ──
  // This handles the case where the applicant navigates to the application page
  // without a ?applicationId= query param (e.g. via dashboard link).
  useEffect(() => {
    if (!applicationId && profile?.applicationId) {
      const id = profile.applicationId;
      localStorage.setItem(APP_ID_KEY, id);
      setApplicationId(id);
    }
  }, [profile, applicationId]);

  // ── Fetch application from server ──────────────────────────────────────────
  // Extracted into a callback so it can also be called programmatically
  // (e.g. after a successful save to sync with server-confirmed data).
  // Always restores:
  //   • degree level (drives education section toggles)
  //   • document signed URLs (localStorage never stores them — they expire)
  // Additionally fully hydrates text fields when no local draft exists.

  const refreshFromServer = useCallback(() => {
    if (!applicationId) return;

    fetch(`${API_BASE}/api/student-application/get/${applicationId}`, {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) return Promise.reject(r.status);
        syncIndianClockWithServer(r.headers.get("date"));
        return r.json();
      })
      .then(async ({ data }) => {
        // Fetch payment status in parallel — non-blocking, ignore on error
        const feeStatus = await fetch(
          `${API_BASE}/api/application-fee/status/${applicationId}`,
          { credentials: "include" }
        )
          .then(async (r) => {
            if (!r.ok) return null;
            syncIndianClockWithServer(r.headers.get("date"));
            return r.json();
          })
          .catch(() => null) as { paymentStatus?: string } | null;

        const serverPaymentStatus: PaymentStatus =
          feeStatus?.paymentStatus === "SUCCESS" ? "SUCCESS" :
          feeStatus?.paymentStatus === "FAILED"  ? "FAILED"  : "PENDING";

        const serverAppStatus: ApplicationStatus = normalizeApplicationStatus(
          data.applicationStatus as string
        );

        const level: string = data?.degreeLevel?.levelName ?? "";
        setDegreeLevel(level);
        setInstitutionName(data?.institution?.institutionName ?? "");
        setProgramName(data?.program?.programName ?? "");
        setAdmissionCycleName(data?.admissionCycle?.admissionCycleName ?? "");
        setApplicationNumber(data?.applicationNumber ?? null);

        // Degree level is the source of truth for showing UG/PG sections.
        // Must be true regardless of whether the student has filled the fields yet.
        const ugRequired = dlIsPG(level) || dlIsPhd(level);
        const pgRequired = dlIsPhd(level);

        // Build document map from server signed URLs.
        // These are ALWAYS applied because persistDraft strips previewUrl to null
        // (signed URLs expire; File objects aren't serialisable), so the only way
        // to restore "already uploaded" indicators after a refresh is from the server.
        const mkDoc = (url: string | null | undefined, name: string) =>
          url ? { name, size: 0, previewUrl: url, file: null } : null;

        const serverDocs: UploadedDocuments = {
          aadharCard:          mkDoc(data.documents?.aadharCard,          "aadharCard.pdf"),
          passportPhoto:       mkDoc(data.documents?.passportPhoto,       "passportPhoto.jpg"),
          studentSignature:    mkDoc(data.documents?.studentSignature,    "studentSignature.jpg"),
          sscMemo:             mkDoc(data.documents?.sscMemo,             "sscMemo.pdf"),
          intermediateMemo:    mkDoc(data.documents?.intermediateMemo,    "intermediateMemo.pdf"),
          ugMemo:              mkDoc(data.documents?.ugMemo,              "ugMemo.pdf"),
          pgMemo:              mkDoc(data.documents?.pgMemo,              "pgMemo.pdf"),
          gapCertificate:      mkDoc(data.documents?.gapCertificate,      "gapCertificate.pdf"),
          bonafideCertificate: mkDoc(data.documents?.bonafideCertificate, "bonafideCertificate.pdf"),
          transferCertificate: mkDoc(data.documents?.transferCertificate, "transferCertificate.pdf"),
        };

        // Mark that we have live server data — unblocks persistDraft.
        hasServerData.current = true;
        setHasFetchedApplication(true);

        const hasDraft = !!localStorage.getItem(getDraftKey(applicationId));

        if (!hasDraft) {
          // No local draft — full hydration from server in a single setAppState call.
          const edu = Array.isArray(data.studentEducationDetails)
            ? data.studentEducationDetails[0]
            : data.studentEducationDetails ?? null;

          const toStr = (v: unknown) => (v != null ? String(v) : "");

          setAppState((s) => ({
            ...s,
            basicDetails: {
              firstName:        toStr(data.firstName),
              lastName:         toStr(data.lastName),
              email:            toStr(data.email),
              mobileNo:         toStr(data.mobileNo),
              gender:           toStr(data.gender),
              dateOfBirth:      data.dateOfBirth
                ? new Date(data.dateOfBirth).toISOString().split("T")[0]
                : "",
              aadharNo:         toStr(data.aadharNo),
              bloodGroup:       toStr(data.bloodGroup),
              caste:            toStr(data.caste),
              subCaste:         toStr(data.subCaste),
              state:            toStr(data.state),
              city:             toStr(data.city),
              pincode:          toStr(data.pincode),
              presentAddress:   toStr(data.presentAddress),
              permanentAddress: toStr(data.permanentAddress),
              isLocal:          data.isLocal ?? true,
              fatherName:       toStr(data.fatherName),
              fatherMobileNo:   toStr(data.fatherMobileNo),
              fatherEmail:      toStr(data.fatherEmail),
              motherName:       toStr(data.motherName),
              motherMobileNo:   toStr(data.motherMobileNo),
              motherEmail:      toStr(data.motherEmail),
              guardianName:     toStr(data.guardianName),
              guardianMobileNo: toStr(data.guardianMobileNo),
              guardianEmail:    toStr(data.guardianEmail),
            },
            educationDetails: edu
              ? {
                  sscBoard:                    toStr(edu.sscBoard),
                  sscInstitutionName:          toStr(edu.sscInstitutionName),
                  sscHallTicketNo:             toStr(edu.sscHallTicketNo),
                  sscYearOfPassing:            toStr(edu.sscYearOfPassing),
                  sscPercentage:               toStr(edu.sscPercentage),
                  intermediateBoard:           toStr(edu.intermediateBoard),
                  intermediateInstitutionName: toStr(edu.intermediateInstitutionName),
                  intermediateHallTicketNo:    toStr(edu.intermediateHallTicketNo),
                  intermediateYearOfPassing:   toStr(edu.intermediateYearOfPassing),
                  intermediatePercentage:      toStr(edu.intermediatePercentage),
                  // Degree level takes priority: PG/Phd students always show UG fields
                  // even before they have filled them in.
                  hasUGDegree: ugRequired || !!(edu.ugBoard || edu.ugInstitutionName || edu.ugYearOfPassing),
                  ugBoard:           toStr(edu.ugBoard),
                  ugInstitutionName: toStr(edu.ugInstitutionName),
                  ugHallTicketNo:    toStr(edu.ugHallTicketNo),
                  ugYearOfPassing:   toStr(edu.ugYearOfPassing),
                  ugPercentage:      toStr(edu.ugPercentage),
                  hasPGDegree: pgRequired || !!(edu.pgBoard || edu.pgYearOfPassing),
                  pgBoard:         toStr(edu.pgBoard),
                  pgInstitutionName: toStr(edu.pgInstitutionName),
                  pgHallTicketNo:  toStr(edu.pgHallTicketNo),
                  pgYearOfPassing: toStr(edu.pgYearOfPassing),
                  pgPercentage:    toStr(edu.pgPercentage),
                }
              : {
                  ...s.educationDetails,
                  hasUGDegree: ugRequired || s.educationDetails.hasUGDegree,
                  hasPGDegree: pgRequired || s.educationDetails.hasPGDegree,
                },
            entranceExamDetails: {
              quallingEntranceExam:     toStr(data.quallingEntranceExam),
              entranceExamHallTicketNo: toStr(data.entranceExamHallTicketNo),
              entranceExamRank:         toStr(data.entranceExamRank),
              intrestedInAurumExam:     data.intrestedInAurumExam ?? true,
            },
            documents: serverDocs,
            consentDeclaration: data.consentDeclaration ?? "",
            paymentStatus: serverPaymentStatus,
            applicationStatus: serverAppStatus,
          }));
        } else {
          // Local draft exists — preserve the user's in-progress text edits but:
          // 1. Correct education toggles from degree level (draft may predate the fetch).
          // 2. Restore signed document URLs.  For each slot, prefer any newly selected
          //    File object the user picked this session; otherwise use the server URL.
          setAppState((s) => ({
            ...s,
            educationDetails: {
              ...s.educationDetails,
              hasUGDegree: ugRequired || s.educationDetails.hasUGDegree,
              hasPGDegree: pgRequired || s.educationDetails.hasPGDegree,
            },
            documents: {
              aadharCard:          s.documents.aadharCard?.file          ? s.documents.aadharCard          : serverDocs.aadharCard,
              passportPhoto:       s.documents.passportPhoto?.file       ? s.documents.passportPhoto       : serverDocs.passportPhoto,
              studentSignature:    s.documents.studentSignature?.file    ? s.documents.studentSignature    : serverDocs.studentSignature,
              sscMemo:             s.documents.sscMemo?.file             ? s.documents.sscMemo             : serverDocs.sscMemo,
              intermediateMemo:    s.documents.intermediateMemo?.file    ? s.documents.intermediateMemo    : serverDocs.intermediateMemo,
              ugMemo:              s.documents.ugMemo?.file              ? s.documents.ugMemo              : serverDocs.ugMemo,
              pgMemo:              s.documents.pgMemo?.file              ? s.documents.pgMemo              : serverDocs.pgMemo,
              gapCertificate:      s.documents.gapCertificate?.file      ? s.documents.gapCertificate      : serverDocs.gapCertificate,
              bonafideCertificate: s.documents.bonafideCertificate?.file ? s.documents.bonafideCertificate : serverDocs.bonafideCertificate,
              transferCertificate: s.documents.transferCertificate?.file ? s.documents.transferCertificate : serverDocs.transferCertificate,
            },
            paymentStatus: serverPaymentStatus,
            applicationStatus: serverAppStatus,
          }));
        }
      })
      .catch(() => {
        // Non-critical — proceed with whatever state we already have
        setHasFetchedApplication(true);
      });
  }, [applicationId]);

  // Run once when applicationId becomes available (on mount / navigation).
  useEffect(() => {
    if (applicationId) refreshFromServer();
  }, [applicationId, refreshFromServer]);

  // ── Handle return from EaseBuzz payment gateway ──────────────────────────────
  // After payment, EaseBuzz POSTs to the backend which redirects the browser
  // to this page with ?payment=success|failed|error.  We detect that here,
  // jump straight to the payment step, clean the URL, and let refreshFromServer
  // (already triggered above) load the authoritative status from the server.
  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    if (!paymentParam) return;

    // Navigate to the payment/submit step
    setAppState((s) => ({ ...s, currentStep: 5 }));

    // If payment failed, set the status immediately so the UI is responsive
    // even before refreshFromServer completes
    if (paymentParam === "failed") {
      setAppState((s) => ({ ...s, currentStep: 5, paymentStatus: "FAILED" }));
    }

    // Clean the ?payment= param from the URL so a hard refresh doesn't re-trigger
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    window.history.replaceState(null, "", url.toString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedSteps = useMemo(() => {
    const s = new Set<number>();
    for (let i = 0; i < TOTAL_STEPS - 1; i++) {
      if (isStepComplete(i, appState, degreeLevel)) s.add(i);
    }
    return s;
  }, [appState, degreeLevel]);

  // ── Draft persistence ────────────────────────────────────────────────────────

  const persistDraft = useCallback((state: ApplicationFormState) => {
    const draftKeyId = applicationId ?? localStorage.getItem(APP_ID_KEY) ?? "temp-application-draft";
    try {
      // Strip blob URLs / File objects before storing (not serialisable)
      const docs: UploadedDocuments = {} as UploadedDocuments;
      for (const k of Object.keys(state.documents) as (keyof UploadedDocuments)[]) {
        const doc = state.documents[k];
        docs[k] = doc ? { name: doc.name, size: doc.size, previewUrl: null, file: null } : null;
      }
      localStorage.setItem(getDraftKey(draftKeyId), JSON.stringify({ ...state, documents: docs }));
    } catch {
      // Storage quota exceeded or SSR
    }
  }, [applicationId]);

  // ── Dismiss save-success toast after 3 s ────────────────────────────────────
  useEffect(() => {
    if (!saveSuccess) return;
    const t = setTimeout(() => setSaveSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [saveSuccess]);

  // ── Section-wise server save ─────────────────────────────────────────────────
  // Returns true when the save succeeded (or data is safe in localStorage on a
  // network error), false only when the server explicitly rejects the request.
  const saveSectionToServer = useCallback(async (
    step: number,
    state: ApplicationFormState
  ): Promise<boolean> => {
    if (!applicationId) {
      // No application ID yet; save locally and allow navigation.
      persistDraft(state);
      setLastSavedAt(new Date());
      setSaveSuccess(true);
      setSaveError("");
      return true;
    }
    // Only persist to localStorage once the server has responded at least once.
    // This prevents a click before data loads from writing an empty INITIAL_STATE
    // draft — which would then block full server hydration on the next page load.
    if (hasServerData.current) persistDraft(state);

    // Documents step: upload files one-by-one to avoid oversized multipart
    // requests in production proxies (common nginx 413 issue when many PDFs
    // are sent together in a single request).
    if (step === 3) {
      const docKeys: (keyof UploadedDocuments)[] = [
        "aadharCard", "passportPhoto", "studentSignature", "sscMemo", "intermediateMemo", "ugMemo",
        "pgMemo", "gapCertificate", "bonafideCertificate", "transferCertificate",
      ];
      const pendingDocs = docKeys.filter((k) => state.documents[k]?.file != null);

      if (pendingDocs.length === 0) {
        setLastSavedAt(new Date());
        setSaveSuccess(true);
        setSaveError("");
        return true;
      }

      const mergedDocUrls: Record<string, string> = {};

      try {
        for (const key of pendingDocs) {
          const file = state.documents[key]?.file;
          if (!file) continue;

          const fdSingle = new FormData();
          fdSingle.append(key, file, file.name);

          const res = await fetch(
            `${API_BASE}/api/student-application/save-draft/${applicationId}`,
            { method: "PUT", body: fdSingle, credentials: "include" }
          );

          const raw = await res.text().catch(() => "");
          let payload: { error?: string; uploadedDocuments?: Record<string, string> } = {};
          if (raw) {
            try {
              payload = JSON.parse(raw) as { error?: string; uploadedDocuments?: Record<string, string> };
            } catch {
              payload = {};
            }
          }

          if (!res.ok) {
            const fallback =
              res.status === 413
                ? "Upload request is too large for production proxy. Upload smaller PDFs or increase nginx client_max_body_size."
                : res.status === 400
                ? "Invalid document upload. Only PDF files up to 5 MB are allowed."
                : "Failed to save. Please try again.";
            setSaveError(payload.error ?? fallback);
            return false;
          }

          Object.assign(mergedDocUrls, payload.uploadedDocuments ?? {});
        }

        if (Object.keys(mergedDocUrls).length > 0) {
          setAppState((s) => {
            const updatedDocs = { ...s.documents };
            for (const [field, url] of Object.entries(mergedDocUrls)) {
              const k = field as keyof UploadedDocuments;
              if (updatedDocs[k]) {
                updatedDocs[k] = {
                  name: updatedDocs[k]!.name,
                  size: updatedDocs[k]!.size,
                  previewUrl: url,
                  file: null,
                };
              }
            }
            return { ...s, documents: updatedDocs };
          });
        }

        setLastSavedAt(new Date());
        setSaveSuccess(true);
        setSaveError("");
        return true;
      } catch {
        setSaveError("Network error. Draft saved locally — check your connection.");
        setLastSavedAt(new Date());
        return true;
      }
    }

    const fd = buildSectionFormData(step, state);
    try {
      const res = await fetch(
        `${API_BASE}/api/student-application/save-draft/${applicationId}`,
        { method: "PUT", body: fd, credentials: "include" }
      );

      const raw = await res.text().catch(() => "");
      let payload: { error?: string; uploadedDocuments?: Record<string, string> } = {};
      if (raw) {
        try {
          payload = JSON.parse(raw) as { error?: string; uploadedDocuments?: Record<string, string> };
        } catch {
          payload = {};
        }
      }

      if (!res.ok) {
        setSaveError(payload.error ?? "Failed to save. Please try again.");
        return false;
      }

      const newDocUrls = payload.uploadedDocuments ?? {};
      if (Object.keys(newDocUrls).length > 0) {
        setAppState((s) => {
          const updatedDocs = { ...s.documents };
          for (const [field, url] of Object.entries(newDocUrls)) {
            const k = field as keyof UploadedDocuments;
            if (updatedDocs[k]) {
              updatedDocs[k] = {
                name: updatedDocs[k]!.name,
                size: updatedDocs[k]!.size,
                previewUrl: url,
                file: null,
              };
            }
          }
          return { ...s, documents: updatedDocs };
        });
      }

      setLastSavedAt(new Date());
      setSaveSuccess(true);
      setSaveError("");
      return true;
    } catch {
      // Network error — draft is safe in localStorage; allow navigation.
      setSaveError("Network error. Draft saved locally — check your connection.");
      setLastSavedAt(new Date());
      return true;
    }
  }, [applicationId, persistDraft]);

  const handleSaveDraft = useCallback(async () => {
    if (!applicationId || isSaving) return;
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    await saveSectionToServer(appState.currentStep, appState);
    setIsSaving(false);
  }, [appState, applicationId, isSaving, saveSectionToServer]);

  // ── Navigation ───────────────────────────────────────────────────────────────

  const handleNext = useCallback(async () => {
    if (isSaving) {
      return;
    }
    const stepErrors = validateStep(appState.currentStep, appState, degreeLevel);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setTimeout(() => {
        focusFirstErrorField(stepErrors);
      }, 100);
      return;
    }
    setErrors({});
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);
    const saved = await saveSectionToServer(appState.currentStep, appState);
    setIsSaving(false);
    if (!saved) return;
    const nextStep = Math.min(appState.currentStep + 1, TOTAL_STEPS - 1);
    // Use a functional updater so we don't overwrite the state updates
    // (e.g. server-returned previewUrls) that saveSectionToServer applied.
    setAppState((s) => {
      const updated = { ...s, currentStep: nextStep };
      persistDraft(updated);
      return updated;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [appState, degreeLevel, isSaving, saveSectionToServer, persistDraft]);

  const handleBack = useCallback(() => {
    setErrors({});
    const prevStep = Math.max(appState.currentStep - 1, 0);
    setAppState((s) => ({ ...s, currentStep: prevStep }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [appState.currentStep]);

  const handleGoToStep = useCallback((step: number) => {
    setErrors({});
    setAppState((s) => ({ ...s, currentStep: step }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Field updates ────────────────────────────────────────────────────────────

  const handleBasicChange = useCallback(
    (updates: Partial<BasicDetails>) => {
      setAppState((s) => ({
        ...s,
        basicDetails: { ...s.basicDetails, ...updates },
      }));
      if (Object.keys(updates).some((k) => errors[k])) {
        setErrors((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(updates)) delete next[k];
          return next;
        });
      }
    },
    [errors]
  );

  const handleAadharCardFileChange = useCallback(
    (file: File | null) => {
      setAppState((s) => ({
        ...s,
        documents: {
          ...s.documents,
          aadharCard: file
            ? { name: file.name, size: file.size, previewUrl: URL.createObjectURL(file), file }
            : null,
        },
      }));
      if (errors.aadharCard) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.aadharCard;
          return next;
        });
      }
    },
    [errors]
  );

  const handleEducationChange = useCallback(
    (updates: Partial<EducationDetails>) => {
      setAppState((s) => ({
        ...s,
        educationDetails: { ...s.educationDetails, ...updates },
      }));
      if (Object.keys(updates).some((k) => errors[k])) {
        setErrors((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(updates)) delete next[k];
          return next;
        });
      }
    },
    [errors]
  );

  const handleDocumentsChange = useCallback(
    (updates: Partial<UploadedDocuments>) => {
      setAppState((s) => ({
        ...s,
        documents: { ...s.documents, ...updates },
      }));
      if (Object.keys(updates).some((k) => errors[k])) {
        setErrors((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(updates)) delete next[k];
          return next;
        });
      }
    },
    [errors]
  );

  const handleEntranceChange = useCallback(
    (updates: Partial<EntranceExamDetails>) => {
      setAppState((s) => ({
        ...s,
        entranceExamDetails: { ...s.entranceExamDetails, ...updates },
      }));
      if (Object.keys(updates).some((k) => errors[k])) {
        setErrors((prev) => {
          const next = { ...prev };
          for (const k of Object.keys(updates)) delete next[k];
          return next;
        });
      }
    },
    [errors]
  );

  const handleGapToggle = useCallback((val: boolean) => {
    setAppState((s) => ({ ...s, hasGap: val }));
  }, []);

  const handleConsentChange = useCallback((value: string) => {
    setAppState((s) => ({ ...s, consentDeclaration: value }));
  }, []);

  // Check Aadhaar uniqueness when a full 12-digit number is entered.
  useEffect(() => {
    const num = appState.basicDetails.aadharNo?.trim() || "";
    if (num.length !== 12) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/applications/check-aadhar?number=${encodeURIComponent(num)}`, {
          credentials: "include",
        });
        if (!res.ok) return; // endpoint missing or error — skip
        const json = await res.json();
        if (cancelled) return;
        if (json?.exists) {
          setErrors((prev) => ({ ...prev, aadharNo: "Aadhaar number is already used." }));
        } else {
          setErrors((prev) => {
            const next = { ...prev };
            delete next.aadharNo;
            return next;
          });
        }
      } catch {
        // network error — don't block user
      }
    })();
    return () => { cancelled = true; };
  }, [appState.basicDetails.aadharNo]);

  // ── Payment & Submit ─────────────────────────────────────────────────────────

  const handlePay = useCallback(async () => {
    if (!applicationId) return;
    setSaveError("");
    try {
      const res = await fetch(`${API_BASE}/api/application-fee/initiate-payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentAdmissionApplicationId: applicationId }),
      });
      const json = (await res.json()) as { paymentUrl?: string; error?: string };
      if (!res.ok || !json.paymentUrl) {
        setSaveError(json.error ?? "Failed to initiate payment. Please try again.");
        return;
      }
      window.location.href = json.paymentUrl;
    } catch {
      setSaveError("Network error. Please check your connection and try again.");
    }
  }, [applicationId]);

  const handleSubmit = useCallback(async () => {
    if (!applicationId) return;
    const consentText = appState.consentDeclaration.trim();
    if (!consentText) {
      setSaveError("You must agree to the declaration before submitting.");
      return;
    }

    setIsSubmitting(true);
    setSaveError("");

    try {
      const res = await fetch(
        `${API_BASE}/api/student-application/submit/${applicationId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consentDeclaration: consentText }),
          credentials: "include",
        }
      );  

  const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError((payload as { error?: string }).error ?? "Submission failed. Please try again.");
      } else {
        const successPayload = payload as { applicationNumber?: string | null };
        setApplicationNumber(successPayload.applicationNumber ?? applicationNumber);
        setAppState((s) => ({ ...s, applicationStatus: "APPLICATION_SUBMITTED" }));
        // Clear the local draft — application is fully submitted
        localStorage.removeItem(getDraftKey(applicationId));
      }
    } catch {
      setSaveError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [applicationId, appState.consentDeclaration, applicationNumber]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const { currentStep } = appState;
  const isEditable = isApplicationEditable(appState.applicationStatus);
  const applicantName = `${appState.basicDetails.firstName} ${appState.basicDetails.lastName}`.trim() || profile?.fullName || "Applicant";

  if (applicationId && hasFetchedApplication && !isEditable) {
    // Dedicated admitted/rejected views — these fetch extra data from the admissions API
    if (
      appState.applicationStatus === "ADMISSION_GRANTED" ||
      appState.applicationStatus === "ADMISSION_REJECTED"
    ) {
      return (
        <AdmissionDecisionView
          applicationStatus={appState.applicationStatus}
          applicationNumber={applicationNumber}
          institutionName={institutionName}
          applicantName={applicantName}
        />
      );
    }
    return (
      <ApplicationSubmittedCard
        applicationNumber={applicationNumber}
        applicationStatus={appState.applicationStatus}
        institutionName={institutionName}
        applicantName={applicantName}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-2">
      {/* Header — full width on all screens */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <ApplicationHeader
          applicationStatus={appState.applicationStatus}
          lastSavedAt={lastSavedAt}
          institutionName={institutionName}
          studyLevel={degreeLevel}
          programName={programName}
          admissionCycle={admissionCycleName}
        />
      </div>

      {/* Save success toast */}
      {saveSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Draft saved successfully.
        </div>
      )}

      {/* Save error banner */}
      {saveError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {saveError}
        </div>
      )}

      {/* Mobile: compact progress indicator */}
      
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:hidden">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  completedSteps.has(i)
                    ? "w-6 bg-emerald-500"
                    : currentStep === i
                    ? "w-6 bg-blue-600"
                    : "w-3 bg-slate-200"
                }`}
              />
            ))}
          </div>
          <p className="text-sm font-medium text-slate-700">
            Step {currentStep + 1} of {TOTAL_STEPS}:{" "}
            <span className="text-blue-600">
              {["Basic Details", "Education", "Entrance Exam", "Documents", "Preview", "Payment"][currentStep]}
            </span>
          </p>
        </div>
      

      {/* Desktop: left stepper sidebar + right form */}
      <div className="flex items-start gap-5">
        {/* Left sidebar — sticky vertical stepper */}
        
          <div className="hidden w-56 shrink-0 md:block">
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Progress
              </p>
              <ApplicationStepper
                currentStep={currentStep}
                completedSteps={completedSteps}
              />
            </div>
          </div>
        

        {/* Right content */}
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            {currentStep === 0 && (
              <BasicDetailsStep
                data={appState.basicDetails}
                errors={errors}
                aadharCardDocument={appState.documents.aadharCard}
                onChange={handleBasicChange}
                onAadharCardFileChange={handleAadharCardFileChange}
                dobMax={dobMax}
              />
            )}
            {currentStep === 1 && (
              <EducationDetailsStep
                data={appState.educationDetails}
                errors={errors}
                documents={appState.documents}
                degreeLevel={degreeLevel}
                dateOfBirth={appState.basicDetails.dateOfBirth}
                hasGap={appState.hasGap}
                onGapToggle={handleGapToggle}
                onChange={handleEducationChange}
                onDocumentChange={handleDocumentsChange}
              />
            )}
            {currentStep === 2 && (
              <EntranceDetailsStep
                data={appState.entranceExamDetails}
                errors={errors}
                onChange={handleEntranceChange}
              />
            )}
            {currentStep === 3 && (
              <UploadDocumentsStep
                data={appState.documents}
                errors={errors}
                degreeLevel={degreeLevel}
                onChange={handleDocumentsChange}
              />
            )}
            {currentStep === 4 && (
              <PreviewStep
                formState={appState}
                onGoToStep={handleGoToStep}
              />
            )}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Application Fee</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Complete payment to submit your application.
                  </p>
                </div>
                <PaymentSection
                  paymentStatus={appState.paymentStatus}
                  applicationStatus={appState.applicationStatus}
                  onPay={handlePay}
                  onSubmit={handleSubmit}
                  onBack={handleBack}
                  isSubmitting={isSubmitting}
                  consentDeclaration={appState.consentDeclaration}
                  onConsentChange={handleConsentChange}
                />
              </div>
            )}

            {/* Show error summary if there are validation errors */}
            {Object.keys(errors).length > 0 && (
              <div className="mt-6 space-y-3 rounded-lg border-2 border-red-500 bg-red-50 p-5 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <svg className="h-6 w-6 text-red-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-900">
                      ⚠️ Please check below mentioned fields before proceeding
                    </h3>
                    <p className="mt-1 text-xs text-red-800">Fill all required fields marked with <span className="font-bold text-red-600">*</span></p>
                    <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-red-900 font-medium">
                      {Object.values(errors).slice(0, 8).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                      {Object.keys(errors).length > 8 && (
                        <li className="text-red-700">... and {Object.keys(errors).length - 8} more field{Object.keys(errors).length - 8 !== 1 ? 's' : ''}</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation actions (hidden on preview step — it has its own) */}
            {currentStep < TOTAL_STEPS - 1 && (
              <div className="mt-6">
                <StepActions
                  currentStep={currentStep}
                  totalSteps={TOTAL_STEPS}
                  isSaving={isSaving}
                  hasErrors={Object.keys(errors).length > 0}
                  onBack={handleBack}
                  onSaveDraft={handleSaveDraft}
                  onNext={handleNext}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admission Decision View ────────────────────────────────────────────────────
// Shown when applicationStatus is ADMISSION_GRANTED or ADMISSION_REJECTED.
// Fetches extended details (studentId, batch, remarks) from the admissions API.

function AdmissionDecisionView({
  applicationStatus,
  applicationNumber,
  institutionName,
  applicantName,
}: {
  applicationStatus: string;
  applicationNumber: string | null;
  institutionName: string;
  applicantName: string;
}) {
  const [details, setDetails] = useState<MyAdmissionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError("");

    fetchMyAdmissionDetails()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFetchError(error);
        else if (data) setDetails(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError("Failed to load admission details.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const isGranted = applicationStatus === "ADMISSION_GRANTED";

  return (
    <div className="mx-auto max-w-3xl py-6 px-4">
      {/* Main card */}
      <div
        className={`rounded-3xl border p-6 shadow-sm md:p-8 ${
          isGranted
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
            : "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-slate-50"
        }`}
      >
        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center mb-6">
          <div
            className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              isGranted ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            }`}
          >
            {isGranted ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            )}
          </div>
          <h1 className={`text-2xl font-bold md:text-3xl ${isGranted ? "text-emerald-800" : "text-rose-800"}`}>
            {isGranted ? "🎉 Admission Granted!" : "Application Not Approved"}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-slate-600 leading-relaxed">
            {isGranted
              ? "Congratulations! Your admission has been granted. Welcome to the institution — your academic journey begins now."
              : "We regret to inform you that your application was not approved at this time. Please review the reason below."}
          </p>
        </div>

        {/* Error loading details */}
        {fetchError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {fetchError}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4 animate-pulse">
                <div className="h-3 w-24 rounded bg-slate-200 mb-2" />
                <div className="h-5 w-36 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {/* Granted: show admission details */}
        {!loading && isGranted && details && (
          <div className="grid gap-3 rounded-2xl border border-emerald-100 bg-white p-4 md:grid-cols-2">
            <InfoTile label="Applicant" value={applicantName} accent="emerald" />
            <InfoTile label="Application Number" value={applicationNumber ?? "—"} accent="emerald" />
            <InfoTile label="Institution" value={institutionName || "—"} accent="emerald" />
            <InfoTile label="Programme" value={details.program?.programName ?? "—"} accent="emerald" />
            <InfoTile label="Degree Level" value={details.degreeLevel?.levelName ?? "—"} accent="emerald" />
            <InfoTile label="Batch" value={details.batch?.batchName ?? "Pending Batch Assignment"} accent="emerald" />
            <InfoTile label="Admission Cycle" value={details.admissionCycle?.admissionCycleName ?? "—"} accent="emerald" />
            <InfoTile
              label="Student ID"
              value={details.studentId ?? "Being Generated"}
              accent="emerald"
              highlight
            />
          </div>
        )}

        {/* Rejected: show rejection reason */}
        {!loading && !isGranted && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 rounded-2xl border border-rose-100 bg-white p-4 md:grid-cols-2">
              <InfoTile label="Applicant" value={applicantName} accent="rose" />
              <InfoTile label="Application Number" value={applicationNumber ?? "—"} accent="rose" />
              <InfoTile label="Institution" value={institutionName || "—"} accent="rose" />
              {details?.program && (
                <InfoTile label="Programme Applied" value={details.program.programName} accent="rose" />
              )}
            </div>

            {details?.remarks && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-500 mb-2">
                  Rejection Reason
                </p>
                <p className="text-sm text-rose-900 leading-relaxed">{details.remarks}</p>
              </div>
            )}

            {!details?.remarks && !fetchError && !loading && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                No specific rejection reason was provided. Please contact the admissions office for more information.
              </div>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          {isGranted
            ? "You will receive further instructions from the institution regarding enrollment and orientation."
            : "You may contact the admissions office if you have questions regarding this decision."}
        </p>
      </div>
    </div>
  );
}

// Small reusable info tile for the decision view
function InfoTile({
  label,
  value,
  accent,
  highlight = false,
}: {
  label: string;
  value: string;
  accent: "emerald" | "rose";
  highlight?: boolean;
}) {
  const ringClass = highlight
    ? accent === "emerald"
      ? "ring-2 ring-emerald-300"
      : "ring-2 ring-rose-300"
    : "";
  return (
    <div className={`rounded-xl border border-slate-100 bg-slate-50 p-4 ${ringClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 text-sm font-semibold ${highlight ? (accent === "emerald" ? "text-emerald-700" : "text-rose-700") : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

export default function ApplicationPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading…</div>}>
      <ApplicationPage />
    </Suspense>
  );
}
