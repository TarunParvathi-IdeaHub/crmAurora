"use client";

import { useCallback, useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import type { DocumentFile, UploadedDocuments } from "@/types/applicant";

// ── Config ────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB (matches server middleware)

type DocKey = keyof UploadedDocuments;

type DocConfig = {
  key: DocKey;
  label: string;
  required: boolean;
  hint: string;
};

// ── Helper ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Single upload widget ──────────────────────────────────────────────────────

type UploadWidgetProps = {
  config: DocConfig;
  value: DocumentFile;
  error?: string;
  onChange: (key: DocKey, doc: DocumentFile) => void;
};

function UploadWidget({ config, value, error, onChange }: UploadWidgetProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        alert(`${config.label}: only PDF files are accepted.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`${config.label}: file size must be under 5 MB.`);
        return;
      }
      onChange(config.key, {
        name: file.name,
        size: file.size,
        previewUrl: null,
        file,
      });
    },
    [config, onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = () => {
    onChange(config.key, null);
  };

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label className="text-sm font-medium text-slate-700">{config.label}</label>
        {config.required && (
          <span className="text-xs font-semibold text-rose-500">*</span>
        )}
      </div>

      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
            <FileText size={20} className="text-slate-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-800">{value.name}</p>
            {value.size > 0 ? (
              <p className="text-xs text-slate-500">{formatBytes(value.size)}</p>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                Uploaded
              </span>
            )}
            <div className="mt-1 flex items-center gap-3">
              {value.previewUrl && (
                <a
                  href={value.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View PDF
                </a>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
              >
                Replace
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remove file"
            className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 transition hover:bg-slate-50 ${
            error ? "border-rose-400 bg-rose-50" : "border-slate-300"
          }`}
        >
          <Upload size={22} className="text-slate-400" />
          <p className="text-xs text-slate-500">
            <span className="font-medium text-blue-600">Click to upload</span> or drag & drop
          </p>
          <p className="text-[10px] text-slate-400">PDF only</p>
        </div>
      )}

      <p className="mt-1 text-[10px] text-slate-400">{config.hint}</p>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        className="sr-only"
        aria-label={`Upload ${config.label}`}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type UploadDocumentsStepProps = {
  data: UploadedDocuments;
  errors: Record<string, string>;
  onChange: (updates: Partial<UploadedDocuments>) => void;
  /** levelName from backend, e.g. "Under Graduate (UG)" */
  degreeLevel?: string;
  hasGap?: boolean;
  onGapToggle?: (val: boolean) => void;
};

export default function UploadDocumentsStep({
  data,
  errors,
  onChange,
  degreeLevel = "",
  hasGap = false,
  onGapToggle,
}: UploadDocumentsStepProps) {
  const handleWidgetChange = useCallback(
    (key: DocKey, doc: DocumentFile) => {
      onChange({ [key]: doc });
    },
    [onChange]
  );

  const isPG  = degreeLevel === "Post Graduation (PG)";
  const isPhd = degreeLevel === "Doctor of Philosophy (Phd)";

  // Build visible doc list — UG and PG memos are always required
  const visibleDocs: DocConfig[] = [
    { key: "aadharCard",          label: "Aadhaar Card",             required: true,  hint: "PDF only, max 5 MB. Upload front & back scanned together." },
    { key: "sscMemo",             label: "SSC / 10th Memo",           required: true,  hint: "PDF only, max 5 MB. Official mark sheet / memo." },
    { key: "intermediateMemo",    label: "Intermediate / 12th Memo",  required: true,  hint: "PDF only, max 5 MB. Official mark sheet / memo." },
    { key: "ugMemo",              label: "UG Degree Certificate",     required: true,  hint: "PDF only, max 5 MB. Mandatory for all applicants." },
    { key: "pgMemo",              label: "PG Degree Certificate",     required: true,  hint: "PDF only, max 5 MB. Mandatory for all applicants." },
    // Gap Certificate — always shown
    { key: "gapCertificate",      label: "Gap Certificate",           required: false, hint: "PDF only, max 5 MB. Upload if you had an academic gap year." },
    { key: "bonafideCertificate", label: "Bonafide Certificate",      required: true,  hint: "PDF only, max 5 MB. Mandatory for all applicants." },
    { key: "transferCertificate", label: "Transfer Certificate",      required: true,  hint: "PDF only, max 5 MB. Mandatory for all applicants." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Upload Documents</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Upload clear, legible PDF scans of the required documents. Maximum file size: 5 MB per file.
          {degreeLevel && (
            <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {degreeLevel}
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {visibleDocs.map((cfg) => (
          <UploadWidget
            key={cfg.key}
            config={cfg}
            value={data[cfg.key]}
            error={errors[cfg.key]}
            onChange={handleWidgetChange}
          />
        ))}
      </div>
    </div>
  );
}

