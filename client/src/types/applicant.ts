// ── Application lifecycle ─────────────────────────────────────────────────────

export type ApplicationStatus =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "PAYMENT_COMPLETED"
  | "SUBMITTED";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

// ── Form data slices ──────────────────────────────────────────────────────────

export type BasicDetails = {
  // Personal
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  mobileNo: string;
  email: string;
  // Identity
  aadharNo: string;
  bloodGroup: string;
  caste: string;
  subCaste: string;
  // Address
  state: string;
  city: string;
  pincode: string;
  presentAddress: string;
  permanentAddress: string;
  isLocal: boolean;
  // Parents / Guardian
  fatherName: string;
  fatherMobileNo: string;
  fatherEmail: string;
  motherName: string;
  motherMobileNo: string;
  motherEmail: string;
  guardianName: string;
  guardianMobileNo: string;
  guardianEmail: string;
};

export type EducationDetails = {
  // SSC / 10th
  sscBoard: string;
  sscInstitutionName: string;
  sscHallTicketNo: string;
  sscYearOfPassing: string;
  sscPercentage: string;
  // Intermediate / 12th
  intermediateBoard: string;
  intermediateInstitutionName: string;
  intermediateHallTicketNo: string;
  intermediateYearOfPassing: string;
  intermediatePercentage: string;
  // UG 
  hasUGDegree: boolean;
  ugBoard: string;
  ugInstitutionName: string;
  ugHallTicketNo: string;
  ugYearOfPassing: string;
  ugPercentage: string;
  // PG 
  hasPGDegree: boolean;
  pgBoard: string;
  pgInstitutionName: string;
  pgHallTicketNo: string;
  pgYearOfPassing: string;
  pgPercentage: string;
};

export type EntranceExamDetails = {
  quallingEntranceExam: string;
  entranceExamHallTicketNo: string;
  entranceExamRank: string;
  intrestedInAurumExam: boolean;
};

/**
 * DocumentFile stores file metadata + the actual File object (runtime only).
 * `file` and `previewUrl` are NOT persisted to localStorage — they become null
 * on draft reload, prompting the user to re-select files.
 */
export type DocumentFile = {
  name: string;
  size: number;
  previewUrl: string | null;
  file: File | null;
} | null;

export type UploadedDocuments = {
  aadharCard: DocumentFile;
  passportPhoto: DocumentFile;
  studentSignature: DocumentFile;
  sscMemo: DocumentFile;
  intermediateMemo: DocumentFile;
  ugMemo: DocumentFile;
  pgMemo: DocumentFile;
  gapCertificate: DocumentFile;
  bonafideCertificate: DocumentFile;
  transferCertificate: DocumentFile;
};

// ── Top-level application form state ─────────────────────────────────────────

export type ApplicationFormState = {
  applicationId: string | null;
  currentStep: number;
  basicDetails: BasicDetails;
  educationDetails: EducationDetails;
  entranceExamDetails: EntranceExamDetails;
  documents: UploadedDocuments;
  paymentStatus: PaymentStatus;
  applicationStatus: ApplicationStatus;
  /** True when applicant had an academic gap year — shows gap certificate upload */
  hasGap: boolean;
  /** Consent declaration text set by the applicant before submitting */
  consentDeclaration: string;
};
