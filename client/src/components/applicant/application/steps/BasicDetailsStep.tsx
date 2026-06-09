"use client";

import type { BasicDetails, DocumentFile } from "@/types/applicant";
import { getIndianCurrentYear } from "@/lib/utils/admissionDateRules";

// ── Static reference data ─────────────────────────────────────────────────────

const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
];

const ONLY_ALPHA_SPACE = /[^A-Za-z\s]/g;
const ONLY_ALPHA_SPACE_HYPHEN = /[^A-Za-z\s-]/g;
const ONLY_DIGITS = /[^\d]/g;

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const errorInputCls =
  "mt-1 w-full rounded-xl border border-rose-400 bg-white px-3 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";
const textareaCls =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none";

// ── Main component ────────────────────────────────────────────────────────────

type BasicDetailsStepProps = {
  data: BasicDetails;
  errors: Record<string, string>;
  aadharCardDocument: DocumentFile;
  onChange: (updates: Partial<BasicDetails>) => void;
  onAadharCardFileChange: (file: File | null) => void;
  dobMax?: string;
};

export default function BasicDetailsStep({
  data,
  errors,
  aadharCardDocument,
  onChange,
  onAadharCardFileChange,
  dobMax,
}: BasicDetailsStepProps) {
  const maxDob = `${getIndianCurrentYear()}-12-31`;

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let nextValue = value;

    switch (name) {
      case "firstName":
      case "lastName":
      case "fatherName":
      case "motherName":
      case "guardianName":
        nextValue = value.replace(ONLY_ALPHA_SPACE, "");
        break;
      case "caste":
      case "subCaste":
        nextValue = value.replace(ONLY_ALPHA_SPACE_HYPHEN, "");
        break;
      case "city":
        nextValue = value.replace(ONLY_ALPHA_SPACE, "");
        break;
      case "aadharNo":
        nextValue = value.replace(ONLY_DIGITS, "").slice(0, 12);
        break;
      case "pincode":
        nextValue = value.replace(ONLY_DIGITS, "").slice(0, 6);
        break;
      case "mobileNo":
      case "fatherMobileNo":
      case "motherMobileNo":
      case "guardianMobileNo":
        nextValue = value.replace(ONLY_DIGITS, "").slice(0, 10);
        break;
      default:
        break;
    }

    onChange({ [name]: nextValue });
  };

  const handleAadharUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onAadharCardFileChange(file);
  };

  const handleCopyAddress = (checked: boolean) => {
    if (checked) onChange({ permanentAddress: data.presentAddress });
    else onChange({ permanentAddress: "" });
  };

  const localAadharError =
    data.aadharNo && data.aadharNo.trim().length > 0 && data.aadharNo.trim().length !== 12
      ? "Aadhaar number must be 12 digits."
      : undefined;

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Personal Information"
        subtitle="Enter your details exactly as they appear on official documents."
      />

      {/* Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>First Name</Label>
          <input
            type="text"
            name="firstName"
            value={data.firstName}
            onChange={handle}
            placeholder="e.g., Arjun"
            maxLength={60}
            className={errors.firstName ? errorInputCls : inputCls}
          />
          <FieldError message={errors.firstName} />
        </div>
        <div>
          <Label required>Last Name</Label>
          <input
            type="text"
            name="lastName"
            value={data.lastName}
            onChange={handle}
            placeholder="e.g., Sharma"
            maxLength={60}
            className={errors.lastName ? errorInputCls : inputCls}
          />
          <FieldError message={errors.lastName} />
        </div>
      </div>

      {/* DOB, Gender */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Date of Birth</Label>
          <input
            type="date"
            name="dateOfBirth"
            value={data.dateOfBirth}
            onChange={handle}
            max={maxDob}
            className={errors.dateOfBirth ? errorInputCls : inputCls}
          />
          <FieldError message={errors.dateOfBirth} />
        </div>
        <div>
          <Label required>Gender</Label>
          <select
            name="gender"
            value={data.gender}
            onChange={handle}
            className={errors.gender ? errorInputCls : selectCls}
          >
            <option value="">— Select —</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <FieldError message={errors.gender} />
        </div>
      </div>

      {/* Mobile, Email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Mobile Number</Label>
          <input
            type="tel"
            name="mobileNo"
            value={data.mobileNo}
            onChange={handle}
            placeholder="10-digit number"
            maxLength={10}
            inputMode="numeric"
            pattern="\d*"
            className={errors.mobileNo ? errorInputCls : inputCls}
          />
          <FieldError message={errors.mobileNo} />
        </div>
        <div>
          <Label required>Email Address</Label>
          <input
            type="email"
            name="email"
            value={data.email}
            onChange={handle}
            placeholder="example@email.com"
            maxLength={100}
            className={errors.email ? errorInputCls : inputCls}
          />
          <FieldError message={errors.email} />
        </div>
      </div>

      <hr className="border-slate-200" />
      <SectionHeading title="Identity Details" />

      {/* Aadhar, Blood Group */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Aadhaar Number</Label>
          <input
            type="text"
            name="aadharNo"
            value={data.aadharNo}
            onChange={handle}
            placeholder="12-digit Aadhaar number"
            maxLength={12}
            inputMode="numeric"
            pattern="\d*"
            className={errors.aadharNo ? errorInputCls : inputCls}
          />
          <FieldError message={errors.aadharNo || localAadharError} />
        </div>
        <div>
          <Label required>Upload Aadhaar Card</Label>
          <div className="flex items-center gap-3">
            <label htmlFor="aadharCard" className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:bg-white">
              Choose file
            </label>
            <input
              id="aadharCard"
              name="aadharCard"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleAadharUpload}
              className="sr-only"
            />
            <span className="min-w-0 truncate text-sm text-slate-500">
              {aadharCardDocument?.name || "No file chosen"}
            </span>
          </div>
          <FieldError message={errors.aadharCard} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Blood Group</Label>
          <select name="bloodGroup" value={data.bloodGroup} onChange={handle} className={errors.bloodGroup ? errorInputCls : selectCls}>
            <option value="">— Select —</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
          <FieldError message={errors.bloodGroup} />
        </div>
      </div>

      {/* Caste, Sub-Caste */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Caste</Label>
          <input
            type="text"
            name="caste"
            value={data.caste}
            onChange={handle}
            placeholder="e.g., OC, BC-A, SC, ST"
            maxLength={60}
            className={errors.caste ? errorInputCls : inputCls}
          />
          <FieldError message={errors.caste} />
        </div>
        <div>
          <Label required>Sub-Caste</Label>
          <input
            type="text"
            name="subCaste"
            value={data.subCaste}
            onChange={handle}
            placeholder="Sub-caste"
            maxLength={60}
            className={errors.subCaste ? errorInputCls : inputCls}
          />
          <FieldError message={errors.subCaste} />
        </div>
      </div>

      <hr className="border-slate-200" />
      <SectionHeading title="Address" />

      {/* State, City, Pincode */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label required>State</Label>
          <select name="state" value={data.state} onChange={handle} className={errors.state ? errorInputCls : selectCls}>
            <option value="">— Select —</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <FieldError message={errors.state} />
        </div>
        <div>
          <Label required>City</Label>
          <input
            type="text"
            name="city"
            value={data.city}
            onChange={handle}
            placeholder="e.g., Hyderabad"
            maxLength={60}
            className={errors.city ? errorInputCls : inputCls}
          />
          <FieldError message={errors.city} />
        </div>
        <div>
          <Label required>Pincode</Label>
          <input
            type="text"
            name="pincode"
            value={data.pincode}
            onChange={handle}
            placeholder="6-digit pincode"
            maxLength={6}
            inputMode="numeric"
            pattern="\d*"
            className={errors.pincode ? errorInputCls : inputCls}
          />
          <FieldError message={errors.pincode} />
        </div>
      </div>

      {/* Present Address */}
      <div>
        <Label required>Present Address</Label>
        <textarea
          name="presentAddress"
          value={data.presentAddress}
          onChange={handle}
          placeholder="House / Flat No., Street, Area, City"
          maxLength={300}
          rows={3}
          className={errors.presentAddress ? errorInputCls : textareaCls}
        />
        <FieldError message={errors.presentAddress} />
      </div>

      <div className="flex justify-end">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={data.permanentAddress === data.presentAddress && data.presentAddress.trim().length > 0}
            onChange={(e) => handleCopyAddress(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <span>Same as present address</span>
        </label>
      </div>

      {/* Permanent Address */}
      <div>
        <Label required>Permanent Address</Label>
        <textarea
          name="permanentAddress"
          value={data.permanentAddress}
          onChange={handle}
          placeholder="Permanent / native address"
          maxLength={300}
          rows={3}
          className={errors.permanentAddress ? errorInputCls : textareaCls}
        />
        <FieldError message={errors.permanentAddress} />
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Residency status</p>
            <p className="text-xs text-slate-500">Select whether you are a local resident or outstation resident.</p>
          </div>
          <div className="inline-flex rounded-full border border-slate-300 bg-white p-1">
            <button
              type="button"
              onClick={() => onChange({ isLocal: true })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                data.isLocal ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Local Resident
            </button>
            <button
              type="button"
              onClick={() => onChange({ isLocal: false })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                !data.isLocal ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Outstation Resident
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          {data.isLocal
            ? "Local residents should provide parent details and may optionally provide guardian information."
            : "Outstation residents must provide guardian contact information below."}
        </p>
      </div>

      {/* Parent / Guardian: Parent fields first, guardian shown afterwards for un-local applicants */}

      <hr className="border-slate-200" />
      <SectionHeading title="Parent Details" />

      {/* Father */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Father</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label required>Name</Label>
            <input
              type="text"
              name="fatherName"
              value={data.fatherName}
              onChange={handle}
              placeholder="Father's full name"
              maxLength={100}
              className={errors.fatherName ? errorInputCls : inputCls}
            />
            <FieldError message={errors.fatherName} />
          </div>
          <div>
            <Label required>Mobile Number</Label>
            <input
              type="tel"
              name="fatherMobileNo"
              value={data.fatherMobileNo}
              onChange={handle}
              placeholder="10-digit number"
              maxLength={10}
              inputMode="numeric"
              pattern="\d*"
              className={errors.fatherMobileNo ? errorInputCls : inputCls}
            />
            <FieldError message={errors.fatherMobileNo} />
          </div>
          <div>
            <Label required>Email</Label>
            <input
              type="email"
              name="fatherEmail"
              value={data.fatherEmail}
              onChange={handle}
              placeholder="Father's email"
              maxLength={100}
              className={errors.fatherEmail ? errorInputCls : inputCls}
            />
            <FieldError message={errors.fatherEmail} />
          </div>
        </div>
      </div>

      {/* Mother */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mother</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label required>Name</Label>
            <input
              type="text"
              name="motherName"
              value={data.motherName}
              onChange={handle}
              placeholder="Mother's full name"
              maxLength={100}
              className={errors.motherName ? errorInputCls : inputCls}
            />
            <FieldError message={errors.motherName} />
          </div>
          <div>
            <Label required>Mobile Number</Label>
            <input
              type="tel"
              name="motherMobileNo"
              value={data.motherMobileNo}
              onChange={handle}
              placeholder="10-digit number"
              maxLength={10}
              inputMode="numeric"
              pattern="\d*"
              className={errors.motherMobileNo ? errorInputCls : inputCls}
            />
            <FieldError message={errors.motherMobileNo} />
          </div>
          <div>
            <Label required>Email</Label>
            <input
              type="email"
              name="motherEmail"
              value={data.motherEmail}
              onChange={handle}
              placeholder="Mother's email"
              maxLength={100}
              className={errors.motherEmail ? errorInputCls : inputCls}
            />
            <FieldError message={errors.motherEmail} />
          </div>
        </div>
      </div>
      
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Guardian Details
          </span>
        </div>
        <p className="text-sm text-slate-600">
          {data.isLocal
            ? "Guardian details are optional for Local Resident applicants."
            : "Guardian details are required for Outstation Resident applicants."}
        </p>
        <p className="text-xs text-slate-500">
          Local Resident: optional; Outstation Resident: required.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label required={!data.isLocal}>Name</Label>
            <input
              type="text"
              name="guardianName"
              value={data.guardianName}
              onChange={handle}
              placeholder="Guardian's full name"
              maxLength={100}
              className={errors.guardianName ? errorInputCls : inputCls}
            />
            <FieldError message={errors.guardianName} />
          </div>
          <div>
            <Label required={!data.isLocal}>Mobile Number</Label>
            <input
              type="tel"
              name="guardianMobileNo"
              value={data.guardianMobileNo}
              onChange={handle}
              placeholder="10-digit number"
              maxLength={10}
              inputMode="numeric"
              pattern="\d*"
              className={errors.guardianMobileNo ? errorInputCls : inputCls}
            />
            <FieldError message={errors.guardianMobileNo} />
          </div>
          <div>
            <Label required={!data.isLocal}>Email</Label>
            <input
              type="email"
              name="guardianEmail"
              value={data.guardianEmail}
              onChange={handle}
              placeholder="Guardian's email"
              maxLength={100}
              className={errors.guardianEmail ? errorInputCls : inputCls}
            />
            <FieldError message={errors.guardianEmail} />
          </div>
        </div>
      </div>
    </div>
  );
}
