// ── Admission API client library ───────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdmitDialogData {
  applicationId: string;
  firstName: string;
  lastName: string;
  applicationStatus: string;
  institution: { id: string; institutionName: string };
  program: {
    id: string;
    programName: string;
    programCode: string;
    schoolId: string | null;
    school: { id: string; name: string } | null;
    departmentId: string | null;
    department: { id: string; name: string } | null;
  };
  degreeLevel: { id: string; levelName: string };
  batch: { id: string; batchName: string } | null;
  isFinalized: boolean;
}

export interface MyAdmissionDetails {
  applicationId: string;
  applicationStatus: string;
  remarks: string | null;
  firstName: string;
  lastName: string;
  program: { id: string; programName: string; programCode: string } | null;
  degreeLevel: { id: string; levelName: string } | null;
  admissionCycle: { id: string; admissionCycleName: string } | null;
  batch: { id: string; batchName: string } | null;
  studentId: string | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchAdmitDialogData(
  applicationId: string
): Promise<{ data?: AdmitDialogData; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admissions/admit-data/${applicationId}`, {
    credentials: "include",
  });
  const json = (await res.json()) as { data?: AdmitDialogData; error?: string };
  if (!res.ok) return { error: json.error ?? "Failed to fetch admit data." };
  return { data: json.data };
}

export async function admitApplicant(
  applicationId: string
): Promise<{ studentId?: string; applicationStatus?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admissions/admit/${applicationId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const json = (await res.json()) as {
    studentId?: string;
    applicationStatus?: string;
    error?: string;
  };
  if (!res.ok) return { error: json.error ?? "Failed to admit applicant." };
  return json;
}

export async function rejectApplicant(
  applicationId: string,
  remarks: string
): Promise<{ applicationStatus?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admissions/reject/${applicationId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remarks }),
  });
  const json = (await res.json()) as { applicationStatus?: string; error?: string };
  if (!res.ok) return { error: json.error ?? "Failed to reject application." };
  return json;
}

export async function fetchMyAdmissionDetails(applicationId: string): Promise<{
  data?: MyAdmissionDetails;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/admissions/my-admission-details/${applicationId}`, {
    credentials: "include",
  });
  const json = (await res.json()) as { data?: MyAdmissionDetails; error?: string };
  if (!res.ok) return { error: json.error ?? "Failed to fetch admission details." };
  return { data: json.data };
}
