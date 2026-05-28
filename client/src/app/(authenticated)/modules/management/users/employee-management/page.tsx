"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, EllipsisVertical, Search, Trash2 } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

type Institution = { id: string; institutionName: string; institutionCode: string };

type EmployeeRow = {
  id?: string;
  empId?: string;
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  designation?: string;
  role?: string;
  email?: string;
  mobileNo?: string;
  phone?: string;
  institutionId?: string;
  institutionName?: string;
  institutionCode?: string;
  isActive?: boolean;
  status?: string;
  /** Registry-assigned model key (e.g. "AdmissionCounsellor") — echoed back in edit/update requests. */
  employeeModel?: string;
  /** Human-readable role label returned by the backend. */
  roleName?: string;
  /** PostgreSQL table name (@@map value) for this employee's model. */
  tableName?: string;
};

export default function EmployeeManagementPage() {
  const role = useRole();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filterInstitutionId, setFilterInstitutionId] = useState("");

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (role === "collegeAdmin") {
      fetch(`${API_BASE_URL}/api/institutions/current`, { credentials: "include" })
        .then((r) => r.json())
        .then((d: { institution?: Institution }) => {
          if (d.institution) {
            setInstitutions([d.institution]);
            setFilterInstitutionId(d.institution.id);
          }
        })
        .catch(() => {});
    } else {
      fetch(`${API_BASE_URL}/api/institutions`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setInstitutions(d.institutions ?? []))
        .catch(() => {});
    }
  }, [role]);

  useEffect(() => {
    const loadEmployees = async () => {
      setLoading(true);
      setError("");
      try {
        const url = filterInstitutionId
          ? `${API_BASE_URL}/api/employees/all/${encodeURIComponent(filterInstitutionId)}`
          : `${API_BASE_URL}/api/employees/all`;

        const resp = await fetch(url, { credentials: "include" });
        const data = (await resp.json().catch(() => ({}))) as
          | { success?: boolean; employees?: EmployeeRow[]; data?: EmployeeRow[]; message?: string }
          | EmployeeRow[];

        if (!resp.ok) {
          const msg = Array.isArray(data)
            ? "Unable to load employees."
            : (data as { message?: string }).message || "Unable to load employees.";
          setError(msg);
          setEmployees([]);
          return;
        }

        const list = Array.isArray(data)
          ? data
          : (data as { employees?: EmployeeRow[] }).employees ??
            (data as { data?: EmployeeRow[] }).data ??
            [];
        setEmployees(Array.isArray(list) ? list : []);
      } catch {
        setError("Unable to load employees. Please try again.");
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [filterInstitutionId]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((emp) => {
      const name = (emp.fullName || `${emp.firstName ?? ""} ${emp.lastName ?? ""}`)
        .trim()
        .toLowerCase();
      const empId = (emp.empId || emp.employeeId || emp.id || "").toLowerCase();
      const designation = (emp.designation || emp.role || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      return (
        name.includes(q) ||
        empId.includes(q) ||
        designation.includes(q) ||
        email.includes(q)
      );
    });
  }, [employees, searchQuery]);

  const getEmpKey = (emp: EmployeeRow) =>
    emp.empId || emp.employeeId || emp.id || emp.email || emp.mobileNo || "";

  const handleStatusUpdate = async (emp: EmployeeRow, isActive: boolean) => {
    const empId = emp.empId || emp.employeeId || "";
    const designation = emp.designation || emp.role || "";
    const key = getEmpKey(emp);
    if (!empId || !designation) {
      setError("Employee ID or designation missing for this record.");
      return;
    }
    setActionLoadingId(key);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/api/employees/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ empId, designation, isActive }),
      });
      const data = (await resp.json().catch(() => null)) as { message?: string } | null;
      if (!resp.ok) {
        setError(data?.message || "Unable to update employee status.");
        return;
      }
      setEmployees((prev) =>
        prev.map((row) =>
          getEmpKey(row) === key ? { ...row, isActive } : row
        )
      );
    } catch {
      setError("Unable to update employee status. Please try again.");
    } finally {
      setActionLoadingId(null);
      setOpenMenuId(null);
    }
  };

  const handleDelete = async (emp: EmployeeRow) => {
    const empId = emp.empId || emp.employeeId || "";
    const designation = emp.designation || emp.role || "";
    const key = getEmpKey(emp);
    if (!empId || !designation) {
      setError("Employee ID or designation missing for this record.");
      return;
    }
    setActionLoadingId(key);
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/api/employees/dashboard`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ empId, designation }),
      });
      const data = (await resp.json().catch(() => null)) as { message?: string } | null;
      if (!resp.ok) {
        setError(data?.message || "Unable to delete employee.");
        return;
      }
      setEmployees((prev) => prev.filter((row) => getEmpKey(row) !== key));
    } catch {
      setError("Unable to delete employee. Please try again.");
    } finally {
      setActionLoadingId(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, designation, email"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {role !== "collegeAdmin" && (
          <select
            value={filterInstitutionId}
            onChange={(e) => setFilterInstitutionId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.institutionName} ({inst.institutionCode})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Employee ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Designation</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Mobile</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Institution</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 text-center font-medium text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-500" colSpan={8}>
                  Loading employees...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={8}>
                  No employees found.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const name = (emp.fullName || `${emp.firstName ?? ""} ${emp.lastName ?? ""}`)
                  .trim();
                const empId = emp.empId || emp.employeeId || emp.id || "-";
                const designation = emp.designation || emp.role || "-";
                const mobile = emp.mobileNo || emp.phone || "-";
                const key = getEmpKey(emp);
                const status =
                  typeof emp.isActive === "boolean"
                    ? emp.isActive
                      ? "Active"
                      : "Inactive"
                    : emp.status || "-";

                return (
                  <tr key={emp.id || emp.empId || emp.email || emp.mobileNo || empId}>
                    <td className="px-4 py-3 text-slate-700">{name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{empId}</td>
                    <td className="px-4 py-3 text-slate-600">{designation}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{mobile}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.institutionName || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                          status === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "Inactive"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-flex">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const el = e.currentTarget as HTMLElement;
                            const rect = el.getBoundingClientRect();
                            setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                            setOpenMenuId(openMenuId === key ? null : key);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Open actions"
                        >
                          <EllipsisVertical size={16} />
                        </button>

                        {openMenuId === key && menuPos && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div
                              style={{
                                position: "fixed",
                                left: Math.max(
                                  Math.min(menuPos.x + menuPos.w - 176, window.innerWidth - 192),
                                  8
                                ),
                                top: menuPos.y + menuPos.h + 6,
                              }}
                              className="z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                            >
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(emp, true)}
                                disabled={actionLoadingId === key}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <CheckCircle2 size={14} /> Enable
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(emp, false)}
                                disabled={actionLoadingId === key}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Ban size={14} /> Disable
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(emp)}
                                disabled={actionLoadingId === key}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
