"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  BookOpen,
  EllipsisVertical,
  PencilLine,
  Plus,
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { authFetch } from "@/lib/utils/authFetch";

type Institution = {
  id: string;
  institutionName: string;
  institutionCode: string;
  isActive: boolean;
};

type DegreeLevel = {
  id: string;
  levelName: string;
  institutionId: string;
};

type SchoolOption = {
  id: string;
  name: string;
  schoolCode: string;
  institutionId: string;
};

type DepartmentOption = {
  id: string;
  name: string;
  departmentCode: string;
  institutionId: string;
  schoolId: string | null;
};

type Programme = {
  id: string;
  programCode: string;
  programName: string;
  programSname: string;
  institutionId: string;
  levelId: string;
  schoolId: string | null;
  departmentId: string | null;
  institutionName: string;
  levelName: string;
  schoolName: string;
  departmentName: string;
  isActive: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const emptyForm = {
  institutionId: "",
  levelId: "",
  schoolId: "",
  departmentId: "",
  programCode: "",
  programName: "",
  programSname: "",
  isActive: true,
};

const fieldValidationMessages = {
  programCode: "Programme code can contain only letters, numbers, and hyphens.",
  programName: "Programme name can contain only letters, dots and spaces.",
  programSname: "Programme shortcut can contain only letters and dots.",
} as const;

const fieldSanitizers = {
  institutionId: (value: string) => value,
  levelId: (value: string) => value,
  schoolId: (value: string) => value,
  departmentId: (value: string) => value,
  programCode: (value: string) => value.replace(/[^A-Za-z0-9\-]/g, ""),
  programName: (value: string) => value.replace(/[^A-Za-z.\s]/g, ""),
  programSname: (value: string) => value.replace(/[^A-Za-z.\s]/g, ""),
  isActive: (value: string) => value,
} as const;

const fieldValidators = {
  programCode: /^[A-Za-z0-9\-]+$/,
  programName: /^[A-Za-z.\s]+$/,
  programSname: /^[A-Za-z.\s]+$/,
} as const;

export default function ProgrammeManagementPage() {
  const role = useRole();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [levelsForForm, setLevelsForForm] = useState<DegreeLevel[]>([]);
  const [schoolsForForm, setSchoolsForForm] = useState<SchoolOption[]>([]);
  const [departmentsForForm, setDepartmentsForForm] = useState<DepartmentOption[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInstitutionId, setFilterInstitutionId] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const filteredProgrammes = useMemo(() => {
    let result = programmes;
    if (filterInstitutionId) {
      result = result.filter((p) => p.institutionId === filterInstitutionId);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.programName.toLowerCase().includes(q) ||
          p.programCode.toLowerCase().includes(q) ||
          p.programSname.toLowerCase().includes(q) ||
          p.institutionName.toLowerCase().includes(q) ||
          p.levelName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [programmes, searchQuery, filterInstitutionId]);

  // Load institutions once at mount
  useEffect(() => {
    const loadInstitutions = async () => {
      if (role === "collegeAdmin") {
        try {
          const response = await authFetch(`${API_BASE_URL}/api/institutions/current`);
          if (!response.ok) return;
          const data = await response.json() as { institution: Institution };
          if (data.institution) {
            setInstitutions([{ ...data.institution, isActive: true }]);
            setFilterInstitutionId(data.institution.id);
          }
        } catch {
          // silent
        }
      } else {
        try {
          const response = await authFetch(`${API_BASE_URL}/api/institutions`);
          if (!response.ok) return;
          const data = await response.json() as { institutions: (Institution & { isActive?: boolean })[] };
          setInstitutions((data.institutions ?? []).map((i) => ({ ...i, isActive: i.isActive ?? true })));
        } catch {
          // silent
        }
      }
    };
    loadInstitutions();
  }, [role]);

  // Auto-fill institution for College Admin whenever form is reset
  useEffect(() => {
    if (role === "collegeAdmin" && institutions.length > 0 && formData.institutionId === "") {
      setFormData((prev) => ({ ...prev, institutionId: institutions[0].id }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, institutions, formData.institutionId]);

  // Load all programmes once at mount
  useEffect(() => {
    const loadProgrammes = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/programmes`);
        if (!response.ok) return;
        const data = await response.json() as {
          programmes: {
            id: string;
            programCode: string;
            programName: string;
            programSname: string;
            institutionId: string;
            levelId: string;
            schoolId: string | null;
            departmentId: string | null;
            isActive: boolean;
            institution: { institutionName: string };
            level: { levelName: string };
            school?: { name: string } | null;
            department?: { name: string } | null;
          }[];
        };
        const mapped: Programme[] = (data.programmes ?? []).map((p) => ({
          id: p.id,
          programCode: p.programCode,
          programName: p.programName,
          programSname: p.programSname,
          institutionId: p.institutionId,
          levelId: p.levelId,
          schoolId: p.schoolId ?? null,
          departmentId: p.departmentId ?? null,
          institutionName: p.institution?.institutionName ?? "",
          levelName: p.level?.levelName ?? "",
          schoolName: p.school?.name ?? "",
          departmentName: p.department?.name ?? "",
          isActive: p.isActive ?? true,
        }));
        setProgrammes(mapped);
      } catch {
        // silent
      }
    };
    loadProgrammes();
  }, []);

  // Load degree levels when institution selected
  useEffect(() => {
    if (!formData.institutionId) {
      setLevelsForForm([]);
      return;
    }
    const load = async () => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/api/degree-levels/by-institution/${formData.institutionId}`,
        );
        if (!response.ok) return;
        const data = await response.json() as { degreeLevels: DegreeLevel[] };
        setLevelsForForm(data.degreeLevels ?? []);
      } catch {
        // silent
      }
    };
    load();
  }, [formData.institutionId]);

  // Load schools when institution selected
  useEffect(() => {
    if (!formData.institutionId) {
      setSchoolsForForm([]);
      return;
    }
    const load = async () => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/api/schools/by-institution/${formData.institutionId}`,
        );
        if (!response.ok) return;
        const data = await response.json() as { schools: SchoolOption[] };
        setSchoolsForForm(data.schools ?? []);
      } catch {
        // silent
      }
    };
    load();
  }, [formData.institutionId]);

  // Load departments: by school if selected, else by institution
  useEffect(() => {
    if (!formData.institutionId) {
      setDepartmentsForForm([]);
      return;
    }
    const load = async () => {
      try {
        const url = formData.schoolId
          ? `${API_BASE_URL}/api/departments/by-school/${formData.schoolId}`
          : `${API_BASE_URL}/api/departments/by-institution/${formData.institutionId}`;
        const response = await authFetch(url);
        if (!response.ok) return;
        const data = await response.json() as {
          departments: { id: string; departmentCode: string; name: string; institutionId: string; schoolId: string | null }[];
        };
        setDepartmentsForForm(
          (data.departments ?? []).map((d) => ({
            id: d.id,
            name: d.name,
            departmentCode: d.departmentCode,
            institutionId: d.institutionId,
            schoolId: d.schoolId,
          }))
        );
      } catch {
        // silent
      }
    };
    load();
  }, [formData.schoolId, formData.institutionId]);



  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setFormOpen(false);
    setError("");
    setLevelsForForm([]);
    setSchoolsForForm([]);
    setDepartmentsForForm([]);
  };

  const handleEdit = (prog: Programme) => {
    setEditingId(prog.id);
    setFormOpen(true);
    setFormData({
      institutionId: prog.institutionId,
      levelId: prog.levelId,
      schoolId: prog.schoolId ?? "",
      departmentId: prog.departmentId ?? "",
      programCode: prog.programCode,
      programName: prog.programName,
      programSname: prog.programSname,
      isActive: prog.isActive,
    });
    setOpenMenuId(null);
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const fieldName = name as keyof typeof emptyForm;
      const next = { ...prev, [name]: fieldSanitizers[fieldName](value) };
      if (name === "institutionId") {
        next.levelId = "";
        next.schoolId = "";
        next.departmentId = "";
      }
      if (name === "schoolId") {
        next.departmentId = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const normalizedFormData = {
      ...formData,
      programCode: formData.programCode.replace(/\s+/g, ""),
    };

    const validationOrder: Array<keyof typeof fieldValidators> = ["programCode", "programName", "programSname"];
    for (const fieldName of validationOrder) {
      const value = normalizedFormData[fieldName].trim();
      if (!value || !fieldValidators[fieldName].test(value)) {
        setError(fieldValidationMessages[fieldName]);
        setSubmitting(false);
        return;
      }
    }

    const institution = institutions.find((i) => i.id === formData.institutionId);
    const level = levelsForForm.find((dl) => dl.id === formData.levelId);
    const school = schoolsForForm.find((s) => s.id === formData.schoolId);
    const department = departmentsForForm.find((d) => d.id === formData.departmentId);

    try {
      if (editingId) {
        const response = await authFetch(`${API_BASE_URL}/api/programmes/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            programCode: normalizedFormData.programCode.trim(),
            programName: normalizedFormData.programName.trim(),
            programSname: normalizedFormData.programSname.trim(),
            institutionId: formData.institutionId,
            levelId: formData.levelId,
            schoolId: formData.schoolId || null,
            departmentId: formData.departmentId || null,
            isActive: formData.isActive,
          }),
        });
        const data = await response.json().catch(() => null) as { error?: string };
        if (!response.ok) {
          setError(data?.error ?? "Failed to update programme.");
          return;
        }
        setProgrammes((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? {
                  ...p,
                  programCode: formData.programCode.trim(),
                  programName: formData.programName.trim(),
                  programSname: formData.programSname.trim(),
                  institutionId: formData.institutionId,
                  levelId: formData.levelId,
                  schoolId: formData.schoolId || null,
                  departmentId: formData.departmentId || null,
                  institutionName: institution?.institutionName ?? p.institutionName,
                  levelName: level?.levelName ?? p.levelName,
                  schoolName: school?.name ?? (formData.schoolId ? p.schoolName : ""),
                  departmentName: department?.name ?? (formData.departmentId ? p.departmentName : ""),
                  isActive: formData.isActive,
                }
              : p
          )
        );
        resetForm();
      } else {
        const response = await authFetch(`${API_BASE_URL}/api/programmes/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              programCode: normalizedFormData.programCode.trim(),
              programName: normalizedFormData.programName.trim(),
              programSname: normalizedFormData.programSname.trim(),
            institutionId: formData.institutionId,
            levelId: formData.levelId,
            schoolId: formData.schoolId || null,
            departmentId: formData.departmentId || null,
          }),
        });
        const data = await response.json().catch(() => null) as {
          error?: string;
          programme?: {
            id: string;
            programCode: string;
            programName: string;
            programSname: string;
            institutionId: string;
            levelId: string;
            schoolId: string | null;
            departmentId: string | null;
            isActive: boolean;
          };
        };
        if (!response.ok) {
          setError(data?.error ?? "Failed to create programme.");
          return;
        }
        const created = data?.programme;
        if (created) {
          setProgrammes((prev) => [
            ...prev,
            {
              id: created.id,
              programCode: created.programCode,
              programName: created.programName,
              programSname: created.programSname,
              institutionId: created.institutionId,
              levelId: created.levelId,
              schoolId: created.schoolId,
              departmentId: created.departmentId,
              institutionName: institution?.institutionName ?? "",
              levelName: level?.levelName ?? "",
              schoolName: school?.name ?? "",
              departmentName: department?.name ?? "",
              isActive: created.isActive ?? true,
            },
          ]);
        }
        resetForm();
      }
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      const response = await authFetch(`${API_BASE_URL}/api/programmes/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json().catch(() => null) as { error?: string };
      if (!response.ok) {
        setError(data?.error ?? "Failed to delete programme.");
        return;
      }
      setProgrammes((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setError("Unable to delete. Please try again.");
    } finally {
      setDeleteConfirmId(null);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="px-1">
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 size={24} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete Programme?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-900">
                {programmes.find((p) => p.id === deleteConfirmId)?.programName}
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
          {/* Top toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div>
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
              )}
            </div>
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, code, institution, level..." className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            {role !== "collegeAdmin" && (
              <select value={filterInstitutionId} onChange={(e) => setFilterInstitutionId(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">All Institutes</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.institutionName} ({inst.institutionCode})</option>
                ))}
              </select>
            )}
            <div>
               <button
                  type="button"
                  onClick={() => { setEditingId(null); setFormOpen(true); setError(""); }}
                  className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  <Plus size={14} />
                  Create Programme
                </button>
            </div>
          </div>
        </div>

        <div className="flex gap-5 overflow-visible pt-4">
          {/* Cards List */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Programmes</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {programmes.length} records
                </span>
               
              </div>
            </div>

            <div className="mt-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pb-2 pr-1">
              {programmes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No programmes yet. Use the form to add the first one.
                </div>
              ) : filteredProgrammes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No results match your search.
                </div>
              ) : (
                filteredProgrammes.map((prog, index) => {
                  const isLastProg = index === filteredProgrammes.length - 1;
                  const isMenuOpen = openMenuId === prog.id;
                  const isEditing = editingId === prog.id;

                  return (
                    <article
                      key={prog.id}
                      className={`w-full rounded-2xl border p-4 transition ${
                        isEditing
                          ? "border-indigo-200 bg-indigo-50/80 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                          <BookOpen size={16} />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h3 className="break-words text-sm font-semibold text-slate-900">
                              {prog.programName}
                            </h3>
                            {prog.isActive ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">Active</span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {prog.programSname} · {prog.programCode}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {prog.institutionName}
                            {prog.levelName ? ` · ${prog.levelName}` : ""}
                            {prog.schoolName ? ` · ${prog.schoolName}` : ""}
                            {prog.departmentName ? ` · ${prog.departmentName}` : ""}
                          </p>
                        </div>
                        <div className="relative shrink-0 overflow-visible">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = e.currentTarget as HTMLElement;
                              const rect = el.getBoundingClientRect();
                              setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                              setOpenMenuId(openMenuId === prog.id ? null : prog.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Open actions"
                          >
                            <EllipsisVertical size={15} />
                          </button>
                          {openMenuId === prog.id && menuPos && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                              <div style={{ position: "fixed", left: Math.max(Math.min(menuPos.x + menuPos.w - 144 - 8, window.innerWidth - 160), 8), top: (isLastProg ? menuPos.y - 78 : menuPos.y + menuPos.h + 6) }} className={`z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg`}>
                                <button type="button" onClick={() => { handleEdit(prog); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                  <PencilLine size={14} /> Edit
                                </button>
                                <button type="button" onClick={() => { setDeleteConfirmId(prog.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50">
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* Form */}
          {formOpen && (
          <div ref={formRef} className="w-[300px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingId ? "Edit Programme" : "Create Programme"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Step 1: Institution */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Institute <span className="text-rose-500">*</span>
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
                  <option value="">Select an institute</option>
                  {institutions.filter((i) => i.isActive || (editingId !== null && formData.institutionId === i.id)).map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institutionName} ({inst.institutionCode})
                    </option>
                  ))}
                </select>
                )}
              </div>

              {/* Step 2: Degree Level */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Degree Level <span className="text-rose-500">*</span>
                </label>
                <select
                  name="levelId"
                  value={formData.levelId}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.institutionId}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {formData.institutionId ? "Select a degree level" : "Select institute first"}
                  </option>
                  {levelsForForm.map((dl) => (
                    <option key={dl.id} value={dl.id}>
                      {dl.levelName}
                    </option>
                  ))}
                </select>
                {formData.institutionId && levelsForForm.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No degree levels found. Create one in Degree Management first.
                  </p>
                )}
              </div>

              {/* Step 3: School (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  School <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </label>
                <select
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  disabled={!formData.institutionId}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {formData.institutionId ? "No school (optional)" : "Select institute first"}
                  </option>
                  {schoolsForForm.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.schoolCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 4/5: Department (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Department <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </label>
                <select
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleInputChange}
                  disabled={!formData.institutionId}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {formData.institutionId ? "No department (optional)" : "Select institute first"}
                  </option>
                  {departmentsForForm.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.departmentCode})
                    </option>
                  ))}
                </select>
                {formData.institutionId && departmentsForForm.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    No departments found. Programme will be created without a department.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Programme Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="programCode"
                  value={formData.programCode}
                  onChange={handleInputChange}
                  placeholder="e.g., BTECH-CSE"
                  required
                  maxLength={30}
                  title={fieldValidationMessages.programCode}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Programme Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="programName"
                  value={formData.programName}
                  onChange={handleInputChange}
                  placeholder="e.g., Computer Science"
                  required
                  maxLength={120}
                  title={fieldValidationMessages.programName}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Programme Shortcut <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="programSname"
                  value={formData.programSname}
                  onChange={handleInputChange}
                  placeholder="e.g., B.Tech CSE"
                  required
                  maxLength={60}
                  title={fieldValidationMessages.programSname}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Active toggle – only in edit mode */}
              {editingId && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className="inline-flex items-center gap-2 text-sm font-medium"
                  >
                    {formData.isActive ? (
                      <>
                        <ToggleRight size={22} className="text-emerald-500" />
                        <span className="text-emerald-600">Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={22} className="text-slate-400" />
                        <span className="text-slate-500">Inactive</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {editingId ? <PencilLine size={15} /> : <Plus size={15} />}
                  {editingId ? "Update" : "Create"}
                </button>
                <button type="button" onClick={resetForm} className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          </div>
          )}
        </div>
      </section>

    </div>
  );
}
