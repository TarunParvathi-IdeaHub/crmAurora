"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { authFetch } from "@/lib/utils/authFetch";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Other"];

type Institution = { id: string; institutionName: string; institutionCode: string };
type EmployeeRole = { id: string; role: string; staffType: string; rolePrefix: string };
type Department = { id: string; name: string; departmentCode: string };

type FormData = {
  institutionId: string;
  roleId: string;
  departmentId: string;
  firstName: string;
  lastName: string;
  designation: string;
  email: string;
  mobileNo: string;
  alternateMobileNo: string;
  emergencyContact: string;
  address: string;
  bloodGroup: string;
  bloodGroupCustom: string;
  caste: string;
};

const EMPTY_FORM: FormData = {
  institutionId: "",
  roleId: "",
  departmentId: "",
  firstName: "",
  lastName: "",
  designation: "",
  email: "",
  mobileNo: "",
  alternateMobileNo: "",
  emergencyContact: "",
  address: "",
  bloodGroup: "",
  bloodGroupCustom: "",
  caste: "",
};

export default function CreateEmployeePage() {
  const role = useRole();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);;

  const [roleSelected, setRoleSelected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ empId: string; designation: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkFileName, setBulkFileName] = useState<string | null>(null);
  const bulkFileRef = useRef<HTMLInputElement | null>(null);
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);

  // ── Fetch institutions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (role === "collegeAdmin") {
      authFetch(`${API_BASE_URL}/api/institutions/current`)
        .then((r) => r.json())
        .then((d: { institution?: Institution }) => {
          if (d.institution) {
            setInstitutions([d.institution]);
            setForm((prev) => ({ ...prev, institutionId: d.institution!.id }));
          }
        })
        .catch(() => {});
    } else {
      authFetch(`${API_BASE_URL}/api/institutions`)
        .then((r) => r.json())
        .then((d) => setInstitutions(d.institutions ?? []))
        .catch(() => {});
    }
  }, [role]);

  // ── Fetch roles when institution changes ───────────────────────────────────
  useEffect(() => {
    setRoles([]);
    setForm((prev) => ({ ...prev, roleId: "", designation: "" }));
    setRoleSelected(false);
    if (!form.institutionId) return;
    authFetch(`${API_BASE_URL}/api/employee-roles/getall?institutionId=${encodeURIComponent(form.institutionId)}`)
      .then((r) => r.json())
      .then((d) => setRoles(d.employeeRoles ?? []))
      .catch(() => {});
  }, [form.institutionId]);

  // ── Fetch departments when institution changes ─────────────────────────────
  useEffect(() => {
    setDepartments([]);
    setForm((prev) => ({ ...prev, departmentId: "" }));
    if (!form.institutionId) return;
    authFetch(`${API_BASE_URL}/api/departments?institutionId=${encodeURIComponent(form.institutionId)}`)
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments ?? []))
      .catch(() => {});
  }, [form.institutionId]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === "firstName" || name === "lastName") {
      nextValue = value.replace(/[^A-Za-z\s]/g, "");
    }

    if (
      name === "mobileNo" ||
      name === "alternateMobileNo" ||
      name === "emergencyContact"
    ) {
      nextValue = value.replace(/\D/g, "").slice(0, 10);
    }

    if (name === "caste") {
      nextValue = value.replace(/[^A-Za-z\s-]/g, "");
    }

    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = roles.find((r) => r.id === e.target.value);
    setForm((prev) => ({
      ...prev,
      roleId: e.target.value,
      designation: selected?.role ?? "",
    }));
    setRoleSelected(!!e.target.value);
  };

  const getResetForm = () => {
    if (role === "collegeAdmin" && institutions.length > 0) {
      return { ...EMPTY_FORM, institutionId: institutions[0].id };
    }
    return EMPTY_FORM;
  };

  const handleBulkFilePick = () => {
    bulkFileRef.current?.click();
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isAllowed =
      lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv");

    setBulkError(null);
    setBulkSuccess(null);

    if (!isAllowed) {
      setBulkError("Please upload a .xlsx, .xls, or .csv file.");
      e.target.value = "";
      setBulkFileName(null);
      return;
    }

    setBulkFileName(file.name);
    setBulkUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await authFetch(`${API_BASE_URL}/api/employees/bulk-create`, {
        method: "POST",
        body: formData,
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setBulkError(data.message || "Bulk upload failed.");
        return;
      }

      const summary =
        typeof data.successCount === "number"
          ? `Uploaded. Success: ${data.successCount}, Failed: ${data.failedCount}.`
          : "Bulk upload completed.";
      setBulkSuccess(summary);
    } catch (err: any) {
      setBulkError(err?.message || "Network error during bulk upload.");
    } finally {
      setBulkUploading(false);
      if (bulkFileRef.current) bulkFileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const nameRegex = /^[A-Za-z\s]+$/;
      const casteRegex = /^[A-Za-z\s-]+$/;
      const mobileRegex = /^[0-9]{10}$/;

      if (!nameRegex.test(form.firstName.trim())) {
        setError("First name should contain only letters and spaces.");
        return;
      }
      if (!nameRegex.test(form.lastName.trim())) {
        setError("Last name should contain only letters and spaces.");
        return;
      }
      if (!mobileRegex.test(form.mobileNo.trim())) {
        setError("Mobile number should contain exactly 10 digits.");
        return;
      }
      if (!mobileRegex.test(form.alternateMobileNo.trim())) {
        setError("Alternative mobile number should contain exactly 10 digits.");
        return;
      }
      if (!mobileRegex.test(form.emergencyContact.trim())) {
        setError("Emergency contact number should contain exactly 10 digits.");
        return;
      }
      if (!casteRegex.test(form.caste.trim())) {
        setError("Caste should contain only letters, spaces, and hyphens.");
        return;
      }

      const selectedRole = roles.find((r) => r.id === form.roleId);
      const effectiveBloodGroup =
        form.bloodGroup === "Other" ? form.bloodGroupCustom.trim() : form.bloodGroup;

      const body: Record<string, string> = {
        institutionId: form.institutionId,
        staffType: selectedRole?.staffType ?? "",
        firstName: form.firstName,
        lastName: form.lastName,
        designation: form.designation,
        email: form.email,
        mobileNo: form.mobileNo,
        alternateMobileNo: form.alternateMobileNo,
        emergencyContact: form.emergencyContact,
        address: form.address,
        bloodGroup: effectiveBloodGroup,
        caste: form.caste,
      };
      if (form.departmentId) body.departmentId = form.departmentId;

      const resp = await authFetch(`${API_BASE_URL}/api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.message || "Failed to create employee.");
        return;
      }
      setSuccess({ empId: data.data.empId, designation: data.data.designation });
      setForm(getResetForm());
      setRoleSelected(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Input class ─────────────────────────────────────────────────────────────
  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
  const labelCls = "block text-base font-medium text-slate-700";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Page heading */}
      <div>
        <h2 className="text-base font-semibold text-slate-900">Create Employee</h2>
        <p className="mt-1 text-sm text-slate-500">Add single employees or upload a sheet to create in bulk.</p>
      </div>

      {/* Bulk upload */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Bulk employee upload</p>
            <p className="mt-1 text-xs text-slate-500">Upload .xlsx, .xls, or .csv with employee rows.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={bulkFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleBulkFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => setBulkActionsOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Bulk Upload
            </button>
          </div>
        </div>
        {bulkActionsOpen && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href="/templates/employee-upload-template.csv"
              download
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Download Template
            </a>
            <button
              type="button"
              onClick={handleBulkFilePick}
              disabled={bulkUploading}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkUploading ? "Uploading…" : "Upload Sheet"}
            </button>
          </div>
        )}
        {bulkFileName && (
          <p className="mt-2 text-xs text-slate-500">Selected file: {bulkFileName}</p>
        )}
        {bulkSuccess && (
          <p className="mt-2 text-xs text-emerald-700">{bulkSuccess}</p>
        )}
        {bulkError && (
          <p className="mt-2 text-xs text-rose-600">{bulkError}</p>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="text-sm text-emerald-800">
            <p className="font-semibold">Employee created successfully!</p>
            <p className="mt-0.5">
              Employee ID: <span className="font-mono font-medium">{success.empId}</span> &middot; {success.designation}
            </p>
            <p className="mt-0.5 text-xs text-emerald-600">Credentials have been sent to the employee&apos;s email.</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Section 1: Institution & Role ─────────────────────────────── */}
        <section className="border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-410">
            Institution &amp; Role
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Institution <span className="text-rose-500">*</span>
              </label>
              {role === "collegeAdmin" ? (
                <input
                  type="text"
                  value={
                    institutions.length > 0
                      ? `${institutions[0].institutionName} (${institutions[0].institutionCode})`
                      : ""
                  }
                  readOnly
                  className={`${inputCls} cursor-not-allowed bg-slate-100`}
                />
              ) : (
                <select
                  name="institutionId"
                  value={form.institutionId}
                  onChange={handleChange}
                  required
                  className={inputCls}
                >
                  <option value="">Select institution</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.institutionName} ({i.institutionCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className={labelCls}>
                Employee Role <span className="text-rose-500">*</span>
              </label>
              <select
                name="roleId"
                value={form.roleId}
                onChange={handleRoleChange}
                required
                disabled={!form.institutionId}
                className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-100`}
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role} ({r.staffType})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Department <span className="text-xs text-slate-400">(optional)</span></label>
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                disabled={!form.institutionId}
                className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-100`}
              >
                <option value="">Select department (optional)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.departmentCode})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Section 2: Personal Details (shown after role selected) ───── */}
        {roleSelected && (
          <>
            <section className="border-t border-slate-100 pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Personal Details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="e.g., Ravi"
                    required
                    inputMode="text"
                    pattern="[A-Za-z\s]+"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="e.g., Kumar"
                    required
                    inputMode="text"
                    pattern="[A-Za-z\s]+"
                    className={inputCls}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={form.designation}
                    readOnly
                    className={`${inputCls} cursor-default bg-slate-50 text-slate-600`}
                  />
                  <p className="mt-1 text-xs text-slate-400">Auto-filled from the selected role.</p>
                </div>

                <div>
                  <label className={labelCls}>
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="employee@example.com"
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Mobile No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="mobileNo"
                    value={form.mobileNo}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    required
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={10}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Alternative Mobile No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="alternateMobileNo"
                    value={form.alternateMobileNo}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={10}
                    required
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Emergency Contact No <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={form.emergencyContact}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={10}
                    required
                    className={inputCls}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>
                    Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Full residential address"
                    rows={4}
                    required
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Blood Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="bloodGroup"
                    value={form.bloodGroup}
                    onChange={handleChange}
                    required
                    className={inputCls}
                  >
                    <option value="">Select blood group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                  {form.bloodGroup === "Other" && (
                    <input
                      type="text"
                      name="bloodGroupCustom"
                      value={form.bloodGroupCustom}
                      onChange={handleChange}
                      placeholder="Enter blood group"
                      required
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>

                <div>
                  <label className={labelCls}>
                    Caste <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="caste"
                    value={form.caste}
                    onChange={handleChange}
                    placeholder="e.g., General"
                    required
                    inputMode="text"
                    pattern="[A-Za-z\s-]+"
                    className={inputCls}
                  />
                </div>
              </div>
            </section>

            {/* ── Submit ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating…" : "Create Employee"}
              </button>
              <button
                type="button"
                onClick={() => { setForm(getResetForm()); setRoleSelected(false); setError(null); setSuccess(null); }}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
