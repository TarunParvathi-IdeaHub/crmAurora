"use client";

import { PencilLine } from "lucide-react";
import type { ApplicationFormState, DocumentFile } from "@/types/applicant";

// ── Internal helpers ──────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">
        {value || <span className="text-slate-400 font-normal">—</span>}
      </p>
    </div>
  );
}

function SectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          <PencilLine size={12} />
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function DocBadge({ doc, label }: { doc: DocumentFile; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {doc ? (
        <span className="text-xs text-emerald-600 font-medium">
          ✓ {doc.name} ({formatBytes(doc.size)})
        </span>
      ) : (
        <span className="text-xs text-rose-500">Not uploaded</span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ApplicationPreviewProps = {
  formState: ApplicationFormState;
  onEditStep: (step: number) => void;
};

export default function ApplicationPreview({
  formState,
  onEditStep,
}: ApplicationPreviewProps) {
  const { basicDetails: b, educationDetails: e, entranceExamDetails: x, documents: d } = formState;

  return (
    <div className="space-y-4">
      {/* Basic Details */}
      <SectionCard title="Basic Details" onEdit={() => onEditStep(0)}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <InfoRow label="First Name" value={b.firstName} />
          <InfoRow label="Last Name" value={b.lastName} />
          <InfoRow label="Date of Birth" value={b.dateOfBirth} />
          <InfoRow label="Gender" value={b.gender} />
          <InfoRow label="Mobile" value={b.mobileNo} />
          <InfoRow label="Email" value={b.email} />
          <InfoRow label="Aadhaar No." value={b.aadharNo} />
          <InfoRow label="Blood Group" value={b.bloodGroup} />
          <InfoRow label="Caste" value={b.caste} />
          <InfoRow label="Sub-Caste" value={b.subCaste} />
              <InfoRow
            label="Address"
            value={[b.presentAddress, b.city, b.state, b.pincode]
              .filter(Boolean)
              .join(", ")}
          />
          <InfoRow label="Father Name" value={b.fatherName} />
          <InfoRow label="Father Mobile" value={b.fatherMobileNo} />
          <InfoRow label="Father Email" value={b.fatherEmail} />
          <InfoRow label="Mother Name" value={b.motherName} />
          <InfoRow label="Mother Mobile" value={b.motherMobileNo} />
          <InfoRow label="Mother Email" value={b.motherEmail} />
        </div>
      </SectionCard>

      {/* Education Details */}
      <SectionCard title="Education Details" onEdit={() => onEditStep(1)}>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              SSC / 10th
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <InfoRow label="Board" value={e.sscBoard} />
              <InfoRow label="Institution" value={e.sscInstitutionName} />
              <InfoRow label="Year" value={e.sscYearOfPassing} />
              <InfoRow label="Percentage" value={e.sscPercentage ? `${e.sscPercentage}%` : ""} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Intermediate / 12th
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <InfoRow label="Board" value={e.intermediateBoard} />
              <InfoRow label="Institution" value={e.intermediateInstitutionName} />
              <InfoRow label="Year" value={e.intermediateYearOfPassing} />
              <InfoRow label="Percentage" value={e.intermediatePercentage ? `${e.intermediatePercentage}%` : ""} />
            </div>
          </div>
          {e.hasUGDegree && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                UG Degree
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                <InfoRow label="University" value={e.ugBoard} />
                <InfoRow label="Institution" value={e.ugInstitutionName} />
                <InfoRow label="Year" value={e.ugYearOfPassing} />
                <InfoRow label="Percentage" value={e.ugPercentage ? `${e.ugPercentage}%` : ""} />
              </div>
            </div>
          )}
          {e.hasPGDegree && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                PG Degree
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <InfoRow label="University" value={e.pgBoard} />
                <InfoRow label="Year" value={e.pgYearOfPassing} />
                <InfoRow label="Percentage" value={e.pgPercentage ? `${e.pgPercentage}%` : ""} />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Entrance Exam Details */}
      <SectionCard title="Entrance Exam Details" onEdit={() => onEditStep(2)}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <InfoRow label="Exam Name" value={x.quallingEntranceExam || "—"} />
          <InfoRow label="Hall Ticket No." value={x.entranceExamHallTicketNo || "—"} />
          <InfoRow label="Rank / Score" value={x.entranceExamRank || "—"} />
          <InfoRow
            label="Interested in AURUM Exam"
            value={x.intrestedInAurumExam ? "Yes" : "No"}
          />
        </div>
      </SectionCard>

      {/* Documents */}
      <SectionCard title="Documents" onEdit={() => onEditStep(3)}>
        {[
          { doc: d.aadharCard, label: "Aadhaar Card" },
          { doc: d.sscMemo, label: "SSC / 10th Memo" },
          { doc: d.intermediateMemo, label: "Intermediate Memo" },
          { doc: d.ugMemo, label: "UG Degree Certificate" },
          { doc: d.pgMemo, label: "PG Degree Certificate" },
          { doc: d.gapCertificate, label: "Gap Certificate" },
          { doc: d.bonafideCertificate, label: "Bonafide Certificate" },
          { doc: d.transferCertificate, label: "Transfer Certificate" },
        ]
          .filter((item) => item.doc)
          .map((item) => (
            <DocBadge key={item.label} doc={item.doc!} label={item.label} />
          ))
        }
        {[
          d.aadharCard,
          d.sscMemo,
          d.intermediateMemo,
          d.ugMemo,
          d.pgMemo,
          d.gapCertificate,
          d.bonafideCertificate,
          d.transferCertificate,
        ].every((doc) => !doc) && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            No documents have been uploaded yet.
          </div>
        )}
      </SectionCard>
    </div>
  );
}
