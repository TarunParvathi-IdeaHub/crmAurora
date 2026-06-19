import { authFetch } from "@/lib/utils/authFetch";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

export type FeeConcessionApplication = {
  id: string;
  applicationNumber: string | null;
  institutionId: string;
  institutionName: string;
  institutionCode: string | null;
  firstName: string;
  lastName: string;
  applicationStatus: string;
  programId: string;
  programName: string;
  programCode: string | null;
  studyLevel: string;
};

export type ActiveBatchOption = {
  id: string;
  batchName: string;
};

export type ProgramTuitionFee = {
  id: string;
  institutionId: string;
  programId: string;
  batchId: string;
  amount: number;
  isActive: boolean;
  batch: { id: string; batchName: string } | null;
  program: { id: string; programName: string; programCode: string | null } | null;
};

export type FeeConcessionRecord = {
  id: string;
  institutionId: string;
  studentAdmissionApplicationId: string;
  batchId: string | null;
  batchName: string | null;
  programId: string;
  programName: string | null;
  programCode: string | null;
  programTuitionFeeId: string;
  actualTuitionAmount: number;
  consessionAmount: number;
  fixedTuitionAmount: number;
  consessionReason: string | null;
  createdById: string | null;
  createdByRole: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeeConcessionContext = {
  application: FeeConcessionApplication;
  activeBatches: ActiveBatchOption[];
  programTuitionFee: ProgramTuitionFee | null;
  existingConcession: FeeConcessionRecord | null;
  previousConcession: FeeConcessionRecord | null;
};

export type FeeConcessionSavePayload = {
  applicationId: string;
  batchId: string;
  consessionAmount: number;
  consessionReason: string;
};

function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchFeeConcessionContext(applicationId: string): Promise<FeeConcessionContext> {
  const response = await authFetch(`${API_BASE_URL}/api/admissions/fee-concession/${applicationId}`);
  const payload = await parseJson<{ data?: FeeConcessionContext; error?: string }>(response);

  if (!response.ok || !payload.data) {
    throw new Error(payload.error || "Unable to load fee concession details.");
  }

  return payload.data;
}

export async function createFeeConcession(payload: FeeConcessionSavePayload): Promise<string> {
  const response = await authFetch(`${API_BASE_URL}/api/admissions/fee-concession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({})) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Unable to update fee concession.");
  }

  return data.message || "Fee Concession Updated Successfully";
}

export async function updateFeeConcession(payload: FeeConcessionSavePayload): Promise<string> {
  const response = await authFetch(`${API_BASE_URL}/api/admissions/fee-concession/${payload.applicationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({})) as { message?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Unable to update fee concession.");
  }

  return data.message || "Fee Concession Updated Successfully";
}

export async function saveFeeConcession(payload: FeeConcessionSavePayload, hasExisting: boolean): Promise<string> {
  return hasExisting ? updateFeeConcession(payload) : createFeeConcession(payload);
}

export async function fetchActiveBatches(institutionId: string): Promise<ActiveBatchOption[]> {
  const response = await authFetch(`${API_BASE_URL}/api/batches/active/by-institution/${institutionId}`);
  const data = await response.json().catch(() => null) as { batches?: ActiveBatchOption[] } | null;

  if (!response.ok) {
    throw new Error("Unable to load batches.");
  }

  return data?.batches ?? [];
}

export async function fetchProgramTuitionFee(
  institutionId: string,
  programId: string,
  batchId: string,
): Promise<ProgramTuitionFee | null> {
  if (!institutionId || !programId || !batchId) return null;

  const response = await authFetch(`${API_BASE_URL}/api/program-tuition-fees/${encodeURIComponent(institutionId)}`);
  const data = await response.json().catch(() => null) as { programTuitionFees?: ProgramTuitionFee[] } | null;

  if (!response.ok) {
    throw new Error("Unable to load program tuition fee.");
  }

  const matched = (data?.programTuitionFees ?? []).find(
    (item) => item.programId === programId && item.batchId === batchId,
  );

  return matched ?? null;
}

export async function fetchProgramTuitionFeesByInstitution(institutionId: string): Promise<ProgramTuitionFee[]> {
  if (!institutionId) return [];

  const response = await authFetch(`${API_BASE_URL}/api/program-tuition-fees/${encodeURIComponent(institutionId)}`);
  const data = await response.json().catch(() => null) as { programTuitionFees?: ProgramTuitionFee[] } | null;

  if (!response.ok) {
    throw new Error("Unable to load program tuition fee.");
  }

  return data?.programTuitionFees ?? [];
}
