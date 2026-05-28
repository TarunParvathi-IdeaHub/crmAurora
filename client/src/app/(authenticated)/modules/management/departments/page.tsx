"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  EllipsisVertical,
  PencilLine,
  Plus,
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/lib/hooks/useRole";

type Mode = "create" | "edit";

type Institution = {
  id: string;
  institutionName: string;
  institutionCode: string;
  isActive: boolean;
};

type SchoolRecord = {
  id: string;
  schoolName: string;
  schoolCode: string;
  institutionId: string;
};

type Department = {
  id: string;
  institutionId: string;
  institutionName: string;
  schoolId: string;
  schoolName: string;
  departmentCode: string;
  departmentName: string;
  phone: string;
  email: string;
  isActive: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const emailDomains = ["@gmail.com", "@aurora.edu.in", "@yahoo.com"] as const;

const fieldValidationMessages = {
  departmentCode: "Department code can contain only letters.",
  departmentName: "Department name can contain only letters and spaces.",
  email: "Email can contain only letters, numbers, dots, and @.",
} as const;

const fieldSanitizers = {
  institutionId: (value: string) => value,
  schoolId: (value: string) => value,
  departmentCode: (value: string) => value.replace(/[^A-Za-z\s]/g, ""),
  departmentName: (value: string) => value.replace(/[^A-Za-z\s]/g, ""),
  phone: (value: string) => value.replace(/\D/g, "").slice(0, 10),
  email: (value: string) => value.replace(/[^A-Za-z0-9.@]/g, ""),
  isActive: (value: string) => value,
} as const;

const fieldValidators = {
  departmentCode: /^[A-Za-z\s]+$/,
  departmentName: /^[A-Za-z\s]+$/,
  email: /^[A-Za-z0-9.]+@[A-Za-z0-9.]+\.[A-Za-z]{2,}$/, 
} as const;

const emptyForm = {
  institutionId: "",
  schoolId: "",
  departmentCode: "",
  departmentName: "",
  phone: "",
  email: "",
  isActive: true,
};

export default function ManagementDepartmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useRole();
  const initialAction = searchParams?.get("action");
  const [mode, setMode] = useState<Mode>(initialAction === "edit" ? "edit" : "create");
  const [formOpen, setFormOpen] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [schoolsForForm, setSchoolsForForm] = useState<SchoolRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInstitutionId, setFilterInstitutionId] = useState("");

  const selectedDepartment = useMemo(
    () => departments.find((department) => department.id === selectedId) ?? null,
    [departments, selectedId]
  );

  const filteredDepartments = useMemo(() => {
    let result = departments;
    if (filterInstitutionId) {
      result = result.filter((d) => d.institutionId === filterInstitutionId);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (d) =>
          d.departmentName.toLowerCase().includes(q) ||
          d.departmentCode.toLowerCase().includes(q) ||
          d.institutionName.toLowerCase().includes(q) ||
          d.schoolName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [departments, searchQuery, filterInstitutionId]);

  // Load institutions from API
  useEffect(() => {
    const load = async () => {
      if (role === "collegeAdmin") {
        try {
          const resp = await fetch(`${API_BASE_URL}/api/institutions/current`, { credentials: "include" });
          if (!resp.ok) return;
          const data = await resp.json() as { institution: Institution & { code?: string } };
          if (data.institution) {
            setInstitutions([
              {
                ...data.institution,
                institutionCode: data.institution.institutionCode ?? data.institution.code ?? "",
                isActive: true,
              },
            ]);
            setFilterInstitutionId(data.institution.id);
          }
        } catch {
          // silent
        }
      } else {
        try {
          const resp = await fetch(`${API_BASE_URL}/api/institutions`, { credentials: "include" });
          if (!resp.ok) return;
          const data = await resp.json() as { institutions: (Institution & { code?: string; isActive?: boolean })[] };
          setInstitutions(
            (data.institutions ?? []).map((i) => ({
              ...i,
              institutionCode: i.institutionCode ?? i.code ?? "",
              isActive: i.isActive ?? true,
            }))
          );
        } catch {
          // silent
        }
      }
    };
    load();
  }, [role]);

  // Auto-fill institution for College Admin whenever form is reset
  useEffect(() => {
    if (role === "collegeAdmin" && institutions.length > 0 && formData.institutionId === "") {
      setFormData((prev) => ({ ...prev, institutionId: institutions[0].id }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, institutions, formData.institutionId]);

  // Dynamically load schools when institution changes in the form
  useEffect(() => {
    if (!formData.institutionId) {
      setSchoolsForForm([]);
      return;
    }
    const load = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/schools/by-institution/${formData.institutionId}`, { credentials: "include" });
        if (!resp.ok) return;
        const data = await resp.json() as { schools: { id: string; schoolCode: string; name: string; institutionId: string }[] };
        setSchoolsForForm(
          (data.schools ?? []).map((s) => ({
            id: s.id,
            schoolName: s.name,
            schoolCode: s.schoolCode,
            institutionId: s.institutionId,
          }))
        );
      } catch {
        // silent
      }
    };
    load();
  }, [formData.institutionId]);

  // Load departments from API
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/departments`, { credentials: "include" });
        if (!resp.ok) return;
        const data = await resp.json() as {
          departments: {
            id: string;
            institutionId: string;
            schoolId: string | null;
            departmentCode: string;
            departmentName?: string;
            phone?: string;
            email?: string;
            name?: string;
            institution?: { institutionName: string; institutionCode: string };
            school?: { name: string; schoolCode: string } | null;
          }[];
        };
        const mapped: Department[] = (data.departments ?? []).map((d) => ({
          id: d.id,
          departmentCode: d.departmentCode,
          departmentName: d.departmentName ?? d.name ?? "",
          schoolId: d.schoolId ?? "",
          schoolName: d.school?.name ?? "",
          institutionId: d.institutionId,
          institutionName: d.institution?.institutionName ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
          isActive: (d as { isActive?: boolean }).isActive ?? true,
        }));
        setDepartments(mapped);
        if (mapped.length > 0) setSelectedId(mapped[0].id);
      } catch {
        // silent
      }
    };
    load();
  }, []);

  useEffect(() => {
    const action = searchParams?.get("action");
    const nextMode: Mode = action === "edit" && departments.length > 0 ? "edit" : "create";
    setMode(nextMode);
    if (nextMode === "edit") {
      setSelectedId((cur) => cur || departments[0]?.id || "");
    } else if (departments.length === 0) {
      setSelectedId("");
    }
  }, [departments, searchParams]);

  useEffect(() => {
    if (mode === "create") {
      setFormData(emptyForm);
      return;
    }
    if (selectedDepartment) {
      setFormData({
        institutionId: selectedDepartment.institutionId,
        schoolId: selectedDepartment.schoolId,
        departmentCode: selectedDepartment.departmentCode,
        departmentName: selectedDepartment.departmentName,
        phone: selectedDepartment.phone,
        email: selectedDepartment.email,
        isActive: selectedDepartment.isActive,
      });
    }
  }, [mode, selectedDepartment]);

  useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedId(departments[0].id);
    }
  }, [departments, selectedDepartment]);



  const updateUrlMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFormOpen(true);
    router.replace(`${pathname}?action=${nextMode}`);
    setOpenMenuId(null);
  };

  const startEditDepartment = (department: Department) => {
    setSelectedId(department.id);
    setMode("edit");
    setFormOpen(true);
    router.replace(`${pathname}?action=edit`);
    setFormData({
      institutionId: department.institutionId,
      schoolId: department.schoolId,
      departmentCode: department.departmentCode,
      departmentName: department.departmentName,
      phone: department.phone,
      email: department.email,
      isActive: department.isActive,
    });
    setOpenMenuId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof typeof emptyForm;
    const nextValue = fieldSanitizers[fieldName](value);
    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (name === "institutionId") next.schoolId = "";
      return next;
    });
  };

  const applyEmailDomain = (domain: (typeof emailDomains)[number]) => {
    const localPart = formData.email.split("@")[0].trim();
    if (!localPart) return;
    setFormData((prev) => ({
      ...prev,
      email: `${localPart}${domain}`,
    }));
  };

  const emailLocalPart = formData.email.split("@")[0].trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationOrder: Array<keyof typeof fieldValidators> = ["departmentCode", "departmentName", "email"];
    for (const fieldName of validationOrder) {
      const value = formData[fieldName].trim();
      if (!value || !fieldValidators[fieldName].test(value)) {
        setError(fieldValidationMessages[fieldName]);
        return;
      }
    }

    const institution = institutions.find((i) => i.id === formData.institutionId);
    const school = schoolsForForm.find((s) => s.id === formData.schoolId);

    const payload = {
      departmentCode: formData.departmentCode.trim(),
      name: formData.departmentName.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      institutionId: formData.institutionId,
      schoolId: formData.schoolId,
    };

    if (!payload.departmentCode || !payload.name || !payload.institutionId || !payload.phone || !payload.email) {
      setError("Please fill all required fields.");
      return;
    }

    if (mode === "create") {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/departments/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await resp.json().catch(() => null) as { error?: string; department?: { id: string; departmentCode: string; departmentName?: string; name?: string; schoolId?: string; phone?: string; phoneNumber?: string; email?: string } | null };
        if (!resp.ok) {
          setError(data?.error ?? "Failed to create department.");
          return;
        }
        const created = data?.department;
        if (created) {
          const createdPhone = created.phone ?? created.phoneNumber ?? payload.phone;
          const newDept: Department = {
            id: created.id,
            departmentCode: created.departmentCode,
            departmentName: created.departmentName ?? created.name ?? "",
            phone: createdPhone,
            email: created.email ?? "",
            schoolId: created.schoolId ?? payload.schoolId ?? "",
            schoolName: school?.schoolName ?? "",
            institutionId: payload.institutionId,
            institutionName: institution?.institutionName ?? "",
            isActive: true,
          };
          setDepartments((prev) => [newDept, ...prev]);
          setSelectedId(newDept.id);
          setMode("edit");
          setFormOpen(false);
          router.replace(`${pathname}?action=edit`);
          setFormData(emptyForm);
        }
      } catch {
        setError("Unable to connect to server. Please try again.");
      }
      return;
    }

    if (!selectedDepartment) {
      setError("Please select a department to update.");
      return;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/api/departments/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: selectedDepartment.id, ...payload, isActive: formData.isActive }),
      });
      const data = await resp.json().catch(() => null) as { error?: string; department?: { id: string; departmentCode: string; departmentName?: string; name?: string; schoolId?: string; phone?: string; phoneNumber?: string; email?: string; isActive?: boolean } };
      if (!resp.ok) {
        setError(data?.error ?? "Failed to update department.");
        return;
      }
      const updatedDepartment = data?.department;
      const updatedPhone = updatedDepartment?.phone ?? updatedDepartment?.phoneNumber ?? payload.phone;

      setDepartments((prev) =>
        prev.map((d) =>
          d.id === selectedDepartment.id
            ? {
                ...d,
                departmentCode: updatedDepartment?.departmentCode ?? payload.departmentCode,
                departmentName: updatedDepartment?.departmentName ?? updatedDepartment?.name ?? payload.name,
                phone: updatedPhone,
                email: updatedDepartment?.email ?? payload.email,
                schoolId: formData.schoolId || "",
                schoolName: school?.schoolName ?? d.schoolName,
                institutionId: payload.institutionId,
                institutionName: institution?.institutionName ?? d.institutionName,
                isActive: updatedDepartment?.isActive ?? d.isActive,
              }
            : d
        )
      );
      setFormOpen(false);
      setFormData(emptyForm);
    } catch {
      setError("Unable to connect to server. Please try again.");
    }
  };

  const handleDelete = async (departmentId: string) => {
    setError("");
    try {
      const resp = await fetch(`${API_BASE_URL}/api/departments/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: departmentId }),
      });
      const data = await resp.json().catch(() => null) as { error?: string };
      if (!resp.ok) {
        setError(data?.error ?? "Failed to delete department.");
        setDeleteConfirmId(null);
        return;
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
      setDeleteConfirmId(null);
      return;
    }

    setDepartments((prev) => {
      const next = prev.filter((d) => d.id !== departmentId);
      if (selectedId === departmentId) {
        const nextSelected = next[0];
        setSelectedId(nextSelected?.id ?? "");
        if (nextSelected) {
          setMode("edit");
          setFormData({
            institutionId: nextSelected.institutionId,
            schoolId: nextSelected.schoolId,
            departmentCode: nextSelected.departmentCode,
            departmentName: nextSelected.departmentName,
            phone: nextSelected.phone,
            email: nextSelected.email,
            isActive: nextSelected.isActive,
          });
        } else {
          setMode("create");
          setFormData(emptyForm);
          router.replace(pathname);
        }
      }
      return next;
    });

    setDeleteConfirmId(null);
    setOpenMenuId(null);
  };

  return (
    <div className="px-1">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 size={24} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete Department?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-900">
                {departments.find((d) => d.id === deleteConfirmId)?.departmentName}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="border-b border-slate-200 pb-3">
          {/* Badge + Title + Create Button */}
          <div className="flex items-center justify-between gap-4">
            <div>
              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              ) : null}
            </div>
            <div className="relative min-w-[200px] flex-1" style={{ marginLeft: "-15px" }}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, code, school, institution…" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            {role !== "collegeAdmin" && (
              <select value={filterInstitutionId} onChange={(e) => setFilterInstitutionId(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">All Institutes</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.institutionName}</option>
                ))}
              </select>
            )}

            <div className="shrink-0">
              <button type="button" onClick={() => updateUrlMode("create")} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                <Plus size={16} />
                Create Department
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-5 overflow-visible pt-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Departments</h2>
                <p className="text-sm text-slate-500">Edit or delete records from the three-dot action menu.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {departments.length} records
              </span>
            </div>

            <div className="mt-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pb-2 pr-1">
              {departments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No departments yet. Use <span className="font-medium text-slate-700">Create Department</span> to add the first one.
                </div>
              ) : filteredDepartments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No results match your search.
                </div>
              ) : null}

              {filteredDepartments.map((department, index) => {
                const isLastDepartment = index === filteredDepartments.length - 1;
                const isSelected = department.id === selectedId;
                const isMenuOpen = openMenuId === department.id;

                return (
                  <article
                    key={department.id}
                    className={`w-full rounded-2xl border p-4 transition ${
                      isSelected
                        ? "border-blue-200 bg-blue-50/80 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h3 className="break-words text-sm font-semibold text-slate-900">
                            {department.departmentName} ({department.departmentCode})
                          </h3>
                          {department.isActive ? (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Active</span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inactive</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          <b>{department.institutionName}, {department.schoolName}</b>
                        </p>
                        <p className="truncate text-xs text-slate-400">{department.phone}, {department.email}</p>
                      </div>
                        <div className="relative shrink-0 overflow-visible">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const el = event.currentTarget as HTMLElement;
                            const rect = el.getBoundingClientRect();
                            setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                            setOpenMenuId(openMenuId === department.id ? null : department.id);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Open actions"
                        >
                          <EllipsisVertical size={15} />
                        </button>
                        {openMenuId === department.id && menuPos && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div style={{ position: "fixed", left: Math.max(Math.min(menuPos.x + menuPos.w - 144 - 8, window.innerWidth - 160), 8), top: (isLastDepartment ? menuPos.y - 78 : menuPos.y + menuPos.h + 6) }} className={`z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg`}>
                              <button type="button" onClick={() => { startEditDepartment(department); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                <PencilLine size={14} /> Edit
                              </button>
                              <button type="button" onClick={() => { setDeleteConfirmId(department.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50">
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {formOpen && (
          <div className="w-[280px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {mode === "create" ? "Create Department" : "Edit Department"}
                </h3>
              </div>
              {mode === "edit" && selectedDepartment ? (
                <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  <ChevronRight size={14} />
                  <span className="truncate">{selectedDepartment.departmentCode}</span>
                </span>
              ) : null}
            </div>

            {institutions.length === 0 ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Create at least one institution first from <span className="font-semibold">Institute Management</span>.
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Institution <span className="text-rose-500">*</span>
                </label>
                {role === "collegeAdmin" ? (
                  <input
                    type="text"
                    value={institutions[0]?.institutionName ?? ""}
                    readOnly
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 cursor-not-allowed"
                  />
                ) : (
                  <select
                    name="institutionId"
                    value={formData.institutionId}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select an institution</option>
                    {institutions.filter((i) => i.isActive || (mode === "edit" && formData.institutionId === i.id)).map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.institutionName} ({inst.institutionCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">School <span className="text-slate-400 text-xs font-normal">(optional)</span></label>
                <select
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  disabled={!formData.institutionId}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {formData.institutionId ? "No school (optional)" : "Select institution first"}
                  </option>
                  {schoolsForForm.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.schoolName} ({s.schoolCode})
                    </option>
                  ))}
                </select>
                {formData.institutionId && schoolsForForm.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    No schools found for this institution. Department will be created without a school.
                  </p>
                )}
              </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Department Code <span className="text-rose-500"></span></label>
                  <input
                    type="text"
                    name="departmentCode"
                    value={formData.departmentCode}
                    onChange={handleInputChange}
                    placeholder="e.g., CSE"
                    required
                    maxLength={60}
                    pattern="[A-Za-z\s]+"
                    title={fieldValidationMessages.departmentCode}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Department Name <span className="text-rose-500"></span></label>
                  <input
                    type="text"
                    name="departmentName"
                    value={formData.departmentName}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science"
                    required
                    maxLength={120}
                    pattern="[A-Za-z\s]+"
                    title={fieldValidationMessages.departmentName}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Phone No.</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g., 9188888888"
                    required
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="text"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g., department@example.com"
                    required
                    maxLength={100}
                    pattern="[A-Za-z0-9.]+@[A-Za-z0-9.]+\.[A-Za-z]{2,}"
                    title={fieldValidationMessages.email}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {emailLocalPart && !formData.email.includes("@") ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {emailDomains.map((domain) => (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => applyEmailDomain(domain)}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 transition hover:border-blue-200 hover:bg-blue-50"
                        >
                          {domain}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {/* Active toggle – only in edit mode */}
{mode === "edit" && (
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium text-slate-700">
      Status
    </label>

    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">
        {formData.isActive ? "Active" : "Inactive"}
      </span>

      <button
        type="button"
        onClick={() =>
          setFormData((prev) => ({
            ...prev,
            isActive: !prev.isActive,
          }))
        }
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          formData.isActive ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            formData.isActive ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  </div>
)}

                <button
                  type="submit"
                  disabled={institutions.length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {mode === "create" ? <Plus size={16} /> : <PencilLine size={16} />}
                  {mode === "create" ? "Create" : "Save Changes"}
                </button>
                <button type="button" onClick={() => { setFormOpen(false); setFormData(emptyForm); setError(""); }} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
          )}
        </div>
      </section>

    </div>
  );
}
