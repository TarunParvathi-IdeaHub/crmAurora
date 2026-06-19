"use client";

import type { UndertakingTemplateContent } from "./types";

/** Replace {{key}} placeholders with dynamic data values */
export function replaceVariables(content: string, data: Record<string, string>): string {
  return content.replace(/\{\{(.*?)\}\}/g, (_, key: string) => data[key.trim()] ?? `{{${key.trim()}}}`);
}



/** Default empty template content */
export const DEFAULT_CONTENT: UndertakingTemplateContent = {
  header: {
    title: "STUDENT ADMISSION UNDERTAKING",
    fields: [
      { label: "Name of the Student", key: "nameOfTheStudent", type: "text" },
      { label: "Application No", key: "applicationId", type: "text" },
      { label: "Course Enrolled", key: "programEnrolling", type: "text" },
      { label: "Admission No", key: "admissionNo", type: "text" },
    ],
  },
  sections: [],
  footer: {
    signatures: [
      { label: "Signature of Parent with Date" },
      { label: "Signature of Student with Date" },
    ],
  },
};

/** Generate a short unique ID for new items */
export function genId(): string {
  return Math.random().toString(36).slice(2, 8);
}
