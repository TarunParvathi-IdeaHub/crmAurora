"use client";

import type { EntranceExamDetails } from "@/types/applicant";

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const errorInputCls =
  "mt-1 w-full rounded-xl border border-rose-400 bg-white px-3 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";

const ONLY_ALPHA_SPACE = /[^A-Za-z\s]/g;
const ONLY_DIGITS_DOT = /[^\d.]/g;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">{children}</label>
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
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let nextValue = value;

    switch (name) {
      case "quallingEntranceExam":
        nextValue = value.replace(ONLY_ALPHA_SPACE, "");
        break;
      case "entranceExamHallTicketNo":
      case "entranceExamRank":
        nextValue = value.replace(ONLY_DIGITS_DOT, "");
        break;
      default:
        break;
    }

    onChange({ [name]: nextValue });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Entrance Exam Details</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          All fields are optional. Fill in if you have appeared for any qualifying entrance exam.
        </p>
      </div>

      {/* Qualifying Entrance Exam */}
      <div>
        <Label>Name of Qualifying Entrance Exam</Label>
        <input
          type="text"
          name="quallingEntranceExam"
          value={data.quallingEntranceExam}
          onChange={handle}
          placeholder="e.g., EAMCET, JEE Main, NEET"
          maxLength={100}
          className={errors.quallingEntranceExam ? errorInputCls : inputCls}
        />
        <FieldError message={errors.quallingEntranceExam} />
      </div>

      {/* Hall Ticket & Rank */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Hall Ticket Number</Label>
          <input
            type="text"
            name="entranceExamHallTicketNo"
            value={data.entranceExamHallTicketNo}
            onChange={handle}
            placeholder="Hall ticket / application number"
            maxLength={50}
            inputMode="decimal"
            pattern="[0-9.]*"
            className={errors.entranceExamHallTicketNo ? errorInputCls : inputCls}
          />
          <FieldError message={errors.entranceExamHallTicketNo} />
        </div>
        <div>
          <Label>Rank / Score</Label>
          <input
            type="text"
            name="entranceExamRank"
            value={data.entranceExamRank}
            onChange={handle}
            placeholder="e.g., 4521 or 87.6"
            maxLength={20}
            inputMode="decimal"
            pattern="[0-9.]*"
            className={errors.entranceExamRank ? errorInputCls : inputCls}
          />
          <FieldError message={errors.entranceExamRank} />
        </div>
      </div>

      <hr className="border-slate-200" />

      {/* AURUM Exam Interest 
      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">
          Interested in AURUM Exam?
        </p>
        <p className="mb-4 text-xs text-slate-500">
          AURUM is our in-house entrance examination. Select &quot;Yes&quot; if you would like to
          appear for it and we will notify you with the schedule.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange({ intrestedInAurumExam: true })}
            className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
              data.intrestedInAurumExam
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChange({ intrestedInAurumExam: false })}
            className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
              !data.intrestedInAurumExam
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            No
          </button>
        </div>
        {data.intrestedInAurumExam && (
          <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            You will be notified with the AURUM exam schedule via your registered email and mobile number.
          </div>
        )}
      </div>*/}
    </div>
  );
}
