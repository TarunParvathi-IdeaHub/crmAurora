"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Power,
  Search,
  X,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";
import { authFetch } from "@/lib/utils/authFetch";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const academicYearNameRegex = /^(\d{4})-(\d{4})$/;

const schema = z
  .object({
    academicYearName: z
      .string()
      .min(1, "Academic Year Name is required.")
      .regex(
        academicYearNameRegex,
        "Academic Year must follow YYYY-YYYY format and years must be consecutive.",
      ),
    startDate: z.string().min(1, "Start Date is required."),
    endDate: z.string().min(1, "End Date is required."),
    batchIds: z.array(z.string()).min(1, "Select at least one batch."),
  })
  .superRefine((data, ctx) => {
    const match = academicYearNameRegex.exec(data.academicYearName);
    if (!match) return;

    const firstYear = Number(match[1]);
    const secondYear = Number(match[2]);

    if (secondYear !== firstYear + 1) {
      ctx.addIssue({
        path: ["academicYearName"],
        code: z.ZodIssueCode.custom,
        message: "Academic Year must follow YYYY-YYYY format and years must be consecutive.",
      });
      return;
    }

    if (data.startDate) {
      const start = new Date(`${data.startDate}T00:00:00.000Z`);
      if (start.getUTCFullYear() !== firstYear) {
        ctx.addIssue({
          path: ["startDate"],
          code: z.ZodIssueCode.custom,
          message: "Start Date must belong to the first year of Academic Year.",
        });
      }
    }

    if (data.endDate) {
      const end = new Date(`${data.endDate}T00:00:00.000Z`);
      if (end.getUTCFullYear() !== secondYear) {
        ctx.addIssue({
          path: ["endDate"],
          code: z.ZodIssueCode.custom,
          message: "End Date must belong to the second year of Academic Year.",
        });
      }
    }

    if (data.startDate && data.endDate) {
      const start = new Date(`${data.startDate}T00:00:00.000Z`);
      const end = new Date(`${data.endDate}T00:00:00.000Z`);
      const minEnd = new Date(start);
      minEnd.setUTCMonth(minEnd.getUTCMonth() + 10);

      if (end < minEnd) {
        ctx.addIssue({
          path: ["endDate"],
          code: z.ZodIssueCode.custom,
          message: "Academic Year duration must be at least 10 months.",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

type BatchOption = {
  id: string;
  batchName: string;
  createdAt: string;
};

type AcademicYearRow = {
  id: string;
  academicYearName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  linkedBatchesCount: number;
  linkedBatches: Array<{ id: string; batchName: string; isActive: boolean }>;
};

type AcademicYearResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    institution: { institutionId: string; institutionName: string };
    academicYears?: AcademicYearRow[];
    academicYear?: AcademicYearRow;
    batches?: BatchOption[];
  };
};

type PanelMode = "create" | "edit" | "view";

const emptyValues: FormValues = {
  academicYearName: "",
  startDate: "",
  endDate: "",
  batchIds: [],
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-component: Batch dropdown with checkboxes ─────────────────────────────
type BatchDropdownProps = {
  batches: BatchOption[];
  selectedIds: string[];
  disabled?: boolean;
  onToggle: (id: string) => void;
};

function BatchDropdown({ batches, selectedIds, disabled, onToggle }: BatchDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label =
    selectedIds.length === 0
      ? "Select batches…"
      : selectedIds.length === batches.length
      ? "All batches selected"
      : `${selectedIds.length} batch${selectedIds.length > 1 ? "es" : ""} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span className={selectedIds.length === 0 ? "text-slate-400" : "font-medium text-slate-700"}>
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {selectedIds.length}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-52 overflow-y-auto p-1">
            {batches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No batches available.</p>
            ) : (
              batches.map((batch) => {
                const checked = selectedIds.includes(batch.id);
                return (
                  <label
                    key={batch.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 ${
                      checked ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(batch.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>{batch.batchName}</span>
                    {checked && (
                      <Check size={12} className="ml-auto shrink-0 text-blue-500" />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AcademicYearsPage() {
  const role = useRole();
  const { profile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<AcademicYearRow[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Panel state (replaces dialog)
  const initialAction = searchParams?.get("action");
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>(
    initialAction === "edit" ? "edit" : "create",
  );
  const [selected, setSelected] = useState<AcademicYearRow | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const academicYearName = watch("academicYearName");
  const selectedBatchIds = watch("batchIds");

  const parsedYears = useMemo(() => {
    const match = academicYearNameRegex.exec(academicYearName || "");
    if (!match) return null;

    const firstYear = Number(match[1]);
    const secondYear = Number(match[2]);
    if (secondYear !== firstYear + 1) return null;

    return { firstYear, secondYear };
  }, [academicYearName]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.academicYearName.toLowerCase().includes(q));
  }, [rows, search]);

  const isDirector = role === "admissionDirector";

  useEffect(() => {
    if (!isDirector) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [yearsRes, batchesRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/api/academic-years`),
          authFetch(`${API_BASE_URL}/api/academic-years/active-batches`),
        ]);

        const yearsPayload = (await yearsRes.json()) as AcademicYearResponse;
        const batchesPayload = (await batchesRes.json()) as AcademicYearResponse;

        if (!yearsRes.ok) {
          throw new Error(yearsPayload.error || "Unable to load academic years.");
        }

        if (!batchesRes.ok) {
          throw new Error(batchesPayload.error || "Unable to load batches.");
        }

        setRows(yearsPayload.data?.academicYears ?? []);
        setBatches(batchesPayload.data?.batches ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load records.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isDirector]);

  const updateUrlMode = (nextMode: PanelMode) => {
    setPanelMode(nextMode);
    setPanelOpen(true);
    if (nextMode === "view") {
      router.replace(pathname ?? "");
    } else {
      router.replace(`${pathname}?action=${nextMode}`);
    }
  };

  function openCreate() {
    setPanelMode("create");
    setSelected(null);
    reset(emptyValues);
    setPanelOpen(true);
    setError("");
    router.replace(`${pathname}?action=create`);
  }

  function openEdit(row: AcademicYearRow) {
    setSelected(row);
    reset({
      academicYearName: row.academicYearName,
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
      batchIds: row.linkedBatches.map((batch) => batch.id),
    });
    updateUrlMode("edit");
    setError("");
  }

  function openView(row: AcademicYearRow) {
    setSelected(row);
    reset({
      academicYearName: row.academicYearName,
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
      batchIds: row.linkedBatches.map((batch) => batch.id),
    });
    setPanelMode("view");
    setPanelOpen(true);
    setError("");
    router.replace(pathname ?? "");
  }

  function closePanel() {
    setPanelOpen(false);
    setError("");
    router.replace(pathname ?? "");
  }

  async function deactivate(row: AcademicYearRow) {
    if (!row.isActive) return;

    try {
      setError("");
      setSuccess("");

      const res = await authFetch(`${API_BASE_URL}/api/academic-years/${row.id}`, {
        method: "DELETE",
      });

      const payload = (await res.json()) as AcademicYearResponse;

      if (!res.ok) {
        throw new Error(payload.error || "Unable to deactivate academic year.");
      }

      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, isActive: false } : item)));
      setSuccess(payload.message || "Academic Year deactivated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate academic year.");
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (panelMode === "view") return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const url =
        panelMode === "create"
          ? `${API_BASE_URL}/api/academic-years`
          : `${API_BASE_URL}/api/academic-years/${selected?.id ?? ""}`;

      const method = panelMode === "create" ? "POST" : "PUT";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = (await res.json()) as AcademicYearResponse;

      if (!res.ok) {
        throw new Error(payload.error || "Unable to save academic year.");
      }

      const next = payload.data?.academicYear;
      if (next) {
        setRows((prev) => {
          if (panelMode === "create") return [next, ...prev];
          return prev.map((item) => (item.id === next.id ? next : item));
        });
      }

      setSuccess(
        payload.message ||
          (panelMode === "create"
            ? "Academic Year created successfully"
            : "Academic Year updated successfully"),
      );

      closePanel();
      reset(emptyValues);
      setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save academic year.");
    } finally {
      setSaving(false);
    }
  });

  if (!isDirector) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
        You do not have permission to access Academic Year Management.
      </div>
    );
  }

  return (
    <div className="px-1">
      <section>
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Academic Years</h1>
              <p className="text-sm text-slate-500">
                Manage academic years and batch mappings for admissions.
              </p>
              {profile?.institution?.institutionName && (
                <p className="mt-1 text-xs text-slate-400">
                  Institution: {profile.institution.institutionName}
                </p>
              )}
            </div>
            <div className="flex min-w-[220px] flex-1 items-center justify-end gap-3">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Academic Year..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Create Academic Year
              </button>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
        {success && <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</div>}

        <div className="flex gap-5 overflow-hidden pt-4">
          {/* Table */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Academic Year</th>
                    <th className="px-4 py-3">Start Date</th>
                    <th className="px-4 py-3">End Date</th>
                    <th className="px-4 py-3">Linked Batches</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                        Loading academic years...
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-400" colSpan={7}>
                        No academic years found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.academicYearName}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.startDate)}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.endDate)}</td>
                        <td className="px-4 py-3 text-slate-600">{row.linkedBatchesCount}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              row.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openView(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                              title="View"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={!row.isActive}
                              onClick={() => deactivate(row)}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                row.isActive
                                  ? "text-rose-500 hover:bg-rose-50"
                                  : "cursor-not-allowed text-slate-300"
                              }`}
                              title="Deactivate"
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right-side form panel */}
          {panelOpen && (
            <div className="w-[360px] shrink-0 border-l border-slate-200 pl-4">
              {/* Panel header */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {panelMode === "create"
                    ? "Create Academic Year"
                    : panelMode === "edit"
                    ? "Edit Academic Year"
                    : "Academic Year Details"}
                </h3>
                <div className="flex items-center gap-2">
                  {(panelMode === "edit" || panelMode === "view") && selected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      <ChevronRight size={14} />
                      {selected.academicYearName}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={closePanel}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {/* Institution (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">Institution Name</label>
                  <input
                    readOnly
                    value={profile?.institution?.institutionName || ""}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>

                {/* Academic Year Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Academic Year Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    {...register("academicYearName")}
                    readOnly={panelMode === "view"}
                    placeholder="2026-2027"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 read-only:bg-slate-100 read-only:text-slate-500"
                  />
                  {errors.academicYearName?.message && (
                    <p className="mt-1 text-xs text-rose-600">{errors.academicYearName.message}</p>
                  )}
                </div>

                {/* Select Batches — Dropdown with checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Select Batches <span className="text-rose-500">*</span>
                  </label>
                  <div className="mt-1">
                    <BatchDropdown
                      batches={batches}
                      selectedIds={selectedBatchIds}
                      disabled={panelMode === "view"}
                      onToggle={(id) => {
                        const checked = selectedBatchIds.includes(id);
                        setValue(
                          "batchIds",
                          checked
                            ? selectedBatchIds.filter((b) => b !== id)
                            : [...selectedBatchIds, id],
                          { shouldValidate: true },
                        );
                      }}
                    />
                  </div>
                  {errors.batchIds?.message && (
                    <p className="mt-1 text-xs text-rose-600">{errors.batchIds.message}</p>
                  )}
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start Date</label>
                  <div className="relative mt-1">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      {...register("startDate")}
                      readOnly={panelMode === "view"}
                      disabled={!parsedYears || panelMode === "view"}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  {errors.startDate?.message && (
                    <p className="mt-1 text-xs text-rose-600">{errors.startDate.message}</p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">End Date</label>
                  <div className="relative mt-1">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      {...register("endDate")}
                      readOnly={panelMode === "view"}
                      disabled={!parsedYears || panelMode === "view"}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                  {errors.endDate?.message && (
                    <p className="mt-1 text-xs text-rose-600">{errors.endDate.message}</p>
                  )}
                </div>

                {/* View-only: metadata + linked batches */}
                {panelMode === "view" && selected && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Created: {formatDate(selected.createdAt)}</p>
                    <p className="text-xs text-slate-500">Updated: {formatDate(selected.updatedAt)}</p>
                    <p className="mt-2 text-xs font-medium text-slate-600">Linked Batches</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {selected.linkedBatches.map((batch) => (
                        <span
                          key={batch.id}
                          className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700"
                        >
                          {batch.batchName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {panelMode !== "view" && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Check size={14} />
                      {saving
                        ? "Saving..."
                        : panelMode === "create"
                        ? "Create Academic Year"
                        : "Update Academic Year"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {panelMode === "view" ? "Close" : "Cancel"}
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
