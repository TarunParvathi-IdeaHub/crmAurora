"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useProfile } from "@/providers/ProfileProvider";
import type {
  ApplicationFormState,
  BasicDetails,
  EducationDetails,
  EntranceExamDetails,
  UploadedDocuments,
} from "@/types/applicant";
import ApplicationHeader from "@/components/applicant/application/ApplicationHeader";
import ApplicationStepper from "@/components/applicant/application/ApplicationStepper";
import StepActions from "@/components/applicant/application/StepActions";
import BasicDetailsStep from "@/components/applicant/application/steps/BasicDetailsStep";
import EducationDetailsStep from "@/components/applicant/application/steps/EducationDetailsStep";
import EntranceDetailsStep from "@/components/applicant/application/steps/EntranceDetailsStep";
import UploadDocumentsStep from "@/components/applicant/application/steps/UploadDocumentsStep";
import PreviewStep from "@/components/applicant/application/steps/PreviewStep";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Draft key is scoped to the applicationId so that data from different
 * applicants on the same device never bleeds into each other's session.
 */
const getDraftKey = (appId: string) => `applicant-draft-${appId}`;
const APP_ID_KEY = "applicant-app-id";
const TOTAL_STEPS = 5;

// ── Default empty state ───────────────────────────────────────────────────────

const EMPTY_BASIC: BasicDetails = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "",
  mobileNo: "", email: "",
  aadharNo: "", bloodGroup: "", caste: "", subCaste: "",
  state: "", city: "", pincode: "", presentAddress: "", permanentAddress: "",
  fatherName: "", fatherMobileNo: "", fatherEmail: "",
  motherName: "", motherMobileNo: "", motherEmail: "",
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
  aadharCard: null, sscMemo: null, intermediateMemo: null,
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
  applicationStatus: "DRAFT",
  hasGap: false,
  consentDeclaration: "",
};

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
    return true;
  }
  if (step === 1) {
    const e = state.educationDetails;
    const base = !!(
      e.sscBoard && e.sscInstitutionName && e.sscHallTicketNo && e.sscYearOfPassing && e.sscPercentage &&
      e.intermediateBoard && e.intermediateInstitutionName && e.intermediateHallTicketNo &&
      e.intermediateYearOfPassing && e.intermediatePercentage
    );
    if (!base) return false;
    if (!e.ugBoard || !e.ugInstitutionName || !e.ugHallTicketNo || !e.ugYearOfPassing || !e.ugPercentage) return false;
    const showPG = dl === "Doctor of Philosophy (Phd)" || e.hasPGDegree;
    if (showPG) {
      if (!e.pgBoard || !e.pgInstitutionName || !e.pgHallTicketNo || !e.pgYearOfPassing || !e.pgPercentage) return false;
    }
    return true;
  }
  if (step === 2) {
    // Entrance Exam is optional but only shows as complete when data exists
    const x = state.entranceExamDetails;
    const hasData = !!(
      x.quallingEntranceExam?.trim() ||
      x.entranceExamHallTicketNo?.trim() ||
      x.entranceExamRank?.trim()
    );
    if (!hasData) return false;
    if (x.quallingEntranceExam?.trim() && !ENTRANCE_EXAM_RE.test(x.quallingEntranceExam.trim())) return false;
    if (x.entranceExamHallTicketNo?.trim() && !ENTRANCE_NUM_RE.test(x.entranceExamHallTicketNo.trim())) return false;
    if (x.entranceExamRank?.trim() && !ENTRANCE_NUM_RE.test(x.entranceExamRank.trim())) return false;
    return true;
  }
  if (step === 3) {
    // Documents: complete when all required documents are uploaded
    const d = state.documents;
    return !!(
      d.aadharCard && d.sscMemo && d.intermediateMemo &&
      d.ugMemo && d.pgMemo && d.bonafideCertificate && d.transferCertificate
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
    if (!b.firstName.trim()) errors.firstName = "First name is required.";
    if (!b.lastName.trim()) errors.lastName = "Last name is required.";
    if (!b.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
    if (!b.gender) errors.gender = "Please select a gender.";
    if (!MOBILE_RE.test(b.mobileNo.trim())) {
      errors.mobileNo = "Enter a valid 10-digit mobile number.";
    }
    if (!b.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      errors.email = "Enter a valid email address.";
    if (b.firstName.trim() && !NAME_RE.test(b.firstName.trim())) {
      errors.firstName = "First name should contain only letters and spaces.";
    }
    if (b.lastName.trim() && !NAME_RE.test(b.lastName.trim())) {
      errors.lastName = "Last name should contain only letters and spaces.";
    }
    if (b.aadharNo.trim() && !AADHAR_RE.test(b.aadharNo.trim())) {
      errors.aadharNo = "Aadhaar number must be 12 digits.";
    }
    if (b.caste.trim() && !CASTE_RE.test(b.caste.trim())) {
      errors.caste = "Caste should contain only letters and hyphen.";
    }
    if (b.subCaste.trim() && !CASTE_RE.test(b.subCaste.trim())) {
      errors.subCaste = "Sub-caste should contain only letters and hyphen.";
    }
    if (b.city.trim() && !CITY_RE.test(b.city.trim())) {
      errors.city = "City should contain only letters and spaces.";
    }
    if (b.pincode.trim() && !PINCODE_RE.test(b.pincode.trim())) {
      errors.pincode = "Pincode must be 6 digits.";
    }
    if (b.fatherName.trim() && !NAME_RE.test(b.fatherName.trim())) {
      errors.fatherName = "Father name should contain only letters and spaces.";
    }
    if (b.motherName.trim() && !NAME_RE.test(b.motherName.trim())) {
      errors.motherName = "Mother name should contain only letters and spaces.";
    }
    if (b.fatherMobileNo.trim() && !MOBILE_RE.test(b.fatherMobileNo.trim())) {
      errors.fatherMobileNo = "Enter a valid 10-digit mobile number.";
    }
    if (b.motherMobileNo.trim() && !MOBILE_RE.test(b.motherMobileNo.trim())) {
      errors.motherMobileNo = "Enter a valid 10-digit mobile number.";
    }
  }

  if (step === 1) {
    const e = state.educationDetails;
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
    if (!e.intermediatePercentage) errors.intermediatePercentage = "Percentage is required.";
    if (e.intermediatePercentage.trim() && !PERCENT_RE.test(e.intermediatePercentage.trim())) {
      errors.intermediatePercentage = "Percentage / CGPA should contain only numbers and dot.";
    }
    // UG required for all applicants
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
    if (!e.ugPercentage) errors.ugPercentage = "Percentage is required.";
    if (e.ugPercentage?.trim() && !PERCENT_RE.test(e.ugPercentage.trim())) {
      errors.ugPercentage = "Percentage / CGPA should contain only numbers and dot.";
    }
    // PG required when PG section is shown
    const showPG = dl === "Doctor of Philosophy (Phd)" || e.hasPGDegree;
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
      if (!e.pgPercentage) errors.pgPercentage = "Percentage is required.";
      if (e.pgPercentage?.trim() && !PERCENT_RE.test(e.pgPercentage.trim())) {
        errors.pgPercentage = "Percentage / CGPA should contain only numbers and dot.";
      }
    }
  }

  if (step === 2) {
    const x = state.entranceExamDetails;
    if (x.quallingEntranceExam.trim() && !ENTRANCE_EXAM_RE.test(x.quallingEntranceExam.trim())) {
      errors.quallingEntranceExam = "Entrance exam name should contain only letters and spaces.";
    }
    if (x.entranceExamHallTicketNo.trim() && !ENTRANCE_NUM_RE.test(x.entranceExamHallTicketNo.trim())) {
      errors.entranceExamHallTicketNo = "Hall ticket number should contain only numbers and dot.";
    }
    if (x.entranceExamRank.trim() && !ENTRANCE_NUM_RE.test(x.entranceExamRank.trim())) {
      errors.entranceExamRank = "Rank / score should contain only numbers and dot.";
    }
  }

  if (step === 3) {
    const d = state.documents;
    if (!d.aadharCard) errors.aadharCard = "Aadhaar card is required.";
    if (!d.sscMemo) errors.sscMemo = "SSC / 10th memo is required.";
    if (!d.intermediateMemo) errors.intermediateMemo = "Intermediate / 12th memo is required.";
    if (!d.ugMemo) errors.ugMemo = "UG degree certificate is required.";
    if (!d.pgMemo) errors.pgMemo = "PG degree certificate is required.";
    if (!d.bonafideCertificate) errors.bonafideCertificate = "Bonafide certificate is required.";
    if (!d.transferCertificate) errors.transferCertificate = "Transfer certificate is required.";
  }

  // Steps 2 (Entrance) and 3 (Documents): no required fields
  return errors;
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
  ];
  for (const key of basicFields) appendStr(key, b[key] as string);

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
    "aadharCard", "sscMemo", "intermediateMemo", "ugMemo",
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
    ];
    for (const key of fields) appendStr(key, b[key] as string);
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
      "aadharCard", "sscMemo", "intermediateMemo", "ugMemo",
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const hasMounted = useRef(false);
  // Set to true once the server responds successfully. Guards persistDraft so
  // that a click before data loads never writes an empty draft to localStorage
  // (an empty draft with hasDraft=true would block full server hydration on the
  // next page load, making all fields appear blank).
  const hasServerData = useRef(false);

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
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ data }) => {
        const level: string = data?.degreeLevel?.levelName ?? "";
        setDegreeLevel(level);
        setInstitutionName(data?.institution?.institutionName ?? "");
        setProgramName(data?.program?.programName ?? "");
        setAdmissionCycleName(data?.admissionCycle?.admissionCycleName ?? "");

        // Degree level is the source of truth for showing UG/PG sections.
        // Must be true regardless of whether the student has filled the fields yet.
        const ugRequired = level === "Post Graduation (PG)" || level === "Doctor of Philosophy (Phd)";
        const pgRequired = level === "Doctor of Philosophy (Phd)";

        // Build document map from server signed URLs.
        // These are ALWAYS applied because persistDraft strips previewUrl to null
        // (signed URLs expire; File objects aren't serialisable), so the only way
        // to restore "already uploaded" indicators after a refresh is from the server.
        const mkDoc = (url: string | null | undefined, name: string) =>
          url ? { name, size: 0, previewUrl: url, file: null } : null;

        const serverDocs: UploadedDocuments = {
          aadharCard:          mkDoc(data.documents?.aadharCard,          "aadharCard.pdf"),
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
              fatherName:       toStr(data.fatherName),
              fatherMobileNo:   toStr(data.fatherMobileNo),
              fatherEmail:      toStr(data.fatherEmail),
              motherName:       toStr(data.motherName),
              motherMobileNo:   toStr(data.motherMobileNo),
              motherEmail:      toStr(data.motherEmail),
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
              sscMemo:             s.documents.sscMemo?.file             ? s.documents.sscMemo             : serverDocs.sscMemo,
              intermediateMemo:    s.documents.intermediateMemo?.file    ? s.documents.intermediateMemo    : serverDocs.intermediateMemo,
              ugMemo:              s.documents.ugMemo?.file              ? s.documents.ugMemo              : serverDocs.ugMemo,
              pgMemo:              s.documents.pgMemo?.file              ? s.documents.pgMemo              : serverDocs.pgMemo,
              gapCertificate:      s.documents.gapCertificate?.file      ? s.documents.gapCertificate      : serverDocs.gapCertificate,
              bonafideCertificate: s.documents.bonafideCertificate?.file ? s.documents.bonafideCertificate : serverDocs.bonafideCertificate,
              transferCertificate: s.documents.transferCertificate?.file ? s.documents.transferCertificate : serverDocs.transferCertificate,
            },
          }));
        }
      })
      .catch(() => {
        // Non-critical — proceed with whatever state we already have
      });
  }, [applicationId]);

  // Run once when applicationId becomes available (on mount / navigation).
  useEffect(() => {
    if (applicationId) refreshFromServer();
  }, [applicationId, refreshFromServer]);

  const completedSteps = useMemo(() => {
    const s = new Set<number>();
    for (let i = 0; i < TOTAL_STEPS - 1; i++) {
      if (isStepComplete(i, appState, degreeLevel)) s.add(i);
    }
    return s;
  }, [appState, degreeLevel]);

  // ── Draft persistence ────────────────────────────────────────────────────────

  const persistDraft = useCallback((state: ApplicationFormState) => {
    if (!applicationId) return;
    try {
      // Strip blob URLs / File objects before storing (not serialisable)
      const docs: UploadedDocuments = {} as UploadedDocuments;
      for (const k of Object.keys(state.documents) as (keyof UploadedDocuments)[]) {
        const doc = state.documents[k];
        docs[k] = doc ? { name: doc.name, size: doc.size, previewUrl: null, file: null } : null;
      }
      localStorage.setItem(getDraftKey(applicationId), JSON.stringify({ ...state, documents: docs }));
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
    if (!applicationId) return false;
    // Only persist to localStorage once the server has responded at least once.
    // This prevents a click before data loads from writing an empty INITIAL_STATE
    // draft — which would then block full server hydration on the next page load.
    if (hasServerData.current) persistDraft(state);

    // Documents step: skip the API entirely when no new files were selected
    // to avoid a pointless multipart request.
    if (step === 3) {
      const docKeys: (keyof UploadedDocuments)[] = [
        "aadharCard", "sscMemo", "intermediateMemo", "ugMemo",
        "pgMemo", "bonafideCertificate", "transferCertificate",
      ];
      const hasNewFiles = docKeys.some((k) => state.documents[k]?.file != null);
      if (!hasNewFiles) {
        setLastSavedAt(new Date());
        setSaveSuccess(true);
        setSaveError("");
        return true;
      }
    }

    const fd = buildSectionFormData(step, state);
    try {
      const res = await fetch(
        `${API_BASE}/api/student-application/save-draft/${applicationId}`,
        { method: "PUT", body: fd, credentials: "include" }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setSaveError(
          (payload as { error?: string }).error ?? "Failed to save. Please try again."
        );
        return false;
      }
      // Parse success body: update document slots with the fresh signed URLs
      // returned by the server for each newly uploaded file. This clears the
      // local File reference so the same file is not re-uploaded on the next save.
      const payload = await res.json().catch(() => ({}));
      const newDocUrls =
        (payload as { uploadedDocuments?: Record<string, string> }).uploadedDocuments ?? {};
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
    if (isSaving) return;
    const stepErrors = validateStep(appState.currentStep, appState, degreeLevel);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
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
    const updated = { ...appState, currentStep: nextStep };
    setAppState(updated);
    persistDraft(updated);
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
        applicationStatus: s.applicationStatus === "SUBMITTED" ? s.applicationStatus : "DRAFT",
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
    },
    []
  );

  const handleGapToggle = useCallback((val: boolean) => {
    setAppState((s) => ({ ...s, hasGap: val }));
  }, []);

  const handleConsentChange = useCallback((value: string) => {
    setAppState((s) => ({ ...s, consentDeclaration: value }));
  }, []);

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

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setSaveError((payload as { error?: string }).error ?? "Submission failed. Please try again.");
      } else {
        setAppState((s) => ({ ...s, applicationStatus: "SUBMITTED" }));
        // Clear the local draft — application is fully submitted
        localStorage.removeItem(getDraftKey(applicationId));
      }
    } catch {
      setSaveError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [applicationId, appState.consentDeclaration]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const { currentStep } = appState;

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
          {[0, 1, 2, 3, 4].map((i) => (
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
            {["Basic Details", "Education", "Entrance Exam", "Documents", "Preview"][currentStep]}
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
                onChange={handleBasicChange}
              />
            )}
            {currentStep === 1 && (
              <EducationDetailsStep
                data={appState.educationDetails}
                errors={errors}
                degreeLevel={degreeLevel}
                onChange={handleEducationChange}
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
                hasGap={appState.hasGap}
                onGapToggle={handleGapToggle}
                onChange={handleDocumentsChange}
              />
            )}
            {currentStep === 4 && (
              <PreviewStep
                formState={appState}
                onGoToStep={handleGoToStep}
                onBack={handleBack}
                onPay={handlePay}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                consentDeclaration={appState.consentDeclaration}
                onConsentChange={handleConsentChange}
              />
            )}

            {/* Navigation actions (hidden on preview step — it has its own) */}
            {currentStep < TOTAL_STEPS - 1 && (
              <div className="mt-6">
                <StepActions
                  currentStep={currentStep}
                  totalSteps={TOTAL_STEPS}
                  isSaving={isSaving}
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

export default function ApplicationPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-slate-500">Loading…</div>}>
      <ApplicationPage />
    </Suspense>
  );
}
