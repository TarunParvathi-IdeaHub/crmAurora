"use client";

import { useEffect, useRef, useState } from "react";
import { EllipsisVertical, PencilLine, Plus, Trash2 } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { authFetch } from "@/lib/utils/authFetch";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const STAFF_TYPES = ["Teaching", "Non-Teaching", "Administrative", "Technical", "Support"];
const ROLE_OPTIONS = [
  "College Admin",
  "Admission Director",
  "Admission Incharge",
  "Admission Counsellor",
  "Admission Consultant",
];

type Institution = { id: string; institutionName: string; institutionCode: string };
type EmployeeRole = {
  id: string;
  roleId: string;
  role: string;
  staffType: string;
  rolePrefix: string;
  roleCount: number;
  institutionId: string;
};

type FormMode = "create" | "edit";
const EMPTY_FORM = { roleId: "", role: "", staffType: "", rolePrefix: "", roleCount: "", institutionId: "" };

export default function RoleManagementPage() {
  const role = useRole();

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [roles, setRoles] = useState<EmployeeRole[]>([]);

  const [filterInstitutionId, setFilterInstitutionId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  // ── Fetch institutions ──────────────────────────────────────────────────────
  useEffect(() => {
    if (role === "collegeAdmin") {
      authFetch(`${API_BASE_URL}/api/institutions/current`)
        .then((r) => r.json())
        .then((d: { institution?: Institution }) => {
          if (d.institution) {
            setInstitutions([d.institution]);
            setFilterInstitutionId(d.institution.id);
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

  // Auto-fill institution for College Admin whenever form is reset
  useEffect(() => {
    if (role === "collegeAdmin" && institutions.length > 0 && form.institutionId === "") {
      setForm((prev) => ({ ...prev, institutionId: institutions[0].id }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, institutions, form.institutionId]);

  // ── Fetch roles ─────────────────────────────────────────────────────────────
  const fetchRoles = (institutionId?: string) => {
    const qs = institutionId ? `?institutionId=${encodeURIComponent(institutionId)}` : "";
    authFetch(`${API_BASE_URL}/api/employee-roles/getall${qs}`)
      .then((r) => r.json())
      .then((d) => setRoles(d.employeeRoles ?? []))
      .catch(() => {});
  };

  useEffect(() => { fetchRoles(filterInstitutionId || undefined); }, [filterInstitutionId]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setMode("create");
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  };

  const startEdit = (role: EmployeeRole) => {
    setForm({
      roleId: role.roleId,
      role: role.role,
      staffType: role.staffType,
      rolePrefix: role.rolePrefix,
      roleCount: String(role.roleCount),
      institutionId: role.institutionId,
    });
    setMode("edit");
    setFormOpen(true);
    setEditingId(role.id);
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        roleId: form.roleId.trim(),
        role: form.role.trim(),
        staffType: form.staffType,
        rolePrefix: form.rolePrefix.trim().toUpperCase(),
        roleCount: Number(form.roleCount),
        institutionId: form.institutionId,
      };

      const url =
        mode === "edit"
          ? `${API_BASE_URL}/api/employee-roles/${editingId}`
          : `${API_BASE_URL}/api/employee-roles/create`;

      const resp = await authFetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      fetchRoles(filterInstitutionId || undefined);
      // If we just created a new role, keep the form open so the user
      // can create more roles; clear fields for a fresh entry.
      if (mode === "create") {
        setForm(EMPTY_FORM);
        setMode("create");
        setEditingId(null);
        setError(null);
        // formOpen remains true
      } else {
        // After editing, close the form
        resetForm();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const resp = await authFetch(`${API_BASE_URL}/api/employee-roles/${id}`, {
        method: "DELETE",
      });
      if (resp.ok) {
        setDeleteConfirmId(null);
        fetchRoles(filterInstitutionId || undefined);
      }
    } catch {
      // silently ignore
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
  const labelCls = "block text-sm font-medium text-slate-700";

  return (
    <div className="space-y-4">
      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete Role?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── List ─────────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">Employee Roles</h2>
            <button
              type="button"
              onClick={() => { resetForm(); setFormOpen(true); }}
              disabled={formOpen}
              aria-expanded={formOpen}
              className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition ${formOpen ? 'bg-slate-300 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Plus size={16} /> Create Role
            </button>
            {role !== "collegeAdmin" && (
              <select
                value={filterInstitutionId}
                onChange={(e) => setFilterInstitutionId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All institutions</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.institutionName}
                  </option>
                ))}
              </select>
            )}
          </div>

          {roles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-400">
              No roles found. Create one using the form.
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map((role, idx) => (
                <article
                  key={role.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-xs font-bold text-white">
                      {role.rolePrefix}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{role.role}</p>
                      <p className="text-xs text-slate-500">
                        {role.staffType} &middot; ID: {role.roleId} &middot; Count: {role.roleCount}
                      </p>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === role.id ? null : role.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Open actions"
                      >
                        <EllipsisVertical size={15} />
                      </button>
                      {openMenuId === role.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                          {/* If this is the last item, render the menu above to avoid viewport clipping */}
                          <div className={`absolute right-0 z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg ${idx === roles.length - 1 ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                            <button
                              type="button"
                              onClick={() => { startEdit(role); setOpenMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              <PencilLine size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDeleteConfirmId(role.id); setOpenMenuId(null); }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        {formOpen && (
        <div
          ref={formRef}
          className="w-full shrink-0 border-t border-slate-200 pt-4 lg:sticky lg:top-6 lg:w-[280px] lg:self-start lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0"
        >
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-800">
              {mode === "create" ? "Create Role" : "Edit Role"}
            </h3>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={labelCls}>
                Institution <span className="text-rose-500">*</span>
              </label>
              {role !== "collegeAdmin" && (
                <select
                  name="institutionId"
                  value={form.institutionId}
                  onChange={handleChange}
                  required
                  disabled={mode === "edit"}
                  className={`${inputCls} disabled:cursor-not-allowed disabled:bg-slate-100`}
                >
                  <option value="">Select institution</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.institutionName} ({i.institutionCode})
                    </option>
                  ))}
                </select>
              )}
              {role === "collegeAdmin" && institutions.length > 0 && (
                <input
                  type="text"
                  value={`${institutions[0].institutionName} (${institutions[0].institutionCode})`}
                  readOnly
                  className={`${inputCls} cursor-not-allowed bg-slate-100`}
                />
              )}
            </div>

            <div>
              <label className={labelCls}>
                Role ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="roleId"
                value={form.roleId}
                onChange={handleChange}
                placeholder="e.g., ROLE_COUNSELLOR"
                required
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                Role Name <span className="text-rose-500">*</span>
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                required
                className={inputCls}
              >
                <option value="">Select role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Staff Type <span className="text-rose-500">*</span>
              </label>
              <select
                name="staffType"
                value={form.staffType}
                onChange={handleChange}
                required
                className={inputCls}
              >
                <option value="">Select staff type</option>
                {STAFF_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Role Prefix <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="rolePrefix"
                value={form.rolePrefix}
                onChange={handleChange}
                placeholder="e.g., AUNAC"
                required
                maxLength={10}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-400">Used for Employee ID generation (auto-uppercased).</p>
            </div>

            <div>
              <label className={labelCls}>
                Role Count <span className="text-rose-500">*</span>
              </label>

              <input
                type="number"
                name="roleCount"
                value={form.roleCount}
                onChange={handleChange}
                placeholder="e.g., 5"
                required
                min={0}
                className={inputCls}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {mode === "create" ? <Plus size={15} /> : <PencilLine size={15} />}
                {mode === "create" ? "Create" : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
        )}
      </div>
    </div>
  );
}
