"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  BookOpen,
  EllipsisVertical,
  GraduationCap,
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
  phoneNumber: string;
  email: string;
  isActive: boolean;
};

type DegreeLevel = {
  id: string;
  levelName: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const emptyForm = {
  institutionId: "",
  levelName: "",
  isActive: true,
};

export default function StudyLevelManagementPage() {
  const role = useRole();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [studyLevels, setStudyLevels] = useState<DegreeLevel[]>([]);
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

  const filteredStudyLevels = useMemo(() => {
    let result = studyLevels;
    if (filterInstitutionId) {
      result = result.filter((sl) => sl.institutionId === filterInstitutionId);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (sl) =>
          sl.levelName.toLowerCase().includes(q) ||
          sl.institutionName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [studyLevels, searchQuery, filterInstitutionId]);

  useEffect(() => {
    const loadInstitutions = async () => {
      if (role === "collegeAdmin") {
        try {
          const response = await authFetch(`${API_BASE_URL}/api/institutions/current`);
          if (!response.ok) return;
          const data = await response.json() as { institution: Institution };
          if (data.institution) {
            setInstitutions([data.institution]);
            setFilterInstitutionId(data.institution.id);
          }
        } catch {
          // silent
        }
      } else {
        try {
          const response = await authFetch(`${API_BASE_URL}/api/institutions`);
          if (!response.ok) return;
          const data = await response.json() as { institutions: Institution[] };
          setInstitutions(data.institutions ?? []);
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

  useEffect(() => {
    const loadDegreeLevels = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/degree-levels`);
        if (!response.ok) {
          console.error('Failed to fetch study levels:', response.status, response.statusText);
          return;
        }
        const data = await response.json() as { degreeLevels: { id: string; levelName: string; institutionId: string; isActive?: boolean; institution?: { institutionName: string; institutionCode: string; phoneNumber?: string; email?: string } }[] };
        console.log('Fetched study levels:', data.degreeLevels?.length ?? 0);
        const levels: DegreeLevel[] = (data.degreeLevels ?? []).map((dl) => ({
          id: dl.id,
          levelName: dl.levelName,
          institutionId: dl.institutionId,
          isActive: (dl as { isActive?: boolean }).isActive ?? true,
          institutionName: dl.institution?.institutionName ?? institutions.find((i) => i.id === dl.institutionId)?.institutionName ?? "",
          institutionCode: dl.institution?.institutionCode ?? institutions.find((i) => i.id === dl.institutionId)?.institutionCode ?? "",
          phoneNumber: dl.institution?.phoneNumber ?? institutions.find((i) => i.id === dl.institutionId)?.phoneNumber ?? "",
          email: dl.institution?.email ?? institutions.find((i) => i.id === dl.institutionId)?.email ?? "",
        }));
        setStudyLevels(levels);
      } catch (error) {
        console.error('Error fetching study levels:', error);
      }
    };
    loadDegreeLevels();
  }, [institutions]);



  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setFormOpen(false);
    setError("");
  };

  const handleEdit = (dl: DegreeLevel) => {
    setEditingId(dl.id);
    setFormData({ institutionId: dl.institutionId, levelName: dl.levelName, isActive: dl.isActive });
    setFormOpen(true);
    setOpenMenuId(null);
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const institution = institutions.find((i) => i.id === formData.institutionId);

    try {
      if (editingId) {
        const response = await authFetch(`${API_BASE_URL}/api/degree-levels/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            levelName: formData.levelName.trim(),
            institutionId: formData.institutionId,
            isActive: formData.isActive,
          }),
        });
        const data = await response.json().catch(() => null) as { error?: string; degreeLevel?: { id: string; levelName: string; institutionId: string; isActive?: boolean; institution?: { institutionName: string; institutionCode: string; phoneNumber?: string; email?: string } } };
        if (!response.ok) {
          setError(data?.error ?? "Failed to update degree level.");
          return;
        }
        const updatedLevel = data?.degreeLevel;
        setStudyLevels((prev) =>
          prev.map((sl) =>
            sl.id === editingId
              ? {
                  ...sl,
                  levelName: updatedLevel?.levelName ?? formData.levelName.trim(),
                  institutionId: updatedLevel?.institutionId ?? formData.institutionId,
                  isActive: updatedLevel?.isActive ?? formData.isActive,
                  institutionName: updatedLevel?.institution?.institutionName ?? institution?.institutionName ?? sl.institutionName,
                  institutionCode: updatedLevel?.institution?.institutionCode ?? institution?.institutionCode ?? sl.institutionCode,
                  phoneNumber: updatedLevel?.institution?.phoneNumber ?? institution?.phoneNumber ?? sl.phoneNumber,
                  email: updatedLevel?.institution?.email ?? institution?.email ?? sl.email,
                }
              : sl
          )
        );
        resetForm(); // closes form
      } else {
        const response = await authFetch(`${API_BASE_URL}/api/degree-levels/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            levelName: formData.levelName.trim(),
            institutionId: formData.institutionId,
          }),
        });
        const data = await response.json().catch(() => null) as { error?: string; degreeLevel?: { id: string; levelName: string; institutionId: string; isActive?: boolean; institution?: { institutionName: string; institutionCode: string; phoneNumber?: string; email?: string } } };
        if (!response.ok) {
          setError(data?.error ?? "Failed to create degree level.");
          return;
        }
        const created = data?.degreeLevel;
        if (created) {
          setStudyLevels((prev) => [
            ...prev,
            {
              id: created.id,
              levelName: created.levelName,
              institutionId: created.institutionId,
              isActive: created.isActive ?? true,
              institutionName: created.institution?.institutionName ?? institution?.institutionName ?? "",
              institutionCode: created.institution?.institutionCode ?? institution?.institutionCode ?? "",
              phoneNumber: created.institution?.phoneNumber ?? institution?.phoneNumber ?? "",
              email: created.institution?.email ?? institution?.email ?? "",
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
      const response = await authFetch(`${API_BASE_URL}/api/degree-levels/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json().catch(() => null) as { error?: string };
      if (!response.ok) {
        setError(data?.error ?? "Failed to delete degree level.");
        return;
      }
      setStudyLevels((prev) => prev.filter((sl) => sl.id !== id));
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
            <h3 className="text-lg font-semibold text-slate-900">Delete Degree Level?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-900">
                {studyLevels.find((sl) => sl.id === deleteConfirmId)?.levelName}
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
          {/* Badge + Title + Description + Create Button */}
          <div className="flex items-center justify-between gap-4">
            <div>
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
              )}
            </div>
            <div className="relative min-w-[200px] flex-1" style={{ marginLeft: "-15px" }}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by level name, institution…" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            {role !== "collegeAdmin" && (
              <select value={filterInstitutionId} onChange={(e) => setFilterInstitutionId(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
                <option value="">All Institutes</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.institutionName} ({inst.institutionCode})</option>
                ))}
              </select>
            )}
            <div className="shrink-0">
            <button type="button" onClick={() => { setFormData(emptyForm); setEditingId(null); setError(""); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                <Plus size={16} />
                Create Study Level
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-5 overflow-visible pt-4">
          {/* Cards List */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Study Levels</h2>
                <p className="text-sm text-slate-500">Created study levels appear here.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {studyLevels.length} records
              </span>
            </div>

            <div className="mt-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pb-2 pr-1">
              {studyLevels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No Study levels yet. Use the form to add the first one. 
                </div>
              ) : filteredStudyLevels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No results match your search.
                </div>
              ) : (
                filteredStudyLevels.map((sl, index) => {
                  const isLastSL = index === filteredStudyLevels.length - 1;
                  const isMenuOpen = openMenuId === sl.id;
                  const isEditing = editingId === sl.id;

                  return (
                    <article
                      key={sl.id}
                      className={`w-full rounded-2xl border p-4 transition ${
                        isEditing
                          ? "border-blue-200 bg-blue-50/80 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                          <GraduationCap size={16} />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h3 className="break-words text-sm font-semibold text-slate-900">
                              {sl.levelName}
                            </h3>
                            {sl.isActive ? (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Active</span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inactive</span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{sl.institutionName}, {sl.phoneNumber}, {sl.email}</p>
                        </div>
                        <div className="relative shrink-0 overflow-visible">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = e.currentTarget as HTMLElement;
                              const rect = el.getBoundingClientRect();
                              setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                              setOpenMenuId(openMenuId === sl.id ? null : sl.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Open actions"
                          >
                            <EllipsisVertical size={15} />
                          </button>
                          {openMenuId === sl.id && menuPos && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                              <div style={{ position: "fixed", left: Math.max(Math.min(menuPos.x + menuPos.w - 144 - 8, window.innerWidth - 160), 8), top: (isLastSL ? menuPos.y - 78 : menuPos.y + menuPos.h + 6) }} className={`z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg`}>
                                <button type="button" onClick={() => { handleEdit(sl); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                  <PencilLine size={14} /> Edit
                                </button>
                                <button type="button" onClick={() => { setDeleteConfirmId(sl.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50">
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
          <div ref={formRef} className="w-[280px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-800">
                {editingId ? "Edit Study Level" : "Create Study Level"}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
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
                    value={formData.institutionId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, institutionId: e.target.value }))
                    }
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

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Study Level <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.levelName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, levelName: e.target.value }))
                  }
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select study level</option>
                  <option value="Under Graduate (UG)">Under Graduate (UG)</option>
                  <option value="Post Graduate (PG)">Post Graduate (PG)</option>
                  <option value="Doctor Of Philosophy (Phd)">Doctor Of Philosophy (Phd)</option>
                </select>
              </div>

              {/* Active toggle – only in edit mode */}
              {editingId !== null && (
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
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
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
