"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  EllipsisVertical,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRole } from "@/lib/hooks/useRole";
import { useProfile } from "@/providers/ProfileProvider";
import { authFetch } from "@/lib/utils/authFetch";

type Mode = "create" | "edit";

type Institution = {
  id: string;
  institutionName: string;
  institutionCode: string;
  institutionCity?: string;
  institutionState?: string;
  isActive?: boolean;
};

type FeeCategoryType =
  | "APPLICATION_FEE"
  | "REGISTRATION_FEE"
  | "TUITION_FEE"
  | "HOSTEL_FEE"
  | "TRANSPORT_FEE"
  | "EXAM_FEE";

type FeeCategory = {
  id: string;
  institutionId: string;
  institutionName: string;
  categoryType: FeeCategoryType;
  feeName: string;
  amount: number | null;
  isFixed: boolean;
  isActive: boolean;
  createdAt: string;
};

type RawFeeCategory = {
  id: string;
  institutionId: string;
  categoryType: FeeCategoryType;
  feeName: string;
  amount: number | null;
  isFixed: boolean;
  isActive: boolean;
  createdAt: string;
  institution?: {
    id: string;
    institutionName: string;
    institutionCode: string;
    institutionCity: string;
    institutionState: string;
  };
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const categoryOptions = [
  { value: "APPLICATION_FEE", label: "Application Fee" },
  { value: "REGISTRATION_FEE", label: "Registration Fee" },
  { value: "TUITION_FEE", label: "Tution Fee" },
  { value: "HOSTEL_FEE", label: "Hostel Fee" },
  { value: "TRANSPORT_FEE", label: "Transport Fee" },
  { value: "EXAM_FEE", label: "Exam Fee" },
] as const satisfies ReadonlyArray<{ value: FeeCategoryType; label: string }>;

const categoryLabelMap = Object.fromEntries(
  categoryOptions.map((option) => [option.value, option.label])
) as Record<FeeCategoryType, string>;

function normalizeCategoryTypeInput(value: string): FeeCategoryType | null {
  const normalizedInput = value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (!normalizedInput) return null;

  for (const option of categoryOptions) {
    const normalizedLabel = option.label.toLowerCase().replace(/[\s_-]+/g, " ");
    const normalizedValue = option.value.toLowerCase().replace(/[\s_-]+/g, " ");
    if (normalizedInput === normalizedLabel || normalizedInput === normalizedValue) {
      return option.value;
    }
  }

  return null;
}

const readOnlyInstitutionClassName =
  "mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

function createEmptyForm(institutionId = "") {
  return {
    institutionId,
    categoryType: "" as "" | FeeCategoryType,
    categoryTypeInput: "",
    feeName: "",
    amount: "",
    isFixed: true,
    isActive: true,
  };
}

export default function FeeCategoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useRole();
  const { profile } = useProfile();

  const initialAction = searchParams?.get("action");

  const isInstitutionReadOnly =
    role === "admissionDirector" || role === "admissionIncharge";
  const lockedInstitutionId = isInstitutionReadOnly
    ? profile?.institution?.id ?? ""
    : "";

  const [mode, setMode] = useState<Mode>(initialAction === "edit" ? "edit" : "create");
  const [formOpen, setFormOpen] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [formData, setFormData] = useState(createEmptyForm(lockedInstitutionId));
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  const selectedCategory = useMemo(
    () => feeCategories.find((category) => category.id === selectedId) ?? null,
    [feeCategories, selectedId]
  );

  const filteredFeeCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return feeCategories;
    return feeCategories.filter((category) => {
      const typeLabel = categoryLabelMap[category.categoryType]?.toLowerCase() ?? "";
      return (
        category.institutionName.toLowerCase().includes(q) ||
        typeLabel.includes(q) ||
        category.feeName.toLowerCase().includes(q)
      );
    });
  }, [feeCategories, searchQuery]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    const loadInstitutions = async () => {
      if (isInstitutionReadOnly) {
        if (profile?.institution) {
          setInstitutions([
            {
              id: profile.institution.id,
              institutionName: profile.institution.institutionName,
              institutionCode: profile.institution.institutionCode,
              institutionCity: profile.institution.institutionCity,
              institutionState: profile.institution.institutionState,
            },
          ]);
        }
        return;
      }

      try {
        const response = await authFetch(`${API_BASE_URL}/api/institutions`);
        if (!response.ok) return;
        const data = (await response.json()) as {
          institutions: Institution[];
        };
        setInstitutions((data.institutions ?? []).filter((i) => i.isActive !== false));
      } catch {
        // Non-blocking for page render
      }
    };

    loadInstitutions();
  }, [isInstitutionReadOnly, profile]);

  useEffect(() => {
    const loadFeeCategories = async () => {
      setLoading(true);
      setError("");
      try {
        const endpoint =
          isInstitutionReadOnly && lockedInstitutionId
            ? `${API_BASE_URL}/api/feecategory/${lockedInstitutionId}`
            : `${API_BASE_URL}/api/feecategory/getall`;

        if (isInstitutionReadOnly && !lockedInstitutionId) {
          setFeeCategories([]);
          setLoading(false);
          return;
        }

        const response = await authFetch(endpoint);

        const data = (await response.json().catch(() => null)) as
          | { error?: string; feeCategories?: RawFeeCategory[] }
          | null;

        if (!response.ok) {
          setError(data?.error || "Unable to load fee categories.");
          setLoading(false);
          return;
        }

        const mapped = (data?.feeCategories ?? []).map((category) => ({
          id: category.id,
          institutionId: category.institutionId,
          institutionName: category.institution?.institutionName ?? "",
          categoryType: category.categoryType,
          feeName: category.feeName,
          amount: category.amount,
          isFixed: category.isFixed,
          isActive: category.isActive,
          createdAt: category.createdAt,
        }));

        setFeeCategories(mapped);
        setSelectedId(mapped[0]?.id ?? "");
      } catch {
        setError("Unable to connect to the backend. Please ensure the server is running.");
      } finally {
        setLoading(false);
      }
    };

    loadFeeCategories();
  }, [isInstitutionReadOnly, lockedInstitutionId]);

  useEffect(() => {
    const action = searchParams?.get("action");
    const nextMode: Mode = action === "edit" && feeCategories.length > 0 ? "edit" : "create";
    setMode(nextMode);

    if (nextMode === "edit") {
      setSelectedId((currentId) => currentId || feeCategories[0]?.id || "");
    } else if (feeCategories.length === 0) {
      setSelectedId("");
    }
  }, [feeCategories, searchParams]);

  useEffect(() => {
    if (mode === "create") {
      setFormData(createEmptyForm(lockedInstitutionId));
      return;
    }

    if (selectedCategory) {
      setFormData({
        institutionId: selectedCategory.institutionId,
        categoryType: selectedCategory.categoryType,
        categoryTypeInput: categoryLabelMap[selectedCategory.categoryType],
        feeName: selectedCategory.feeName,
        amount: selectedCategory.amount !== null ? String(selectedCategory.amount) : "",
        isFixed: selectedCategory.isFixed,
        isActive: selectedCategory.isActive,
      });
    }
  }, [mode, selectedCategory, lockedInstitutionId]);

  const updateUrlMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFormOpen(true);
    setOpenMenuId(null);
    router.replace(`${pathname}?action=${nextMode}`);
  };

  const startEditCategory = (category: FeeCategory) => {
    setSelectedId(category.id);
    setMode("edit");
    setFormOpen(true);
    setOpenMenuId(null);
    router.replace(`${pathname}?action=edit`);
    setFormData({
      institutionId: category.institutionId,
      categoryType: category.categoryType,
      categoryTypeInput: categoryLabelMap[category.categoryType],
      feeName: category.feeName,
      amount: category.amount !== null ? String(category.amount) : "",
      isFixed: category.isFixed,
      isActive: category.isActive,
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      if (name === "amount") {
        return {
          ...previous,
          amount: value.replace(/[^0-9.]/g, ""),
        };
      }

      return {
        ...previous,
        [name]: value,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.institutionId) {
      setError("Please select an institution.");
      return;
    }

    const parsedCategoryType =
      mode === "create"
        ? normalizeCategoryTypeInput(formData.categoryTypeInput)
        : selectedCategory?.categoryType ?? null;

    if (!parsedCategoryType) {
      setError("Please enter a valid fee type.");
      return;
    }

    const parsedAmount = formData.amount === "" ? null : Number(formData.amount);
    if (formData.isFixed && (parsedAmount === null || Number.isNaN(parsedAmount) || parsedAmount < 0)) {
      setError("Amount is required and must be a non-negative number when Fixed Fee is Yes.");
      return;
    }

    if (parsedAmount !== null && (Number.isNaN(parsedAmount) || parsedAmount < 0)) {
      setError("Amount must be a non-negative number.");
      return;
    }

    setSubmitLoading(true);

    if (mode === "create") {
      try {
        const payload = {
          institutionId: formData.institutionId,
          categoryType: parsedCategoryType,
          feeName: formData.feeName || categoryLabelMap[parsedCategoryType],
          amount: parsedAmount,
          isFixed: formData.isFixed,
        };

        const response = await authFetch(`${API_BASE_URL}/api/feecategory/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as
          | { error?: string; feeCategory?: RawFeeCategory }
          | null;

        if (!response.ok) {
          setError(data?.error || "Unable to create fee category.");
          return;
        }

        const institutionName =
          institutions.find((institution) => institution.id === formData.institutionId)?.institutionName ||
          data?.feeCategory?.institution?.institutionName ||
          "";

        if (data?.feeCategory) {
          const created: FeeCategory = {
            id: data.feeCategory.id,
            institutionId: data.feeCategory.institutionId,
            institutionName,
            categoryType: data.feeCategory.categoryType,
            feeName: data.feeCategory.feeName,
            amount: data.feeCategory.amount,
            isFixed: data.feeCategory.isFixed,
            isActive: data.feeCategory.isActive,
            createdAt: data.feeCategory.createdAt,
          };

          setFeeCategories((previous) => [created, ...previous]);
          setSelectedId(created.id);
        }

        setMode("edit");
        setFormOpen(false);
        router.replace(`${pathname}?action=edit`);
        setFormData(createEmptyForm(lockedInstitutionId));
        setSuccessMessage("Fee category created successfully.");
      } catch {
        setError("Unable to save fee category. Please try again.");
      } finally {
        setSubmitLoading(false);
      }

      return;
    }

    if (!selectedCategory) {
      setError("Please select a fee category to update.");
      setSubmitLoading(false);
      return;
    }

    try {
      const payload = {
        id: selectedCategory.id,
        feeName: formData.feeName || categoryLabelMap[selectedCategory.categoryType],
        amount: formData.isFixed ? parsedAmount : null,
        isFixed: formData.isFixed,
        isActive: formData.isActive,
      };

      const response = await authFetch(`${API_BASE_URL}/api/feecategory/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; feeCategory?: RawFeeCategory }
        | null;

      if (!response.ok) {
        setError(data?.error || "Unable to update fee category.");
        return;
      }

      const updated = data?.feeCategory;
      setFeeCategories((previous) =>
        previous.map((category) => {
          if (category.id !== selectedCategory.id) return category;
          return {
            ...category,
            feeName: updated?.feeName ?? payload.feeName,
            amount: updated?.amount ?? payload.amount,
            isFixed: updated?.isFixed ?? payload.isFixed,
            isActive: updated?.isActive ?? payload.isActive,
          };
        })
      );

      setFormOpen(false);
      setFormData(createEmptyForm(lockedInstitutionId));
      setSuccessMessage("Fee category updated successfully.");
    } catch {
      setError("Unable to update fee category. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (feeCategoryId: string) => {
    setError("");
    try {
      const response = await authFetch(`${API_BASE_URL}/api/feecategory/delete/${feeCategoryId}`, {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(data?.error || "Unable to delete fee category.");
        return;
      }

      setFeeCategories((previous) => {
        const next = previous.filter((category) => category.id !== feeCategoryId);
        if (selectedId === feeCategoryId) {
          setSelectedId(next[0]?.id ?? "");
          if (next.length === 0) {
            setMode("create");
            router.replace(pathname);
          }
        }
        return next;
      });

      setSuccessMessage("Fee category deleted successfully.");
    } catch {
      setError("Unable to delete fee category. Please try again.");
    }
  };

  return (
    <div className="px-1">
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 size={24} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete Fee Category?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this fee category? This action cannot be undone.
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
                onClick={() => {
                  handleDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
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
          <div className="flex items-center justify-between gap-4">
            <div>
              {error ? <div className="text-sm text-rose-700">{error}</div> : null}
              {successMessage ? (
                <div className="text-sm text-emerald-700">{successMessage}</div>
              ) : null}
            </div>
            <div></div>
            <div className="relative min-w-[200px] flex-1" style={{ marginLeft: "-15px" }}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by institution, category, fee name..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => updateUrlMode("create")}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Create Fee Category
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-5 overflow-hidden pt-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Fee Categories</h2>
                <p className="text-sm text-slate-500">
                  Edit or delete records from the three-dot action menu.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {feeCategories.length} records
              </span>
            </div>

            <div className="mt-3 max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto pb-2 pr-1">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Loading fee categories...
                </div>
              ) : feeCategories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No fee categories yet. Use <span className="font-medium text-slate-700">Create Fee Category</span> to add the first one.
                </div>
              ) : filteredFeeCategories.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  No results match your search.
                </div>
              ) : null}

              {filteredFeeCategories.map((category, index) => {
                const isLast = index === filteredFeeCategories.length - 1;
                const shouldOpenUp = filteredFeeCategories.length > 4 && isLast;
                return (
                  <article
                    key={category.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                        <span className="text-sm font-semibold">FC</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                          <h3 className="min-w-0 flex-1 break-words text-base font-semibold text-slate-900" title={category.feeName}>
                            {categoryLabelMap[category.categoryType]}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              category.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {category.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 break-words text-sm text-slate-600">
                          {category.institutionName || "Unknown Institution"} ,
                          {" "}Fixed Fee: {category.isFixed ? "Yes" : "No"}
                          {" "} , Amount: {category.amount !== null ? category.amount : "-"}
                        </p>
                      </div>

                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const element = event.currentTarget as HTMLElement;
                            const rect = element.getBoundingClientRect();
                            setMenuPos({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
                            setOpenMenuId(openMenuId === category.id ? null : category.id);
                          }}
                          className="inline-flex h-5 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Open actions"
                        >
                          <EllipsisVertical size={15} />
                        </button>

                        {openMenuId === category.id && menuPos && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div
                              style={{
                                position: "fixed",
                                left: Math.max(
                                  Math.min(menuPos.x + menuPos.w - 144 - 8, window.innerWidth - 160),
                                  8
                                ),
                                top: shouldOpenUp ? menuPos.y - 78 : menuPos.y + menuPos.h + 6,
                              }}
                              className="z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                            >
                              <button
                                type="button"
                                onClick={() => startEditCategory(category)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                <PencilLine size={14} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirmId(category.id);
                                  setOpenMenuId(null);
                                }}
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
                );
              })}
            </div>
          </div>

          {formOpen && (
            <div className="w-[320px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {mode === "create" ? "Create Fee Category" : "Edit Fee Category"}
                  </h3>
                </div>
                {mode === "edit" && selectedCategory ? (
                  <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <ChevronRight size={14} />
                    <span className="truncate">{categoryLabelMap[selectedCategory.categoryType]}</span>
                  </span>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Institution</label>
                  {isInstitutionReadOnly ? (
                    <input
                      type="text"
                      value={
                        institutions.find((institution) => institution.id === formData.institutionId)
                          ?.institutionName || ""
                      }
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      className={readOnlyInstitutionClassName}
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
                      <option value="">Select Institution</option>
                      {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                          {institution.institutionName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Category type</label>
                  <input
                    type="text"
                    name="categoryTypeInput"
                    value={formData.categoryTypeInput}
                    onChange={handleInputChange}
                    disabled={mode === "edit"}
                    required
                    placeholder="fee type"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Fixed Fee</label>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, isFixed: true }))}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        formData.isFixed
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          isFixed: false,
                          amount: "",
                        }))
                      }
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        !formData.isFixed
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {formData.isFixed ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Amount</label>
                    <input
                      type="text"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      inputMode="decimal"
                      placeholder="e.g., 1500"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ) : null}

                {mode === "edit" && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Status</label>
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
                    disabled={submitLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mode === "create" ? <Plus size={16} /> : <PencilLine size={16} />}
                    {submitLoading
                      ? mode === "create"
                        ? "Creating..."
                        : "Saving..."
                      : mode === "create"
                      ? "Create"
                      : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setFormData(createEmptyForm(lockedInstitutionId));
                      setError("");
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
