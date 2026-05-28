"use client";

import type { BasicDetails } from "@/types/applicant";

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
  onChange: (updates: Partial<BasicDetails>) => void;
};

export default function BasicDetailsStep({
  data,
  errors,
  onChange,
}: BasicDetailsStepProps) {
  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let nextValue = value;

    switch (name) {
      case "firstName":
      case "lastName":
      case "fatherName":
      case "motherName":
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
        nextValue = value.replace(ONLY_DIGITS, "").slice(0, 10);
        break;
      default:
        break;
    }

    onChange({ [name]: nextValue });
  };

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
            max={new Date().toISOString().split("T")[0]}
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
          <Label>Aadhaar Number</Label>
          <input
            type="text"
            name="aadharNo"
            value={data.aadharNo}
            onChange={handle}
            placeholder="12-digit Aadhaar number"
            maxLength={12}
            inputMode="numeric"
            pattern="\d*"
            className={inputCls}
          />
          <FieldError message={errors.aadharNo} />
        </div>
        <div>
          <Label>Blood Group</Label>
          <select name="bloodGroup" value={data.bloodGroup} onChange={handle} className={selectCls}>
            <option value="">— Select —</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Caste, Sub-Caste */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Caste</Label>
          <input
            type="text"
            name="caste"
            value={data.caste}
            onChange={handle}
            placeholder="e.g., OC, BC-A, SC, ST"
            maxLength={60}
            className={inputCls}
          />
          <FieldError message={errors.caste} />
        </div>
        <div>
          <Label>Sub-Caste</Label>
          <input
            type="text"
            name="subCaste"
            value={data.subCaste}
            onChange={handle}
            placeholder="Sub-caste (if applicable)"
            maxLength={60}
            className={inputCls}
          />
          <FieldError message={errors.subCaste} />
        </div>
      </div>

      <hr className="border-slate-200" />
      <SectionHeading title="Address" />

      {/* State, City, Pincode */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>State</Label>
          <select name="state" value={data.state} onChange={handle} className={selectCls}>
            <option value="">— Select —</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>City</Label>
          <input
            type="text"
            name="city"
            value={data.city}
            onChange={handle}
            placeholder="e.g., Hyderabad"
            maxLength={60}
            className={inputCls}
          />
          <FieldError message={errors.city} />
        </div>
        <div>
          <Label>Pincode</Label>
          <input
            type="text"
            name="pincode"
            value={data.pincode}
            onChange={handle}
            placeholder="6-digit pincode"
            maxLength={6}
            inputMode="numeric"
            pattern="\d*"
            className={inputCls}
          />
          <FieldError message={errors.pincode} />
        </div>
      </div>

      {/* Present Address */}
      <div>
        <Label>Present Address</Label>
        <textarea
          name="presentAddress"
          value={data.presentAddress}
          onChange={handle}
          placeholder="House / Flat No., Street, Area, City"
          maxLength={300}
          rows={3}
          className={textareaCls}
        />
      </div>

      {/* Permanent Address */}
      <div>
        <Label>Permanent Address</Label>
        <textarea
          name="permanentAddress"
          value={data.permanentAddress}
          onChange={handle}
          placeholder="Permanent / native address"
          maxLength={300}
          rows={3}
          className={textareaCls}
        />
      </div>

      <hr className="border-slate-200" />
      <SectionHeading title="Parent / Guardian Information" />

      {/* Father */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Father</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Name</Label>
            <input
              type="text"
              name="fatherName"
              value={data.fatherName}
              onChange={handle}
              placeholder="Father's full name"
              maxLength={100}
              className={inputCls}
            />
            <FieldError message={errors.fatherName} />
          </div>
          <div>
            <Label>Mobile Number</Label>
            <input
              type="tel"
              name="fatherMobileNo"
              value={data.fatherMobileNo}
              onChange={handle}
              placeholder="10-digit number"
              maxLength={10}
              inputMode="numeric"
              pattern="\d*"
              className={inputCls}
            />
            <FieldError message={errors.fatherMobileNo} />
          </div>
          <div>
            <Label>Email</Label>
            <input
              type="email"
              name="fatherEmail"
              value={data.fatherEmail}
              onChange={handle}
              placeholder="Father's email (optional)"
              maxLength={100}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Mother */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mother</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Name</Label>
            <input
              type="text"
              name="motherName"
              value={data.motherName}
              onChange={handle}
              placeholder="Mother's full name"
              maxLength={100}
              className={inputCls}
            />
            <FieldError message={errors.motherName} />
          </div>
          <div>
            <Label>Mobile Number</Label>
            <input
              type="tel"
              name="motherMobileNo"
              value={data.motherMobileNo}
              onChange={handle}
              placeholder="10-digit number"
              maxLength={10}
              inputMode="numeric"
              pattern="\d*"
              className={inputCls}
            />
            <FieldError message={errors.motherMobileNo} />
          </div>
          <div>
            <Label>Email</Label>
            <input
              type="email"
              name="motherEmail"
              value={data.motherEmail}
              onChange={handle}
              placeholder="Mother's email (optional)"
              maxLength={100}
              className={inputCls}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
