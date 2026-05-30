"use client";

import type { EducationDetails } from "@/types/applicant";

const BOARDS = ["AP State Board", "TS State Board", "CBSE", "ICSE", "IB", "IGCSE", "Other"];
const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));

const ONLY_ALPHA_SPACE = /[^A-Za-z\s]/g;
const ONLY_DIGITS_DOT = /[^\d.]/g;

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const errorInputCls =
  "mt-1 w-full rounded-xl border border-rose-400 bg-white px-3 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

type EducationDetailsStepProps = {
  data: EducationDetails;
  errors: Record<string, string>;
  onChange: (updates: Partial<EducationDetails>) => void;
  /** levelName from the backend, e.g. "Under Graduate (UG)" */
  degreeLevel?: string;
};

export default function EducationDetailsStep({
  data,
  errors,
  onChange,
  degreeLevel = "",
}: EducationDetailsStepProps) {
  const handle = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let nextValue = value;

    switch (name) {
      case "sscInstitutionName":
      case "intermediateInstitutionName":
      case "ugInstitutionName":
      case "pgInstitutionName":
        nextValue = value.replace(ONLY_ALPHA_SPACE, "");
        break;
      case "sscHallTicketNo":
      case "intermediateHallTicketNo":
      case "ugHallTicketNo":
      case "pgHallTicketNo":
        nextValue = value.replace(ONLY_DIGITS_DOT, "");
        break;
      case "sscPercentage":
      case "intermediatePercentage":
      case "ugPercentage":
      case "pgPercentage":
        nextValue = value.replace(ONLY_DIGITS_DOT, "");
        break;
      default:
        break;
    }

    onChange({ [name]: nextValue });
  };

  // Derive UG/PG section visibility from degree level
  const _dl = (degreeLevel ?? "").toLowerCase();
  const isPG  = _dl.includes("post graduate") || _dl.includes("post graduation");
  const isPhd = _dl.includes("doctor of philosophy") || _dl.includes("phd");
  const showUG = isPG || isPhd;   // UG: shown and mandatory for PG/PhD only
  const showPG = isPhd;           // PG: shown and mandatory for PhD only
  const ugRequired = isPG || isPhd;
  const pgRequired = isPhd;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Education Details</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Enter details as per your mark sheets and certificates.
          {degreeLevel && (
            <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {degreeLevel}
            </span>
          )}
        </p>
      </div>

      {/* SSC / 10th */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            SSC / 10th Standard
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label required>Board</Label>
            <select
              name="sscBoard"
              value={data.sscBoard}
              onChange={handle}
              className={errors.sscBoard ? errorInputCls : selectCls}
            >
              <option value="">— Select board —</option>
              {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <FieldError message={errors.sscBoard} />
          </div>
          <div>
            <Label required>Institution Name</Label>
            <input
              type="text"
              name="sscInstitutionName"
              value={data.sscInstitutionName}
              onChange={handle}
              placeholder="Name of school"
              maxLength={120}
              className={errors.sscInstitutionName ? errorInputCls : inputCls}
            />
            <FieldError message={errors.sscInstitutionName} />
          </div>
          <div>
            <Label required>Hall Ticket No.</Label>
            <input
              type="text"
              name="sscHallTicketNo"
              value={data.sscHallTicketNo}
              onChange={handle}
              placeholder="Hall ticket / roll number"
              maxLength={30}
              className={inputCls}
            />
            <FieldError message={errors.sscHallTicketNo} />
          </div>
          <div>
            <Label required>Year of Passing</Label>
            <select
              name="sscYearOfPassing"
              value={data.sscYearOfPassing}
              onChange={handle}
              className={errors.sscYearOfPassing ? errorInputCls : selectCls}
            >
              <option value="">— Select year —</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <FieldError message={errors.sscYearOfPassing} />
          </div>
          <div>
            <Label required>Percentage / CGPA</Label>
            <input
              type="text"
              name="sscPercentage"
              value={data.sscPercentage}
              onChange={handle}
              placeholder="e.g., 85.5"
              inputMode="decimal"
              pattern="[0-9.]*"
              className={errors.sscPercentage ? errorInputCls : inputCls}
            />
            <FieldError message={errors.sscPercentage} />
          </div>
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* Intermediate / 12th */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            Intermediate / 12th Standard
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label required>Board</Label>
            <select
              name="intermediateBoard"
              value={data.intermediateBoard}
              onChange={handle}
              className={errors.intermediateBoard ? errorInputCls : selectCls}
            >
              <option value="">— Select board —</option>
              {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <FieldError message={errors.intermediateBoard} />
          </div>
          <div>
            <Label required>Institution Name</Label>
            <input
              type="text"
              name="intermediateInstitutionName"
              value={data.intermediateInstitutionName}
              onChange={handle}
              placeholder="Name of school / college"
              maxLength={120}
              className={errors.intermediateInstitutionName ? errorInputCls : inputCls}
            />
            <FieldError message={errors.intermediateInstitutionName} />
          </div>
          <div>
            <Label required>Hall Ticket No.</Label>
            <input
              type="text"
              name="intermediateHallTicketNo"
              value={data.intermediateHallTicketNo}
              onChange={handle}
              placeholder="Hall ticket / roll number"
              maxLength={30}
              className={inputCls}
            />
            <FieldError message={errors.intermediateHallTicketNo} />
          </div>
          <div>
            <Label required>Year of Passing</Label>
            <select
              name="intermediateYearOfPassing"
              value={data.intermediateYearOfPassing}
              onChange={handle}
              className={errors.intermediateYearOfPassing ? errorInputCls : selectCls}
            >
              <option value="">— Select year —</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <FieldError message={errors.intermediateYearOfPassing} />
          </div>
          <div>
            <Label required>Percentage / CGPA</Label>
            <input
              type="text"
              name="intermediatePercentage"
              value={data.intermediatePercentage}
              onChange={handle}
              placeholder="e.g., 78.2"
              inputMode="decimal"
              pattern="[0-9.]*"
              className={errors.intermediatePercentage ? errorInputCls : inputCls}
            />
            <FieldError message={errors.intermediatePercentage} />
          </div>
        </div>
      </div>

      {showUG && <hr className="border-slate-200" />}

      {/* UG Section — shown for PG/PhD applicants (mandatory) */}
      {showUG && (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
            UG Degree
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label required={ugRequired}>Board</Label>
            <select
              name="ugBoard"
              value={data.ugBoard}
              onChange={handle}
              className={errors.ugBoard ? errorInputCls : selectCls}
            >
              <option value="">— Select board —</option>
              {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <FieldError message={errors.ugBoard} />
          </div>
          <div>
            <Label required={ugRequired}>Institution Name</Label>
            <input
              type="text"
              name="ugInstitutionName"
              value={data.ugInstitutionName}
              onChange={handle}
              placeholder="Name of college / institution"
              maxLength={120}
              className={errors.ugInstitutionName ? errorInputCls : inputCls}
            />
            <FieldError message={errors.ugInstitutionName} />
          </div>
          <div>
            <Label required={ugRequired}>Hall Ticket No.</Label>
            <input
              type="text"
              name="ugHallTicketNo"
              value={data.ugHallTicketNo}
              onChange={handle}
              placeholder="Hall ticket / roll number"
              maxLength={30}
              className={inputCls}
            />
            <FieldError message={errors.ugHallTicketNo} />
          </div>
          <div>
            <Label required={ugRequired}>Year of Passing</Label>
            <select name="ugYearOfPassing" value={data.ugYearOfPassing} onChange={handle} className={errors.ugYearOfPassing ? errorInputCls : selectCls}>
              <option value="">— Select year —</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <FieldError message={errors.ugYearOfPassing} />
          </div>
          <div>
            <Label required={ugRequired}>Percentage / CGPA</Label>
            <input
              type="text"
              name="ugPercentage"
              value={data.ugPercentage}
              onChange={handle}
              placeholder="e.g., 72.0"
              inputMode="decimal"
              pattern="[0-9.]*"
              className={errors.ugPercentage ? errorInputCls : inputCls}
            />
            <FieldError message={errors.ugPercentage} />
          </div>
        </div>
      </div>
      )}

      {showPG && <hr className="border-slate-200" />}

      {showPG && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
              PG Degree
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required={pgRequired}>Board</Label>
              <select
                name="pgBoard"
                value={data.pgBoard}
                onChange={handle}
                className={errors.pgBoard ? errorInputCls : selectCls}
              >
                <option value="">— Select board —</option>
                {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <FieldError message={errors.pgBoard} />
            </div>
            <div>
              <Label required={pgRequired}>Institution Name</Label>
              <input
                type="text"
                name="pgInstitutionName"
                value={data.pgInstitutionName}
                onChange={handle}
                placeholder="Name of college / institution"
                maxLength={120}
                className={errors.pgInstitutionName ? errorInputCls : inputCls}
              />
              <FieldError message={errors.pgInstitutionName} />
            </div>
            <div>
              <Label required={pgRequired}>Hall Ticket No.</Label>
              <input
                type="text"
                name="pgHallTicketNo"
                value={data.pgHallTicketNo}
                onChange={handle}
                placeholder="Hall ticket / roll number"
                maxLength={30}
                className={errors.pgHallTicketNo ? errorInputCls : inputCls}
              />
              <FieldError message={errors.pgHallTicketNo} />
            </div>
            <div>
              <Label required={pgRequired}>Year of Passing</Label>
              <select name="pgYearOfPassing" value={data.pgYearOfPassing} onChange={handle} className={errors.pgYearOfPassing ? errorInputCls : selectCls}>
                <option value="">— Select year —</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <FieldError message={errors.pgYearOfPassing} />
            </div>
            <div>
              <Label required={pgRequired}>Percentage / CGPA</Label>
              <input
                type="text"
                name="pgPercentage"
                value={data.pgPercentage}
                onChange={handle}
                placeholder="e.g., 75.0"
                inputMode="decimal"
                pattern="[0-9.]*"
                className={errors.pgPercentage ? errorInputCls : inputCls}
              />
              <FieldError message={errors.pgPercentage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
