export type AcademicYearBatchOption = {
  id: string;
  batchName: string;
  createdAt: string;
};

export type AcademicYearLinkedBatch = {
  id: string;
  batchName: string;
  createdAt: string;
  isActive: boolean;
};

export type AcademicYearRecord = {
  id: string;
  academicYearName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  linkedBatches: AcademicYearLinkedBatch[];
  linkedBatchesCount: number;
};

export type AcademicYearInstitution = {
  institutionId: string;
  institutionName: string;
};

export type AcademicYearListResponse = {
  institution: AcademicYearInstitution;
  academicYears: AcademicYearRecord[];
};

export type AcademicYearPayload = {
  academicYearName: string;
  startDate: string;
  endDate: string;
  batchIds: string[];
};
