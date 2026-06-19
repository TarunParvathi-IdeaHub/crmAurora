"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  EllipsisVertical,
  FileText,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/utils/authFetch";

type Mode = "create" | "edit";

type Institution = {
  id: string;
  institutionName: string;
  institutionCode: string;
  isActive: boolean;
};

type FinanceConfig = {
  id: string;
  institutionId: string;
  institutionName: string;
  invoicePrefix: string;
  receiptPrefix: string;
  currentInvoiceNumber: number;
  currentReceiptNumber: number;
  createdAt: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const emptyForm = {
  institutionId: "",
  invoicePrefix: "",
  receiptPrefix: "",
};

export default function FinanceConfigPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialAction = searchParams?.get("action");

  const [mode, setMode] = useState<Mode>(initialAction === "edit" ? "edit" : "create");
  const [formOpen, setFormOpen] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [financeConfigs, setFinanceConfigs] = useState<FinanceConfig[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const selectedConfig = useMemo(
    () => financeConfigs.find((c) => c.id === selectedId) ?? null,
    [financeConfigs, selectedId]
  );

  const filteredConfigs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return financeConfigs;
    return financeConfigs.filter(
      (c) =>
        c.institutionName.toLowerCase().includes(q) ||
        c.invoicePrefix.toLowerCase().includes(q) ||
        c.receiptPrefix.toLowerCase().includes(q)
    );
  }, [financeConfigs, searchQuery]);

  // Dismiss success toast after 3s
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  // Load active institutions for dropdown
  useEffect(() => {
    const load = async () => {
      try {
        const resp = await authFetch(`${API_BASE_URL}/api/institutions`);
        if (!resp.ok) return;
        const data = (await resp.json()) as {
          institutions: (Institution & { isActive?: boolean })[];
        };
        const active = (data.institutions ?? []).filter((i) => i.isActive !== false);
        setInstitutions(active);
      } catch {
        // silent
      }
    };
    load();
  }, []);

  // Load all finance configs on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const resp = await authFetch(`${API_BASE_URL}/api/institution-finance-config/getall`);
        if (!resp.ok) {
          const body = (await resp.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? "Unable to load finance configurations.");
          return;
        }
        const data = (await resp.json()) as {
          configs?: RawConfig[];
          financeConfigs?: RawConfig[];
          data?: RawConfig[];
        };
        const raw: RawConfig[] = data.configs ?? data.financeConfigs ?? data.data ?? [];
        const mapped = raw.map(mapRawConfig);
        setFinanceConfigs(mapped);
        if (mapped.length > 0) setSelectedId(mapped[0].id);
      } catch {
        setError("Unable to connect to the backend. Please ensure the server is running.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const action = searchParams?.get("action");
    const nextMode: Mode =
      action === "edit" && financeConfigs.length > 0 ? "edit" : "create";
    setMode(nextMode);
    if (nextMode === "edit") {
      setSelectedId((cur) => cur || financeConfigs[0]?.id || "");
    } else if (financeConfigs.length === 0) {
      setSelectedId("");
    }
  }, [financeConfigs, searchParams]);

  useEffect(() => {
    if (mode === "create") {
      setFormData(emptyForm);
      return;
    }
    if (selectedConfig) {
      setFormData({
        institutionId: selectedConfig.institutionId,
        invoicePrefix: selectedConfig.invoicePrefix,
        receiptPrefix: selectedConfig.receiptPrefix,
      });
    }
  }, [mode, selectedConfig]);

  useEffect(() => {
    if (!selectedConfig && financeConfigs.length > 0) {
      setSelectedId(financeConfigs[0].id);
    }
  }, [financeConfigs, selectedConfig]);

  const updateUrlMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFormOpen(true);
    router.replace(`${pathname}?action=${nextMode}`);
    setOpenMenuId(null);
  };

  const startEditConfig = (config: FinanceConfig) => {
    setSelectedId(config.id);
    setMode("edit");
    setFormOpen(true);
    router.replace(`${pathname}?action=edit`);
    setFormData({
      institutionId: config.institutionId,
      invoicePrefix: config.invoicePrefix,
      receiptPrefix: config.receiptPrefix,
    });
    setOpenMenuId(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.institutionId.trim()) {
      setError("Please select an institution.");
      return;
    }
    if (!formData.invoicePrefix.trim()) {
      setError("Invoice prefix is required.");
      return;
    }
    if (!formData.receiptPrefix.trim()) {
      setError("Receipt prefix is required.");
      return;
    }

    setSubmitLoading(true);

    if (mode === "create") {
      try {
        const resp = await authFetch(`${API_BASE_URL}/api/institution-finance-config/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionId: formData.institutionId,
            invoicePrefix: formData.invoicePrefix.trim(),
            receiptPrefix: formData.receiptPrefix.trim(),
          }),
        });
        const data = (await resp.json().catch(() => null)) as {
          error?: string;
          config?: RawConfig;
          financeConfig?: RawConfig;
          data?: RawConfig;
        } | null;
        if (!resp.ok) {
          setError(data?.error ?? "Unable to create finance configuration.");
          return;
        }
        const raw = data?.config ?? data?.financeConfig ?? data?.data;
        if (raw) {
          const institution = institutions.find((i) => i.id === formData.institutionId);
          const created: FinanceConfig = {
            ...mapRawConfig(raw),
            institutionName:
              mapRawConfig(raw).institutionName ||
              institution?.institutionName ||
              "",
          };
          setFinanceConfigs((prev) => [created, ...prev]);
          setSelectedId(created.id);
          setMode("edit");
          setFormOpen(false);
          router.replace(`${pathname}?action=edit`);
          setFormData(emptyForm);
          setSuccessMessage("Finance configuration created successfully.");
        }
      } catch {
        setError("Unable to save finance configuration. Please try again.");
      } finally {
        setSubmitLoading(false);
      }
      return;
    }

    if (!selectedConfig) {
      setError("Please select a finance configuration to update.");
      setSubmitLoading(false);
      return;
    }

    try {
      const resp = await authFetch(
        `${API_BASE_URL}/api/institution-finance-config/edit/${selectedConfig.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionId: formData.institutionId,
            invoicePrefix: formData.invoicePrefix.trim(),
            receiptPrefix: formData.receiptPrefix.trim(),
          }),
        }
      );
      const data = (await resp.json().catch(() => null)) as {
        error?: string;
        config?: RawConfig;
        financeConfig?: RawConfig;
        data?: RawConfig;
      } | null;
      if (!resp.ok) {
        setError(data?.error ?? "Unable to update finance configuration.");
        return;
      }
      const raw = data?.config ?? data?.financeConfig ?? data?.data;
      const institution = institutions.find((i) => i.id === formData.institutionId);
      const updated: FinanceConfig = raw
        ? {
            ...mapRawConfig(raw),
            institutionName:
              mapRawConfig(raw).institutionName ||
              institution?.institutionName ||
              selectedConfig.institutionName,
          }
        : {
            ...selectedConfig,
            institutionId: formData.institutionId,
            institutionName:
              institution?.institutionName ?? selectedConfig.institutionName,
            invoicePrefix: formData.invoicePrefix.trim(),
            receiptPrefix: formData.receiptPrefix.trim(),
          };

      setFinanceConfigs((prev) =>
        prev.map((c) => (c.id === selectedConfig.id ? updated : c))
      );
      setSelectedId(updated.id);
      setFormOpen(false);
      setFormData(emptyForm);
      setSuccessMessage("Finance configuration updated successfully.");
    } catch {
      setError("Unable to update finance configuration. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="px-1">
      {/* Delete Confirmation Modal – placeholder (delete API not yet available) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Trash2 size={24} className="text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete Not Available</h3>
            <p className="mt-2 text-sm text-slate-600">
              Deleting finance configurations is not supported yet. This feature is coming soon.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <section>
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              {error ? (
                <div className="text-sm text-rose-700">{error}</div>
              ) : null}
              {successMessage ? (
                <div className="text-sm text-emerald-700">{successMessage}</div>
              ) : null}
            </div>
            <div></div>
            <div
              className="relative min-w-[200px] flex-1"
              style={{ marginLeft: "-15px" }}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by institution, invoice prefix, receipt prefix…"
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
                Create Config
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-5 overflow-hidden pt-4">
          {/* Records List */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Finance Configurations
                </h2>
                <p className="text-sm text-slate-500">
                  Edit records from the three-dot action menu.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {financeConfigs.length} records
              </span>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <div className="mt-3 max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto pb-2 pr-1">
                {financeConfigs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    No finance configurations yet. Use{" "}
                    <span className="font-medium text-slate-700">Create Config</span>{" "}
                    to add the first one.
                  </div>
                ) : filteredConfigs.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    No results match your search.
                  </div>
                ) : null}

                {filteredConfigs.map((config, index) => {
                  const isLast = index === filteredConfigs.length - 1;
                  const shouldOpenUp = filteredConfigs.length > 4 && isLast;
                  return (
                    <article
                      key={config.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-sm">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                            <h3
                              className="min-w-0 flex-1 break-words text-base font-semibold text-slate-900"
                              title={config.institutionName}
                            >
                              {config.institutionName}
                            </h3>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                            <span>
                              <span className="font-medium text-slate-700">Invoice:</span>{" "}
                              {config.invoicePrefix}
                            </span>
                            <span>
                              <span className="font-medium text-slate-700">Receipt:</span>{" "}
                              {config.receiptPrefix}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>
                              Invoice #{config.currentInvoiceNumber}
                            </span>
                            <span>
                              Receipt #{config.currentReceiptNumber}
                            </span>
                            <span>
                              Created{" "}
                              {new Date(config.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const el = e.currentTarget as HTMLElement;
                              const rect = el.getBoundingClientRect();
                              setMenuPos({
                                x: rect.left,
                                y: rect.top,
                                w: rect.width,
                                h: rect.height,
                              });
                              setOpenMenuId(
                                openMenuId === config.id ? null : config.id
                              );
                            }}
                            className="inline-flex h-5 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Open actions"
                          >
                            <EllipsisVertical size={15} />
                          </button>
                          {openMenuId === config.id && menuPos && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div
                                style={{
                                  position: "fixed",
                                  left: Math.max(
                                    Math.min(
                                      menuPos.x + menuPos.w - 144 - 8,
                                      window.innerWidth - 160
                                    ),
                                    8
                                  ),
                                  top: shouldOpenUp
                                    ? menuPos.y - 78
                                    : menuPos.y + menuPos.h + 6,
                                }}
                                className="z-50 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    startEditConfig(config);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                  <PencilLine size={14} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirmId(config.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-50"
                                  title="Coming Soon"
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
            )}
          </div>

          {/* Sticky Form */}
          {formOpen && (
            <div className="w-[280px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {mode === "create"
                      ? "Create Finance Config"
                      : "Edit Finance Config"}
                  </h3>
                </div>
                {mode === "edit" && selectedConfig ? (
                  <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <ChevronRight size={14} />
                    <span className="truncate">{selectedConfig.institutionName}</span>
                  </span>
                ) : null}
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Institution Dropdown */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Institution <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="institutionId"
                      value={formData.institutionId}
                      onChange={handleInputChange}
                      required
                      disabled={mode === "edit"}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                    >
                      <option value="">Select institution</option>
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.institutionName}
                        </option>
                      ))}
                    </select>
                    {mode === "edit" && (
                      <p className="mt-1 text-xs text-slate-400">
                        Institution cannot be changed after creation.
                      </p>
                    )}
                  </div>

                  {/* Invoice Prefix */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Invoice Prefix <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="invoicePrefix"
                      value={formData.invoicePrefix}
                      onChange={handleInputChange}
                      placeholder="e.g., INV"
                      maxLength={20}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Receipt Prefix */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Receipt Prefix <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="receiptPrefix"
                      value={formData.receiptPrefix}
                      onChange={handleInputChange}
                      placeholder="e.g., REC"
                      maxLength={20}
                      required
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : mode === "create" ? (
                      <Plus size={16} />
                    ) : (
                      <PencilLine size={16} />
                    )}
                    {submitLoading
                      ? "Saving…"
                      : mode === "create"
                      ? "Create"
                      : "Update"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setFormData(emptyForm);
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

// ── Helpers ──────────────────────────────────────────────────────────────────

type RawConfig = {
  id: string;
  institutionId: string;
  institution?: { institutionName?: string; name?: string };
  institutionName?: string;
  invoicePrefix: string;
  receiptPrefix: string;
  currentInvoiceNumber?: number;
  currentReceiptNumber?: number;
  createdAt: string;
};

function mapRawConfig(raw: RawConfig): FinanceConfig {
  return {
    id: raw.id,
    institutionId: raw.institutionId,
    institutionName:
      raw.institution?.institutionName ??
      raw.institution?.name ??
      raw.institutionName ??
      "",
    invoicePrefix: raw.invoicePrefix,
    receiptPrefix: raw.receiptPrefix,
    currentInvoiceNumber: raw.currentInvoiceNumber ?? 0,
    currentReceiptNumber: raw.currentReceiptNumber ?? 0,
    createdAt: raw.createdAt,
  };
}
