"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, EllipsisVertical, PencilLine, Plus, School, Search, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useRole } from "@/lib/hooks/useRole";

type SchoolMode = "create" | "edit";

type Institution = {
  id: string;
  institutionName: string;
  institutionCode: string;
  institutionArea: string;
  institutionCity: string;
  institutionState: string;
  isActive: boolean;
};

type SchoolRecord = {
  id: string;
  schoolCode: string;
  schoolName: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  phone: string;
  email: string;
  isActive: boolean;
};

type SchoolFormState = {
  institutionId: string;
  schoolCode: string;
  schoolName: string;
  phone: string;
  email: string;
  isActive: boolean;
};

const institutionsStorageKey = "aurora-management-institutions";
const schoolsStorageKey = "aurora-management-schools";

const emptyForm: SchoolFormState = {
  institutionId: "",
  schoolCode: "",
  schoolName: "",
  phone: "",
  email: "",
  isActive: true,
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const emailDomains = ["@gmail.com", "@aurora.edu.in", "@yahoo.com"] as const;

const fieldValidationMessages = {
  schoolCode: "School code can contain letters, numbers, hyphens, and parentheses.",
  schoolName: "School name can contain only letters and spaces.",
  email: "Email can contain only letters, numbers, dots and a single @.",
} as const;

const fieldSanitizers = {
  institutionId: (value: string) => value,
  schoolCode: (value: string) => value.replace(/[^A-Za-z0-9()\-\s]/g, ""),
  schoolName: (value: string) => value.replace(/[^A-Za-z\s]/g, ""),
  phone: (value: string) => value.replace(/[^0-9\s]/g, "").slice(0, 10),
  email: (value: string) => value.replace(/[^A-Za-z0-9@.\s]/g, ""),
  isActive: (value: string) => value,
} as const;

const fieldValidators = {
  schoolCode: /^[A-Za-z0-9()\-]+$/,
  schoolName: /^[A-Za-z\s]+$/,
  email: /^[A-Za-z0-9.]+@[A-Za-z0-9.]+$/,
} as const;

export default function SchoolManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const role = useRole();

  const [mode, setMode] = useState<SchoolMode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [formData, setFormData] = useState<SchoolFormState>(emptyForm);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterInstitutionId, setFilterInstitutionId] = useState("");
  const [error, setError] = useState("");

  const selectedSchool = useMemo(
    () => schools.find((school) => school.id === selectedId) ?? null,
    [schools, selectedId]
  );

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === formData.institutionId) ?? null,
    [institutions, formData.institutionId]
  );

  const resolvedSelectedInstitution = useMemo(() => {
    if (selectedSchool) {
      return (
        institutions.find((institution) => institution.id === selectedSchool.institutionId) ??
        {
          id: selectedSchool.institutionId,
          institutionName: selectedSchool.institutionName,
          institutionCode: selectedSchool.institutionCode,
          area: "",
          city: "",
          state: "",
          status: "Active" as const,
        }
      );
    }

    return null;
  }, [institutions, selectedSchool]);

  const totalSchools = schools.length;

  const filteredSchools = useMemo(() => {
    let result = schools;
    if (filterInstitutionId) {
      result = result.filter((s) => s.institutionId === filterInstitutionId);
    }
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (s) =>
          s.schoolName.toLowerCase().includes(q) ||
          s.schoolCode.toLowerCase().includes(q) ||
          s.institutionName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [schools, searchQuery, filterInstitutionId]);

  useEffect(() => {
    const load = async () => {
      // load institutions from backend, fallback to localStorage
      // Use a local variable so the schools mapping below always sees the fresh data
      let localInstitutions: Institution[] = [];

      if (role === "collegeAdmin") {
        try {
          const resp = await fetch(`${API_BASE_URL}/api/institutions/current`, { credentials: "include" });
          if (resp.ok) {
            const data = await resp.json() as { institution: Institution };
            if (data.institution) {
              localInstitutions = [data.institution];
              setInstitutions(localInstitutions);
              setFilterInstitutionId(data.institution.id);
            }
          }
        } catch {
          // silent
        }
      } else {
        try {
          const resp = await fetch(`${API_BASE_URL}/api/institutions`, { credentials: "include" });
          if (resp.ok) {
            const data = (await resp.json()) as { institutions: Institution[] };
            if (Array.isArray(data.institutions)) {
              localInstitutions = data.institutions;
              setInstitutions(localInstitutions);
              try {
                window.localStorage.setItem(institutionsStorageKey, JSON.stringify(localInstitutions));
              } catch {}
            }
          } else {
            throw new Error("institutions fetch failed");
          }
        } catch {
          try {
            const storedInstitutions = window.localStorage.getItem(institutionsStorageKey);
            if (storedInstitutions) {
              const parsedInstitutions = JSON.parse(storedInstitutions) as Institution[];
              if (Array.isArray(parsedInstitutions)) {
                localInstitutions = parsedInstitutions;
                setInstitutions(parsedInstitutions);
              }
            }
          } catch {
            window.localStorage.removeItem(institutionsStorageKey);
          }
        }
      }

      // load schools from backend, fallback to localStorage
      // Use localInstitutions (not stale state) to resolve institutionName
      try {
        const resp = await fetch(`${API_BASE_URL}/api/schools`, { credentials: "include" });
        if (resp.ok) {
          const data = (await resp.json()) as { schools: { id: string; schoolCode: string; name: string; institutionId: string; phone: string; email: string }[] };
          const serverSchools: SchoolRecord[] = (data.schools ?? []).map((s) => ({
            id: s.id,
            schoolCode: s.schoolCode,
            schoolName: s.name,
            phone: s.phone || "",
            email: s.email || "",
            institutionId: s.institutionId,
            isActive: (s as { isActive?: boolean }).isActive ?? true,
            institutionName: localInstitutions.find((i) => i.id === s.institutionId)?.institutionName ?? "",
            institutionCode: localInstitutions.find((i) => i.id === s.institutionId)?.institutionCode ?? "",
          }));
          setSchools(serverSchools);
          setSelectedId(serverSchools[0]?.id ?? "");
          try {
            window.localStorage.setItem(schoolsStorageKey, JSON.stringify(serverSchools));
          } catch {}
        } else {
          throw new Error("schools fetch failed");
        }
      } catch {
        try {
          const storedSchools = window.localStorage.getItem(schoolsStorageKey);
          if (storedSchools) {
            const parsedSchools = JSON.parse(storedSchools) as SchoolRecord[];
            if (Array.isArray(parsedSchools)) {
              setSchools(parsedSchools);
              setSelectedId(parsedSchools[0]?.id ?? "");
            }
          }
        } catch {
          window.localStorage.removeItem(schoolsStorageKey);
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

  useEffect(() => {
    window.localStorage.setItem(schoolsStorageKey, JSON.stringify(schools));
  }, [schools]);

  useEffect(() => {
    if (mode === "edit" && selectedSchool) {
      setFormData({
        institutionId: selectedSchool.institutionId,
        schoolCode: selectedSchool.schoolCode,
        schoolName: selectedSchool.schoolName,
        phone: selectedSchool.phone,
        email: selectedSchool.email,
        isActive: selectedSchool.isActive,
      });
      return;
    }

if (mode === "create") {
  setFormData((currentValue) => ({
    ...emptyForm,
    institutionId:
      role === "collegeAdmin"
        ? institutions[0]?.id ?? ""
        : currentValue.institutionId &&
          institutions.some(
            (institution) =>
              institution.id === currentValue.institutionId
          )
        ? currentValue.institutionId
        : "",
  }));
}  }, [institutions, role, mode, selectedSchool]);

  const startCreate = () => {
    setMode("create");
    setFormOpen(true);
    setSelectedId("");
    setError("");
    setFormData({
      institutionId: role === "collegeAdmin" && institutions.length > 0 ? institutions[0].id : "",
      schoolCode: "",
      schoolName: "",
      phone: "",
      email: "",
      isActive: true,
    });
    router.replace(pathname);
  };

  const startEdit = (school: SchoolRecord) => {
    setSelectedId(school.id);
    setMode("edit");
    setFormOpen(true);
    setError("");
    setFormData({
      institutionId: school.institutionId,
      schoolCode: school.schoolCode,
      schoolName: school.schoolName,
      phone: school.phone,
      email: school.email,
      isActive: school.isActive,
    });
    router.replace(`${pathname}?action=edit`);
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    const fieldName = name as keyof SchoolFormState;
    const nextValue = fieldSanitizers[fieldName](value);
    setFormData((currentValue) => ({
      ...currentValue,
      [name]: nextValue,
    }));
  };

  const applyEmailDomain = (domain: (typeof emailDomains)[number]) => {
    const localPart = (formData.email ?? "").split("@")[0].trim();
    if (!localPart) return;
    setFormData((prev) => ({
      ...prev,
      email: `${localPart}${domain}`,
    }));
  };

  const emailLocalPart = (formData.email ?? "").split("@")[0].trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedFormData = {
      ...formData,
      schoolCode: formData.schoolCode.replace(/\s+/g, ""),
      phone: formData.phone.replace(/\s+/g, ""),
      email: formData.email.replace(/\s+/g, ""),
    };

    const validationOrder: Array<keyof typeof fieldValidators> = ["schoolCode", "schoolName", "email"];
    for (const fieldName of validationOrder) {
      const value = normalizedFormData[fieldName].trim();
      if (!value || !fieldValidators[fieldName].test(value)) {
        setError(fieldValidationMessages[fieldName]);
        return;
      }
    }

    const submit = async () => {
      if (!selectedInstitution && mode === "create") return;

      try {
        if (mode === "create") {
          const resp = await fetch(`${API_BASE_URL}/api/schools/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              schoolCode: normalizedFormData.schoolCode.trim(),
              name: normalizedFormData.schoolName.trim(),
              phone: normalizedFormData.phone.trim(),
              email: normalizedFormData.email.trim(),
              institutionId: formData.institutionId,
            }),
          });
          const data = await resp.json().catch(() => null) as { error?: string; school?: { id: string; schoolCode: string; name: string; institutionId: string; phone?: string; phoneNumber?: string; email: string } };
          if (!resp.ok) {
              setError(data?.error ?? "Failed to create school.");
            return;
          }

          const created = data?.school;
          if (created) {
            const institution = institutions.find((i) => i.id === created.institutionId);
            const createdPhone = created.phone ?? created.phoneNumber ?? (formData.phone ?? "").trim();
            const createdRecord: SchoolRecord = {
              id: created.id,
              schoolCode: created.schoolCode,
              schoolName: created.name,
              phone: createdPhone,
              email: created.email || "",
              institutionId: created.institutionId,
              isActive: true,
              institutionName: institution?.institutionName ?? "",
              institutionCode: institution?.institutionCode ?? "",
            };
            setSchools((prev) => [createdRecord, ...prev]);
            setSelectedId(createdRecord.id);
            setMode("edit");
            setFormOpen(false);
            setFormData({ institutionId: createdRecord.institutionId, schoolCode: createdRecord.schoolCode, schoolName: createdRecord.schoolName, phone: createdRecord.phone, email: createdRecord.email, isActive: createdRecord.isActive });
            router.replace(`${pathname}?action=edit`);
          }
        } else if (mode === "edit" && selectedSchool) {
          const resp = await fetch(`${API_BASE_URL}/api/schools/update`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              id: selectedSchool.id,
              schoolCode: formData.schoolCode.trim(),
              name: formData.schoolName.trim(),
              phone: formData.phone?.trim(),
              email: formData.email?.trim(),
              institutionId: formData.institutionId,
              isActive: formData.isActive,
            }),
          });
          const data = await resp.json().catch(() => null) as { error?: string; school?: { id: string; schoolCode: string; name: string; institutionId: string; phone?: string; phoneNumber?: string; email: string; isActive?: boolean } };
          if (!resp.ok) {
            setError(data?.error ?? "Failed to update school.");
            return;
          }

          const updated = data?.school;
          if (updated) {
            const institution = institutions.find((item) => item.id === updated.institutionId);
            const updatedPhone = updated.phone ?? updated.phoneNumber ?? (formData.phone ?? "").trim();
            setSchools((currentValue) =>
              currentValue.map((school) =>
                school.id === updated.id
                  ? {
                      ...school,
                      schoolCode: updated.schoolCode,
                      schoolName: updated.name,
                      phone: updatedPhone,
                      email: updated.email || "",
                      institutionId: updated.institutionId,
                      isActive: (updated as { isActive?: boolean }).isActive ?? school.isActive,
                      institutionName: institution?.institutionName ?? school.institutionName,
                      institutionCode: institution?.institutionCode ?? school.institutionCode,
                    }
                  : school
              )
            );
            setFormOpen(false);
          }
        }
      } catch {
        setError("Unable to connect to the backend.");
      }
    };

    submit();
  };

  const confirmDelete = (schoolId: string) => {
    setDeleteConfirmId(schoolId);
    setOpenMenuId(null);
  };



  const handleDelete = (schoolId: string) => {
    setDeleteConfirmId(null);
    const doDelete = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/schools/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: schoolId }),
        });
        if (!resp.ok) throw new Error("delete failed");
      } catch {
        setError("Unable to delete school on the backend.");
        return;
      }

      setSchools((currentValue) => {
        const nextSchools = currentValue.filter((school) => school.id !== schoolId);

        if (selectedId === schoolId) {
          const nextSelected = nextSchools[0] ?? null;
          setSelectedId(nextSelected?.id ?? "");
          if (nextSelected) {
            setMode("edit");
            setFormData({
              institutionId: nextSelected.institutionId,
              schoolCode: nextSelected.schoolCode,
              schoolName: nextSelected.schoolName,
              phone: nextSelected.phone || "",
              email: nextSelected.email || "",
              isActive: nextSelected.isActive,
            });
          } else {
            setMode("create");
            setFormData({
              institutionId: institutions[0]?.id ?? "",
              schoolCode: "",
              schoolName: "",
              phone: "",
              email: "",
              isActive: true,
            });
            router.replace(pathname);
          }
        }

        return nextSchools;
      });
    };

    doDelete();
  };

  return (
    <div className="px-1">
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 size={24} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete School?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-900">
                {schools.find((s) => s.id === deleteConfirmId)?.schoolName}
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
                  {emailLocalPart && !(formData.email ?? "").includes("@") ? (
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
        </div>
      )}

      <section>
        <div className="border-b border-slate-200 pb-3">
          {/* Badge + Title + Description + Create Button */}
          <div className="flex items-center justify-between gap-4">
          <div>
              {error ? (
                <div className="text-sm text-rose-700">{error}</div>
              ) : null}
          </div>
          <div className="relative min-w-[200px] flex-1" style={{ marginLeft: "-15px" }}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, code, institution…" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
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
              <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                <Plus size={16} />
                Create School
              </button>
          </div>
          </div>
        </div>
        <div className="flex gap-5 overflow-hidden pt-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Schools</h2>
                <p className="text-sm text-slate-500">
                  Create the first record to get started.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {schools.length} records
              </span>
            </div>

            <div className="mt-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pb-2 pr-1">
              {schools.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No schools yet. Create the first school using the form on the right.
                </div>
              ) : filteredSchools.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No results match your search.
                </div>
              ) : (
                filteredSchools.map((school, index) => {
                  const isLast = index === filteredSchools.length - 1;
                  const isSelected = school.id === selectedId;
                  const institution = institutions.find((item) => item.id === school.institutionId);

                  return (
                    <article
                      key={school.id}
                      className={`w-full rounded-2xl border p-4 transition ${
                        isSelected
                          ? "border-blue-200 bg-blue-50/80 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                          <School size={16} />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <h3 className="break-words text-sm font-semibold text-slate-900">
                              {school.schoolName} ({school.schoolCode})
                            </h3>
                            {school.isActive ? (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Active</span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Inactive</span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            <b>{institution ? institution.institutionName : school.institutionName}</b>
                          </p>
                          <p className="truncate text-xs text-slate-400"> {school.phone}, {school.email}</p>
                        </div>
                        <div className="relative shrink-0 overflow-visible">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = e.currentTarget as HTMLElement;
                              const rect = el.getBoundingClientRect();
                              setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                              setOpenMenuId(openMenuId === school.id ? null : school.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Open actions"
                          >
                            <EllipsisVertical size={15} />
                          </button>
                          {openMenuId === school.id && menuPos && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                              <div
                                style={{
                                  position: "fixed",
                                  left: Math.max(Math.min(menuPos.x + menuPos.w - 144 - 8, window.innerWidth - 160), 8),
                                  top: isLast ? menuPos.y - 78 : menuPos.y + menuPos.h + 6,
                                }}
                                className="z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                              >
                                <button type="button" onClick={() => { startEdit(school); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                  <PencilLine size={14} /> Edit
                                </button>
                                <button type="button" onClick={() => { confirmDelete(school.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50">
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

          {formOpen && (
          <div className="w-[280px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {mode === "create" ? "Create School" : "Edit School"}
                </h3>
              </div>
              {mode === "edit" && selectedSchool ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 truncate">
                  <ChevronRight size={14} />
                  {selectedSchool.schoolCode}
                </span>
              ) : null}
            </div>

            {institutions.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Create at least one institution first from <span className="font-semibold">Institute Management</span>. The dropdown will populate automatically.
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Institution</label>
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
                    disabled={mode === "edit"}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Select institution</option>
                    {institutions.filter((i) => i.isActive || (mode === "edit" && formData.institutionId === i.id)).map((institution) => (
                      <option key={institution.id} value={institution.id}>
                        {institution.institutionName} ({institution.institutionCode})
                      </option>
                    ))}
                    {mode === "edit" && resolvedSelectedInstitution && !institutions.some((institution) => institution.id === resolvedSelectedInstitution.id) ? (
                      <option value={resolvedSelectedInstitution.id}>
                        {resolvedSelectedInstitution.institutionName} ({resolvedSelectedInstitution.institutionCode})
                      </option>
                    ) : null}
                  </select>
                )}
              </div>

                  <div>
                  <label className="block text-sm font-medium text-slate-700">School Code</label>
                  <input
                    type="text"
                    name="schoolCode"
                    value={formData.schoolCode}
                    onChange={handleInputChange}
                    placeholder="e.g., SCH-01"
                    required
                    maxLength={20}
                    title={fieldValidationMessages.schoolCode}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">School Name</label>
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                    placeholder="e.g., School of Engineering"
                    required
                    maxLength={120}
                    title={fieldValidationMessages.schoolName}
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
                    placeholder="e.g., school@example.com"
                    required
                    title={fieldValidationMessages.email}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  {emailLocalPart && !(formData.email ?? "").includes("@") ? (
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


              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={institutions.length === 0 || (!formData.institutionId && mode === "create")}
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
