"use client";

import type { EntranceExamDetails } from "@/types/applicant";

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const errorInputCls =
  "mt-1 w-full rounded-xl border border-rose-400 bg-white px-3 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";

const ONLY_DIGITS_DOT = /[^\d.]/g;

const ENTRANCE_EXAMS = [
  "AP EAMCET",
  "TS EAMCET",
  "JEE Main",
  "JEE Advanced",
  "NEET UG",
  "CUET",
  "ICET",
  "PGECET",
  "GATE",
  "CAT",
  "MAT",
  "XAT",
  "CMAT",
  "AURUM",
  "Other",
];

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

type EntranceDetailsStepProps = {
  data: EntranceExamDetails;
  errors: Record<string, string>;
  onChange: (updates: Partial<EntranceExamDetails>) => void;
};

export default function EntranceDetailsStep({
  data,
  errors,
  onChange,
}: EntranceDetailsStepProps) {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    let nextValue = value;

    switch (name) {
      case "entranceExamHallTicketNo":
      case "entranceExamRank":
        nextValue = value.replace(ONLY_DIGITS_DOT, "");
        break;
      default:
        break;
    }

    onChange({ [name]: nextValue });
  };
  

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      quallingEntranceExam: e.target.value,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          Entrance Exam Details
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Fill all fields below. All entrance exam details are required to proceed.
        </p>
      </div>

      {/* Entrance Exam Dropdown */}
      <div>
        <Label required>Name of Qualifying Entrance Exam</Label>

        <select
          name="quallingEntranceExam"
          value={data.quallingEntranceExam || ""}
          onChange={handleSelect}
          required
          className={
            errors.quallingEntranceExam ? errorInputCls : inputCls
          }
        >
          <option value="">Select Entrance Exam</option>

          {ENTRANCE_EXAMS.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </select>

        <FieldError message={errors.quallingEntranceExam} />
      </div>

      {/* Hall Ticket & Rank */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Hall Ticket Number</Label>
          <input
            type="text"
            name="entranceExamHallTicketNo"
            value={data.entranceExamHallTicketNo}
            onChange={handleInput}
            placeholder="Hall ticket / application number"
            maxLength={50}
            inputMode="decimal"
            pattern="[0-9.]*"
            required
            className={
              errors.entranceExamHallTicketNo
                ? errorInputCls
                : inputCls
            }
          />
          <FieldError message={errors.entranceExamHallTicketNo} />
        </div>

        <div>
          <Label required>Rank</Label>
          <input
            type="text"
            name="entranceExamRank"
            value={data.entranceExamRank}
            onChange={handleInput}
            placeholder="e.g., 4521"
            maxLength={20}
            inputMode="decimal"
            pattern="[0-9.]*"
            required
            className={
              errors.entranceExamRank
                ? errorInputCls
                : inputCls
            }
          />
          <FieldError message={errors.entranceExamRank} />
        </div>
      </div>
      {/* AURUM Exam Interest */}
<div>
  <Label required>
    Interested to write AURUM Exam?
  </Label>

  <div className="mt-3 flex gap-6">
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="radio"
        name="intrestedInAurumExam"
        checked={data.intrestedInAurumExam === true}
        onChange={() =>
          onChange({
            intrestedInAurumExam: true,
          })
        }
        className="h-4 w-4"
      />
      Yes, I am interested
    </label>

    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="radio"
        name="intrestedInAurumExam"
        checked={data.intrestedInAurumExam === false}
        onChange={() =>
          onChange({
            intrestedInAurumExam: false,
          })
        }
        className="h-4 w-4"
      />
      No, I am not interested
    </label>
  </div>

  <FieldError message={errors.intrestedInAurumExam} />
</div>
    </div>
  );
}