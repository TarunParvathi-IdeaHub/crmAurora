import { authFetch } from "@/lib/utils/authFetch";
import type {
  AcademicYearBatchOption,
  AcademicYearListResponse,
  AcademicYearPayload,
  AcademicYearRecord,
} from "@/types/admissions/academicYear";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchAcademicYears(): Promise<AcademicYearListResponse> {
  const response = await authFetch(`${API_BASE_URL}/api/academic-years`);
  const payload = await parseJson<ApiEnvelope<AcademicYearListResponse>>(response);

  if (!response.ok || !payload.data) {
    throw new Error(payload.error || "Unable to load academic years.");
  }

  return payload.data;
}

export async function fetchAcademicYearById(id: string): Promise<AcademicYearRecord> {
  const response = await authFetch(`${API_BASE_URL}/api/academic-years/${id}`);
  const payload = await parseJson<ApiEnvelope<{ academicYear: AcademicYearRecord }>>(response);

  if (!response.ok || !payload.data?.academicYear) {
    throw new Error(payload.error || "Unable to load academic year details.");
  }

  return payload.data.academicYear;
}

export async function fetchAcademicYearBatches(): Promise<AcademicYearBatchOption[]> {
  const response = await authFetch(`${API_BASE_URL}/api/academic-years/active-batches`);
  const payload = await parseJson<ApiEnvelope<{ batches: AcademicYearBatchOption[] }>>(response);

  if (!response.ok || !payload.data) {
    throw new Error(payload.error || "Unable to load active batches.");
  }

  return payload.data.batches;
}

export async function createAcademicYear(payload: AcademicYearPayload): Promise<string> {
  const response = await authFetch(`${API_BASE_URL}/api/academic-years`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJson<ApiEnvelope<{ academicYear: AcademicYearRecord }>>(response);

  if (!response.ok) {
    throw new Error(data.error || "Unable to create academic year.");
  }

  return data.message || "Academic Year created successfully";
}

export async function updateAcademicYear(id: string, payload: AcademicYearPayload): Promise<string> {
  const response = await authFetch(`${API_BASE_URL}/api/academic-years/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJson<ApiEnvelope<{ academicYear: AcademicYearRecord }>>(response);

  if (!response.ok) {
    throw new Error(data.error || "Unable to update academic year.");
  }

  return data.message || "Academic Year updated successfully";
}

export async function deactivateAcademicYear(id: string): Promise<string> {
  const response = await authFetch(`${API_BASE_URL}/api/academic-years/${id}`, {
    method: "DELETE",
  });

  const data = await parseJson<ApiEnvelope<never>>(response);

  if (!response.ok) {
    throw new Error(data.error || "Unable to deactivate academic year.");
  }

  return data.message || "Academic Year deactivated successfully";
}
