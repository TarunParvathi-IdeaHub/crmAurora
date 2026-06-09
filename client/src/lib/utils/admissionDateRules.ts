const INDIAN_TIMEZONE = "Asia/Kolkata";
const DEFAULT_PAST_YEAR_LIMIT = 1980;

const indianYearFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: INDIAN_TIMEZONE,
  year: "numeric",
});

export type SupportedStudyLevel = "UG" | "PG" | "PhD" | "UNKNOWN";

let syncedServerUtcMs: number | null = null;
let syncedPerfNowMs = 0;

function getSyncedNowDate(): Date {
  if (syncedServerUtcMs == null) {
    return new Date();
  }

  const elapsedMs = Math.max(0, performance.now() - syncedPerfNowMs);
  return new Date(syncedServerUtcMs + elapsedMs);
}

export function syncIndianClockWithServer(dateHeaderValue?: string | null): void {
  if (!dateHeaderValue) return;

  const parsed = Date.parse(dateHeaderValue);
  if (Number.isNaN(parsed)) return;

  syncedServerUtcMs = parsed;
  syncedPerfNowMs = performance.now();
}

export function normalizeStudyLevel(studyLevel: string): SupportedStudyLevel {
  const normalized = (studyLevel || "").toLowerCase();

  if (normalized.includes("doctor of philosophy") || normalized.includes("phd")) {
    return "PhD";
  }
  if (normalized.includes("post graduate") || normalized.includes("post graduation") || normalized.includes("pg")) {
    return "PG";
  }
  if (normalized.includes("under graduate") || normalized.includes("under graduation") || normalized.includes("ug")) {
    return "UG";
  }

  return "UNKNOWN";
}

export function getIndianCurrentYear(): number {
  const yearText = indianYearFormatter.format(getSyncedNowDate());
  const parsedYear = Number.parseInt(yearText, 10);

  if (!Number.isFinite(parsedYear)) {
    return new Date().getUTCFullYear();
  }

  return parsedYear;
}

export function calculateAge(dateOfBirth: string, currentYear: number = getIndianCurrentYear()): number | null {
  if (!dateOfBirth) return null;

  const birthYearText = dateOfBirth.split("-")[0];
  const birthYear = Number.parseInt(birthYearText, 10);

  if (!Number.isFinite(birthYear)) return null;

  return currentYear - birthYear;
}

export function getDobValidationMessage(studyLevel: string, dateOfBirth: string): string | null {
  const level = normalizeStudyLevel(studyLevel);
  const age = calculateAge(dateOfBirth);

  if (age == null) return null;

  if (level === "UG" && age < 17) {
    return "Minimum age for UG applications is 17 years";
  }
  if (level === "PG" && age < 20) {
    return "Minimum age for PG applications is 20 years";
  }
  if (level === "PhD" && age < 22) {
    return "Minimum age for PhD applications is 22 years";
  }

  return null;
}

function buildDescendingYears(startYear: number, minYear: number = DEFAULT_PAST_YEAR_LIMIT): string[] {
  if (!Number.isFinite(startYear) || startYear < minYear) return [];

  const years: string[] = [];
  for (let year = startYear; year >= minYear; year -= 1) {
    years.push(String(year));
  }
  return years;
}

function buildAscendingYears(startYear: number, endYear: number): string[] {
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || startYear > endYear) {
    return [];
  }

  const years: string[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(String(year));
  }
  return years;
}

function toYear(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getSSCYears(studyLevel: string, currentYear: number = getIndianCurrentYear()): string[] {
  const level = normalizeStudyLevel(studyLevel);

  if (level === "UG") return buildDescendingYears(currentYear - 2);
  if (level === "PG") return buildDescendingYears(currentYear - 5);
  if (level === "PhD") return buildDescendingYears(currentYear - 7);

  return buildDescendingYears(currentYear - 2);
}

export function getIntermediateYears(
  studyLevel: string,
  selectedSSCYear: string,
  currentYear: number = getIndianCurrentYear()
): string[] {
  const level = normalizeStudyLevel(studyLevel);
  const sscYear = toYear(selectedSSCYear);
  if (sscYear == null) return [];

  const start = sscYear + 2;

  if (level === "UG") return buildAscendingYears(start, currentYear);
  if (level === "PG") return buildAscendingYears(start, currentYear - 3);
  if (level === "PhD") return buildAscendingYears(start, currentYear - 5);

  return buildAscendingYears(start, currentYear);
}

export function getUGYears(
  studyLevel: string,
  selectedIntermediateYear: string,
  currentYear: number = getIndianCurrentYear()
): string[] {
  const level = normalizeStudyLevel(studyLevel);
  const intermediateYear = toYear(selectedIntermediateYear);
  if (intermediateYear == null) return [];

  if (level === "PG") return buildAscendingYears(intermediateYear + 4, currentYear);
  if (level === "PhD") return buildAscendingYears(intermediateYear + 3, currentYear - 2);

  return [];
}

export function getPGYears(
  studyLevel: string,
  selectedUGYear: string,
  currentYear: number = getIndianCurrentYear()
): string[] {
  const level = normalizeStudyLevel(studyLevel);
  const ugYear = toYear(selectedUGYear);
  if (ugYear == null) return [];

  if (level === "PhD") return buildAscendingYears(ugYear + 2, currentYear);

  return [];
}
