"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  EllipsisVertical,
  PencilLine,
  Plus,
  School,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Mode = "create" | "edit";

type Institution = {
  id: string;
  institutionName: string;
  institutionCode: string;
  institutionArea: string;
  institutionCity: string;
  institutionPincode: string;
  institutionState: string;
  phoneNumber: string;
  email: string;
  isActive: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const emptyForm = {
  institutionName: "",
  institutionCode: "",
  institutionArea: "",
  institutionCity: "",
  institutionPincode: "",
  institutionState: "",
  institutionPhoneNumber: "",
  institutionEmail: "",
  isActive: true,
};

const fieldLimits: Record<Exclude<keyof typeof emptyForm, "isActive">, number> = {
  institutionName: 120,
  institutionCode: 20,
  institutionArea: 60,
  institutionCity: 60,
  institutionPincode: 6,
  institutionState: 60,
  institutionPhoneNumber: 10,
  institutionEmail: 100,
};

const fieldValidationMessages = {
  institutionName: "Institution name can contain only letters and spaces.",
  institutionCode: "Code can contain letters, numbers, hyphens, and parentheses.",
  institutionArea: "Area can contain letters, numbers, spaces, '/', '_' and '-'.",
  institutionCity: "City can contain only letters and spaces.",
  institutionState: "State can contain only letters and spaces.",
  institutionEmail: "Email can contain only letters, numbers, dots and a single @.",
} as const;

const fieldSanitizers = {
  institutionName: (value: string) => value.replace(/[^A-Za-z\s]/g, ""),
  institutionCode: (value: string) => value.replace(/[^A-Za-z0-9()\-\s]/g, ""),
  institutionArea: (value: string) => value.replace(/[^A-Za-z0-9\s\/\-_]/g, ""),
  institutionCity: (value: string) => value.replace(/[^A-Za-z\s]/g, ""),
  institutionState: (value: string) => value.replace(/[^A-Za-z\s]/g, ""),
  institutionPincode: (value: string) => value.replace(/[^0-9\s]/g, ""),
  institutionPhoneNumber: (value: string) => value.replace(/[^0-9\s]/g, ""),
  institutionEmail: (value: string) => value.replace(/[^A-Za-z0-9@.\s]/g, ""),
} as const;

const fieldValidators = {
  institutionName: /^[A-Za-z\s]+$/,
  institutionCode: /^[A-Za-z0-9()\-]+$/,
  institutionArea: /^[A-Za-z0-9\s\/\-_]+$/,
  institutionCity: /^[A-Za-z\s]+$/,
  institutionState: /^[A-Za-z\s]+$/,
  institutionEmail: /^[A-Za-z0-9.]+@[A-Za-z0-9.]+$/,
} as const;

const emailDomains = ["@gmail.com", "@aurora.edu.in", "@yahoo.com"] as const;

export default function ManagementDepartmentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialAction = searchParams?.get("action");
  const [mode, setMode] = useState<Mode>(initialAction === "edit" ? "edit" : "create");
  const [formOpen, setFormOpen] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const selectedInstitution = useMemo(
    () => institutions.find((institution) => institution.id === selectedId) ?? null,
    [institutions, selectedId]
  );

  const filteredInstitutions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return institutions;
    return institutions.filter(
      (inst) =>
        inst.institutionName.toLowerCase().includes(q) ||
        inst.institutionCode.toLowerCase().includes(q) ||
        inst.institutionArea.toLowerCase().includes(q) ||
        inst.institutionCity.toLowerCase().includes(q) ||
        inst.institutionPincode.toLowerCase().includes(q) ||
        inst.institutionState.toLowerCase().includes(q)
    );
  }, [institutions, searchQuery]);

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/institutions`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error || "Unable to load institutions.");
          return;
        }

        const data = (await response.json()) as { institutions: (Institution & { institutionPincode?: string | null })[] };
        const mappedInstitutions = (data.institutions ?? []).map((institution) => ({
          ...institution,
          institutionPincode: institution.institutionPincode ?? "",
        }));
        setInstitutions(mappedInstitutions);
        setSelectedId(mappedInstitutions[0]?.id ?? "");
      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to connect to the backend. Please ensure the server is running.");
      }
    };

    loadInstitutions();
  }, []);

  useEffect(() => {
    const action = searchParams?.get("action");
    const nextMode: Mode = action === "edit" && institutions.length > 0 ? "edit" : "create";
    setMode(nextMode);

    if (nextMode === "edit") {
      setSelectedId((currentSelectedId) => currentSelectedId || institutions[0]?.id || "");
    } else if (institutions.length === 0) {
      setSelectedId("");
    }
  }, [institutions, searchParams]);

  useEffect(() => {
    if (mode === "create") {
      setFormData(emptyForm);
      return;
    }

    if (selectedInstitution) {
      setFormData({
        institutionName: selectedInstitution.institutionName,
        institutionCode: selectedInstitution.institutionCode,
        institutionArea: selectedInstitution.institutionArea,
        institutionCity: selectedInstitution.institutionCity,
          institutionPincode: selectedInstitution.institutionPincode,
        institutionState: selectedInstitution.institutionState,
        institutionPhoneNumber: selectedInstitution.phoneNumber,
        institutionEmail: selectedInstitution.email,
        isActive: selectedInstitution.isActive,
      });
    }
  }, [mode, selectedInstitution]);

  useEffect(() => {
    if (!selectedInstitution && institutions.length > 0) {
      setSelectedId(institutions[0].id);
    }
  }, [institutions, selectedInstitution]);

  const updateUrlMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFormOpen(true);
    router.replace(`${pathname}?action=${nextMode}`);
  };

  const startEditInstitution = (institution: Institution) => {
    setSelectedId(institution.id);
    setMode("edit");
    setFormOpen(true);
    router.replace(`${pathname}?action=edit`);
    setFormData({
      institutionName: institution.institutionName,
      institutionCode: institution.institutionCode,
      institutionArea: institution.institutionArea,
      institutionCity: institution.institutionCity,
        institutionPincode: institution.institutionPincode,
      institutionState: institution.institutionState,
      institutionPhoneNumber: institution.phoneNumber,
      institutionEmail: institution.email,
      isActive: institution.isActive,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as Exclude<keyof typeof emptyForm, "isActive">;
    const nextValue = fieldSanitizers[fieldName](value).slice(0, fieldLimits[fieldName]);
    const maxLength = fieldLimits[fieldName] ?? nextValue.length;
    const limitedValue = nextValue.slice(0, maxLength);

    setFormData((previousValue) => ({
      ...previousValue,
      [name]: limitedValue,
    }));
  };

  const applyEmailDomain = (domain: (typeof emailDomains)[number]) => {
    const localPart = formData.institutionEmail.split("@")[0].trim();
    if (!localPart) return;
    setFormData((prev) => ({
      ...prev,
      institutionEmail: `${localPart}${domain}`,
    }));
  };

  const emailLocalPart = formData.institutionEmail.split("@")[0].trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedFormData = {
      ...formData,
      institutionCode: formData.institutionCode.replace(/\s+/g, ""),
      institutionPincode: formData.institutionPincode.replace(/\s+/g, ""),
      institutionPhoneNumber: formData.institutionPhoneNumber.replace(/\s+/g, ""),
      institutionEmail: formData.institutionEmail.replace(/\s+/g, ""),
    };

    const validationOrder: Array<keyof typeof fieldValidators> = [
      "institutionName",
      "institutionCode",
      "institutionArea",
      "institutionCity",
      "institutionState",
      "institutionEmail",
    ];

    for (const fieldName of validationOrder) {
      const value = normalizedFormData[fieldName].trim();
      if (!value || !fieldValidators[fieldName].test(value)) {
        setError(fieldValidationMessages[fieldName]);
        return;
      }
    }

    const payload = {
      institutionName: normalizedFormData.institutionName.trim(),
      institutionCode: normalizedFormData.institutionCode.trim(),
      institutionArea: normalizedFormData.institutionArea.trim(),
      institutionCity: normalizedFormData.institutionCity.trim(),
      institutionPincode: normalizedFormData.institutionPincode.trim(),
      institutionState: normalizedFormData.institutionState.trim(),
      institutionPhoneNumber: normalizedFormData.institutionPhoneNumber.trim(),
      institutionEmail: normalizedFormData.institutionEmail.trim(),
      isActive: formData.isActive,
    };

    if (mode === "create") {
      try {
        const response = await fetch(`${API_BASE_URL}/api/institutions/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setError(data?.error || "Unable to create institution.");
          return;
        }

        const createdInstitution = {
          ...(data.institution as Omit<Institution, "isActive"> & { isActive?: boolean }),
          institutionPincode: (data.institution as { institutionPincode?: string }).institutionPincode ?? "",
          isActive: (data.institution as { isActive?: boolean })?.isActive ?? true,
        } as Institution;
        setInstitutions((previousInstitutions) => [createdInstitution, ...previousInstitutions]);
        setSelectedId(createdInstitution.id);
        setMode("edit");
        setFormOpen(false);
        router.replace(`${pathname}?action=edit`);
        setFormData(emptyForm);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Unable to save institution. Please try again.");
      }
      return;
    }

    if (!selectedInstitution) {
      setError("Please select an institution to update.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/institutions/${selectedInstitution.institutionCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || "Unable to update institution.");
        return;
      }

      const updatedInstitution = data.institution as Institution;

      setInstitutions((previousInstitutions) =>
        previousInstitutions.map((institution) =>
          institution.id === selectedInstitution.id ? updatedInstitution : institution
        )
      );

      setSelectedId(updatedInstitution.id);
      setFormOpen(false);
      setFormData(emptyForm);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to update institution. Please try again.");
    }
  };

  const handleDelete = async (institutionId: string) => {
    setError("");

    const institutionToDelete = institutions.find((institution) => institution.id === institutionId);
    if (!institutionToDelete) {
      setError("Selected institution not found.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/institutions/${institutionToDelete.institutionCode}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "Unable to delete institution.");
        return;
      }

      setInstitutions((previousInstitutions) => {
        const nextInstitutions = previousInstitutions.filter((institution) => institution.id !== institutionId);

        if (selectedId === institutionId) {
          const nextSelected = nextInstitutions[0];
          setSelectedId(nextSelected?.id ?? "");

          if (nextSelected) {
            setMode("edit");
            setFormData({
              institutionName: nextSelected.institutionName,
              institutionCode: nextSelected.institutionCode,
              institutionArea: nextSelected.institutionArea,
              institutionCity: nextSelected.institutionCity,
              institutionPincode: nextSelected.institutionPincode,
              institutionState: nextSelected.institutionState,
              institutionPhoneNumber: nextSelected.phoneNumber,
              institutionEmail: nextSelected.email,
              isActive: nextSelected.isActive,
            });
          } else {
            setMode("create");
            setFormData(emptyForm);
            router.replace(pathname);
          }
        }

        return nextInstitutions;
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to delete institution. Please try again.");
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
            <h3 className="text-lg font-semibold text-slate-900">Delete Institution?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-900">
                {institutions.find((i) => i.id === deleteConfirmId)?.institutionName}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteConfirmId(null)} className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null); }} className="flex-1 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700">
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
              {error ? (
                <div className="text-sm text-rose-700">{error}</div>
              ) : null}
            </div>
            <div></div>
            <div className="relative min-w-[200px] flex-1" style={{ marginLeft: "-15px" }}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, code, area, city…" className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div className="shrink-0">
              <button type="button" onClick={() => updateUrlMode("create")} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                <Plus size={16} />
                Create Institution
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-5 overflow-hidden pt-4">
          {/* Records List */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Institutions</h2>
                <p className="text-sm text-slate-500">Edit or delete records from the three-dot action menu.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{institutions.length} records</span>
            </div>

            <div className="mt-3 max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto pb-2 pr-1">
              {institutions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No institutions yet. Use <span className="font-medium text-slate-700">Create Institution</span> to add the first one.
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No results match your search.
                </div>
              ) : null}

              {filteredInstitutions.map((institution, index) => {
                const isLastInstitution = index === filteredInstitutions.length - 1;
                const shouldOpenUp = filteredInstitutions.length > 4 && isLastInstitution;
                return (
                  <article key={institution.id} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                        <School size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                          <h3 className="min-w-0 flex-1 break-words text-base font-semibold text-slate-900" title={institution.institutionName}>{institution.institutionName} ({institution.institutionCode})</h3>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${institution.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
                          >
                            {institution.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-sm text-slate-600">{institution.institutionArea}, {institution.institutionCity}, {institution.institutionPincode}, {institution.institutionState}, {institution.phoneNumber}, {institution.email}</p>
                      </div>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const el = e.currentTarget as HTMLElement;
                            const rect = el.getBoundingClientRect();
                            setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                            setOpenMenuId(openMenuId === institution.id ? null : institution.id);
                          }}
                          className="inline-flex h-5 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Open actions"
                        >
                          <EllipsisVertical size={15} />
                        </button>
                        {openMenuId === institution.id && menuPos && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div
                              style={{
                                position: "fixed",
                                left: Math.max(Math.min(menuPos.x + menuPos.w - 144 - 8, window.innerWidth - 160), 8),
                                top: shouldOpenUp ? menuPos.y - 78 : menuPos.y + menuPos.h + 6,
                              }}
                              className="z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                            >
                              <button type="button" onClick={() => { startEditInstitution(institution); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                <PencilLine size={14} /> Edit
                              </button>
                              <button type="button" onClick={() => { setDeleteConfirmId(institution.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50">
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

          {/* Sticky Form */}
          {formOpen && (
          <div className="w-[280px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{mode === "create" ? "Create Institution" : "Edit Institution"}</h3>
              </div>
              {mode === "edit" && selectedInstitution ? (
                <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  <ChevronRight size={14} />
                  <span className="truncate">{selectedInstitution.institutionCode}</span>
                </span>
              ) : null}
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Institution Name</label>
                  <input type="text" name="institutionName" value={formData.institutionName} onChange={handleInputChange} placeholder="e.g., Aurora University" maxLength={fieldLimits.institutionName} title={fieldValidationMessages.institutionName} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Code</label>
                  <input type="text" name="institutionCode" value={formData.institutionCode} onChange={handleInputChange} placeholder="e.g., AU-01" maxLength={fieldLimits.institutionCode} title={fieldValidationMessages.institutionCode} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Area</label>
                  <input type="text" name="institutionArea" value={formData.institutionArea} onChange={handleInputChange} placeholder="e.g., Central Campus" maxLength={fieldLimits.institutionArea} title={fieldValidationMessages.institutionArea} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">City</label>
                  <input type="text" name="institutionCity" value={formData.institutionCity} onChange={handleInputChange} placeholder="e.g., Hyderabad" maxLength={fieldLimits.institutionCity} title={fieldValidationMessages.institutionCity} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Pincode</label>
                  <input type="text" name="institutionPincode" value={formData.institutionPincode} onChange={handleInputChange} placeholder="e.g., 500081" maxLength={fieldLimits.institutionPincode} inputMode="numeric" required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">State</label>
                  <input type="text" name="institutionState" value={formData.institutionState} onChange={handleInputChange} placeholder="e.g., Telangana" maxLength={fieldLimits.institutionState} title={fieldValidationMessages.institutionState} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                  <input type="tel" name="institutionPhoneNumber" value={formData.institutionPhoneNumber} onChange={handleInputChange} placeholder="10-digit number" maxLength={fieldLimits.institutionPhoneNumber} inputMode="numeric" required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">Email</label>
                  <input type="text" name="institutionEmail" value={formData.institutionEmail} onChange={handleInputChange} placeholder="info@aurora.edu.in" maxLength={fieldLimits.institutionEmail} title={fieldValidationMessages.institutionEmail} required className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  {emailLocalPart && !formData.institutionEmail.includes("@") ? (
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
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
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
