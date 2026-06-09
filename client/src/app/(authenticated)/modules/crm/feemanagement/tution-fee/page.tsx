"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronDown, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { useProfile } from "@/providers/ProfileProvider";
import { authFetch } from "@/lib/utils/authFetch";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

type Institution = {
  id: string;
  institutionName: string;
  institutionCode: string;
  isActive?: boolean;
};

type ProgramOption = {
  id: string;
  programName: string;
  programSname: string;
  levelId: string;
  levelName: string;
};

type DegreeLevelOption = {
  id: string;
  levelName: string;
};

type BatchOption = {
  id: string;
  batchName: string;
};

type TuitionFeeRow = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  programId: string;
  programName: string;
  programSname: string;
  levelId: string;
  levelName: string;
  batchId: string;
  batchName: string;
  amount: number;
  isActive: boolean;
  createdAt: string;
};

type RawTuitionFeeRow = TuitionFeeRow;

type Mode = "create" | "edit";

type FormState = {
  institutionId: string;
  selectedProgramIds: string[];
  batchId: string;
  amount: string;
  isActive: boolean;
};

type ProgramGroup = {
  levelId: string;
  levelName: string;
  programs: ProgramOption[];
};

const readOnlyInstitutionRoles = new Set(["admissionDirector", "admissionIncharge"]);

function createEmptyForm(institutionId = ""): FormState {
  return {
    institutionId,
    selectedProgramIds: [],
    batchId: "",
    amount: "",
    isActive: true,
  };
}

function groupProgramsByLevel(programs: ProgramOption[]): ProgramGroup[] {
  const grouped = new Map<string, ProgramGroup>();
  
  programs.forEach((program) => {
    const key = program.levelId;
    if (!grouped.has(key)) {
      grouped.set(key, {
        levelId: program.levelId,
        levelName: program.levelName,
        programs: [],
      });
    }
    grouped.get(key)!.programs.push(program);
  });
  
  return Array.from(grouped.values());
}


export default function ProgramFeeManagementPage() {
  const role = useRole();
  const { profile } = useProfile();

  const isInstitutionLocked = readOnlyInstitutionRoles.has(role ?? "");
  const lockedInstitutionId = isInstitutionLocked ? profile?.institution?.id ?? "" : "";

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState(lockedInstitutionId);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([]);
  const [tuitionFees, setTuitionFees] = useState<TuitionFeeRow[]>([]);
  const [mode, setMode] = useState<Mode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [formData, setFormData] = useState(createEmptyForm(lockedInstitutionId));
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (levelId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(levelId)
        ? prev.filter((id) => id !== levelId)
        : [...prev, levelId]
    );
  };

  const selectedFee = useMemo(
    () => tuitionFees.find((fee) => fee.id === selectedFeeId) ?? null,
    [selectedFeeId, tuitionFees]
  );

  const filteredTuitionFees = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return tuitionFees;
    return tuitionFees.filter((fee) => {
      return (
        fee.institutionName.toLowerCase().includes(query) ||
        fee.institutionCode.toLowerCase().includes(query) ||
        fee.programName.toLowerCase().includes(query) ||
        fee.programSname.toLowerCase().includes(query) ||
        fee.levelName.toLowerCase().includes(query) ||
        fee.batchName.toLowerCase().includes(query) ||
        String(fee.amount).includes(query)
      );
    });
  }, [searchQuery, tuitionFees]);

  const filteredProgramOptions = useMemo(() => programOptions, [programOptions]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  useEffect(() => {
    if (isInstitutionLocked) {
      if (profile?.institution) {
        setInstitutions([
          {
            id: profile.institution.id,
            institutionName: profile.institution.institutionName,
            institutionCode: profile.institution.institutionCode,
            isActive: true,
          },
        ]);
        setSelectedInstitutionId(profile.institution.id);
      }
      return;
    }

    const loadInstitutions = async () => {
      try {
        const response = await authFetch(`${API_BASE_URL}/api/institutions`);
        const data = (await response.json().catch(() => null)) as
          | { institutions?: Institution[] }
          | null;

        if (!response.ok) {
          return;
        }

        const list = (data?.institutions ?? []).filter((institution) => institution.isActive !== false);
        setInstitutions(list);
        setSelectedInstitutionId((current) => current || list[0]?.id || "");
      } catch {
        setError("Unable to load institutions.");
      }
    };

    loadInstitutions();
  }, [isInstitutionLocked, profile]);

  useEffect(() => {
    if (!selectedInstitutionId && !isInstitutionLocked && institutions.length > 0) {
      setSelectedInstitutionId(institutions[0].id);
    }
  }, [institutions, isInstitutionLocked, selectedInstitutionId]);

  useEffect(() => {
    if (!isInstitutionLocked || !profile?.institution) {
      return;
    }

    if (!selectedInstitutionId) {
      setSelectedInstitutionId(profile.institution.id);
    }

    if (mode === "create" && !formData.institutionId) {
      setFormData(createEmptyForm(profile.institution.id));
    }
  }, [isInstitutionLocked, profile?.institution, selectedInstitutionId, mode, formData.institutionId]);

  useEffect(() => {
    if (!selectedInstitutionId) {
      setProgramOptions([]);
      setBatchOptions([]);
      setTuitionFees([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadInstitutionData = async () => {
      setLoading(true);
      setError("");

      try {
        const [programResponse, batchResponse, feeResponse] = await Promise.all([
          authFetch(`${API_BASE_URL}/api/programmes/active/by-institution/${selectedInstitutionId}`),
          authFetch(`${API_BASE_URL}/api/batches/active/by-institution/${selectedInstitutionId}`),
          authFetch(`${API_BASE_URL}/api/program-tuition-fees/${selectedInstitutionId}`),
        ]);

        const programData = (await programResponse.json().catch(() => null)) as
          | Array<{ id: string; programName: string; programSname: string; level?: { id?: string; levelName?: string } }>
          | null;
        const batchData = (await batchResponse.json().catch(() => null)) as
          | { batches?: BatchOption[] }
          | null;
        const feeData = (await feeResponse.json().catch(() => null)) as
          | { programTuitionFees?: RawTuitionFeeRow[] }
          | null;

        if (cancelled) return;

        if (!programResponse.ok || !batchResponse.ok || !feeResponse.ok) {
          setError(
            (feeData as { error?: string } | null)?.error ||
              (batchData as { error?: string } | null)?.error ||
              "Unable to load tuition fee data."
          );
          setProgramOptions([]);
          setBatchOptions([]);
          setTuitionFees([]);
          return;
        }

        setProgramOptions(
          (programData ?? []).map((program) => ({
            id: program.id,
            programName: program.programName,
            programSname: program.programSname,
            levelId: program.level?.id ?? "",
            levelName: program.level?.levelName ?? "",
          }))
        );
        setBatchOptions(batchData?.batches ?? []);
        setTuitionFees(feeData?.programTuitionFees ?? []);
        setSelectedFeeId((current) => current || feeData?.programTuitionFees?.[0]?.id || "");
      } catch {
        if (!cancelled) {
          setError("Unable to connect to the backend. Please ensure the server is running.");
          setProgramOptions([]);
          setBatchOptions([]);
          setTuitionFees([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInstitutionData();

    return () => {
      cancelled = true;
    };
  }, [selectedInstitutionId]);

  useEffect(() => {
    if (mode === "create") {
      setFormData(createEmptyForm(selectedInstitutionId || lockedInstitutionId));
      return;
    }

    if (selectedFee) {
      setFormData({
        institutionId: selectedFee.institutionId,
        selectedProgramIds: [selectedFee.programId],
        batchId: selectedFee.batchId,
        amount: String(selectedFee.amount),
        isActive: selectedFee.isActive,
      });
    }
  }, [lockedInstitutionId, mode, selectedFee, selectedInstitutionId]);

  useEffect(() => {
    if (tuitionFees.length === 0) {
      setSelectedFeeId("");
      if (mode === "edit") {
        setMode("create");
      }
      return;
    }

    if (!selectedFeeId) {
      setSelectedFeeId(tuitionFees[0].id);
    }
  }, [mode, selectedFeeId, tuitionFees]);

  const handleInstitutionChange = (institutionId: string) => {
    setSelectedInstitutionId(institutionId);
    setFormData(createEmptyForm(institutionId));
    setSelectedFeeId("");
    setFormOpen(false);
    setMode("create");
  };

  const startCreate = () => {
    setMode("create");
    setFormOpen(true);
    setSelectedFeeId("");
    setFormData(createEmptyForm(selectedInstitutionId || lockedInstitutionId));
  };

  const startEdit = (fee: TuitionFeeRow) => {
    setSelectedFeeId(fee.id);
    setMode("edit");
    setFormOpen(true);
    setFormData({
      institutionId: fee.institutionId,
      selectedProgramIds: [fee.programId],
      batchId: fee.batchId,
      amount: String(fee.amount),
      isActive: fee.isActive,
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.institutionId) {
      setError("Please select an institution.");
      return;
    }

    if (formData.selectedProgramIds.length === 0) {
      setError("Please select at least one program.");
      return;
    }

    if (!formData.batchId) {
      setError("Please select a batch.");
      return;
    }

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Please enter a valid non-negative fee amount.");
      return;
    }

    setSubmitLoading(true);

    try {
      const createdOrUpdatedFees: RawTuitionFeeRow[] = [];

      // Create/update fees for all selected programs
      for (const programId of formData.selectedProgramIds) {
        const payload = {
          institutionId: formData.institutionId,
          programId,
          batchId: formData.batchId,
          amount,
          isActive: formData.isActive,
        };

        const response = await authFetch(
          `${API_BASE_URL}/api/program-tuition-fees/${mode === "create" ? "create" : "update"}`,
          {
            method: mode === "create" ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              mode === "create"
                ? payload
                : {
                    id: selectedFee?.id,
                    ...payload,
                  }
            ),
          }
        );

        const data = (await response.json().catch(() => null)) as
          | { error?: string; programTuitionFee?: RawTuitionFeeRow }
          | null;

        if (!response.ok) {
          setError(data?.error || `Unable to save tuition fee for program ${programId}.`);
          return;
        }

        if (data?.programTuitionFee) {
          createdOrUpdatedFees.push(data.programTuitionFee);
        }
      }

      if (createdOrUpdatedFees.length > 0) {
        setTuitionFees((previous) => {
          if (mode === "create") {
            return [...createdOrUpdatedFees, ...previous];
          }

          // For edit mode, replace the updated fees
          let updated = previous;
          createdOrUpdatedFees.forEach((fee) => {
            updated = updated.map((f) => (f.id === fee.id ? fee : f));
          });
          return updated;
        });

        setSelectedFeeId(createdOrUpdatedFees[0].id);
      }

      setMode("edit");
      setFormOpen(false);
      setSuccessMessage(
        mode === "create"
          ? `Tuition fees created successfully for ${createdOrUpdatedFees.length} program(s).`
          : `Tuition fees updated successfully for ${createdOrUpdatedFees.length} program(s).`
      );
    } catch {
      setError("Unable to save tuition fee. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAmountInput = (value: string) => {
    // allow only digits and one decimal point, limit to 2 decimals
    if (value === "") {
      setFormData((previous) => ({ ...previous, amount: "" }));
      return;
    }

    // remove any character except digits and dot
    let cleaned = value.replace(/[^0-9.]/g, "");

    // keep only first dot
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      const before = cleaned.slice(0, firstDot + 1);
      const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
      cleaned = before + after;
    }

    // limit to two decimal places if dot present
    if (cleaned.includes(".")) {
      const [intPart, decPart] = cleaned.split(".");
      cleaned = intPart + "." + (decPart || "").slice(0, 2);
    }

    setFormData((previous) => ({ ...previous, amount: cleaned }));
  };

  const handleDelete = async (feeId: string) => {
    setError("");
    try {
      const response = await authFetch(`${API_BASE_URL}/api/program-tuition-fees/delete/${feeId}`, {
        method: "DELETE",
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error || "Unable to delete tuition fee.");
        return;
      }

      setTuitionFees((previous) => {
        const next = previous.filter((fee) => fee.id !== feeId);
        setSelectedFeeId(next[0]?.id ?? "");
        return next;
      });
      setSuccessMessage("Tuition fee deleted successfully.");
    } catch {
      setError("Unable to delete tuition fee. Please try again.");
    }
  };

  return (
    <div className="px-1">
      {deleteConfirmId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 size={24} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete Tuition Fee?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will remove the batch-specific fee amount for the selected program.
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
      ) : null}

      <section>
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/60 p-4 shadow-sm sm:p-5">
          <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)_auto] lg:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Institution</label>
              {isInstitutionLocked ? (
                <div className="mt-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600">
                  {profile?.institution?.institutionName ?? "Loading institution..."}
                </div>
              ) : (
                <select
                  value={selectedInstitutionId}
                  onChange={(event) => handleInstitutionChange(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.institutionName} ({institution.institutionCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-slate-700">Search</label>
              <Search className="pointer-events-none absolute left-3 top-[2.6rem] h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by program, batch, amount, or institution"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={startCreate}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 lg:justify-self-end"
            >
              <Plus size={16} />
              Create Batch Fee
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {successMessage ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-5 flex gap-5 overflow-hidden">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Batch Fee Records</h2>
                <p className="text-sm text-slate-500">
                  Each record connects one program to one batch and stores a separate tuition amount.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {tuitionFees.length} records
              </span>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  Loading tuition fees...
                </div>
              ) : tuitionFees.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  No batch tuition fees yet. Use <span className="font-medium text-slate-700">Create Batch Fee</span> to add the first one.
                </div>
              ) : filteredTuitionFees.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                  No records match your search.
                </div>
              ) : null}

              {filteredTuitionFees.map((fee) => (
                <article
                  key={fee.id}
                  className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:border-slate-300 ${
                    fee.id === selectedFeeId ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                        <span className="text-sm font-semibold">TF</span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-900" title={fee.programName}>
                          {fee.programName} <span className="text-slate-400">({fee.programSname})</span>
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {fee.batchName} · {fee.levelName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {fee.institutionName} ({fee.institutionCode})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 lg:min-w-max lg:flex-row lg:items-center lg:gap-4 lg:border-0 lg:pt-0">
                      <div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => startEdit(fee)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <PencilLine size={15} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(fee.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>

                      <div className="flex flex-nowrap items-center gap-3 lg:shrink-0 lg:justify-end">
                        <div className="shrink-0 text-base font-semibold text-slate-900 sm:text-base lg:text-lg">
                          ₹{fee.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {formOpen ? (
            <div className="w-[360px] shrink-0 border-l border-slate-200 pl-4 lg:sticky lg:top-6 lg:self-start">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {mode === "create" ? "Create Batch Fee" : "Edit Batch Fee"}
                  </h3>
                </div>
                {mode === "edit" && selectedFee ? (
                  <span className="inline-flex max-w-[11rem] items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <ChevronRight size={14} />
                    <span className="truncate">{selectedFee.batchName}</span>
                  </span>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Institution <span className="text-rose-500">*</span>
                  </label>
                  {isInstitutionLocked ? (
                    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600">
                      {profile?.institution?.institutionName ?? "Loading institution..."}
                    </div>
                  ) : (
                    <select
                      value={formData.institutionId}
                      onChange={(event) => handleInstitutionChange(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">Select institution</option>
                      {institutions.map((institution) => (
                        <option key={institution.id} value={institution.id}>
                          {institution.institutionName} ({institution.institutionCode})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Batch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.batchId}
                    onChange={(event) => setFormData((previous) => ({ ...previous, batchId: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select batch</option>
                    {batchOptions.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-700">
                      Programs <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-xs font-medium text-slate-500">
                      {formData.selectedProgramIds.length} selected
                    </span>
                  </div>

                  {groupProgramsByLevel(filteredProgramOptions).length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                      No programs available
                    </div>
                  ) : (
                    groupProgramsByLevel(filteredProgramOptions).map((group) => {
                      const allInGroupSelected = group.programs.every((p) =>
                        formData.selectedProgramIds.includes(p.id)
                      );
                      const selectedCount = group.programs.filter((p) =>
                        formData.selectedProgramIds.includes(p.id)
                      ).length;
                      const isExpanded = expandedGroups.includes(group.levelId);

                      return (
                        <div
                          key={group.levelId}
                          className="relative rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                        >
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.levelId)}
                            className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                          >
                            <span className="font-medium text-slate-700">
                              {group.levelName} Programs
                              {selectedCount > 0 && (
                                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                  {selectedCount}
                                </span>
                              )}
                            </span>
                            <ChevronDown
                              size={16}
                              className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>

                          {isExpanded && (
                            <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
                              <div className="max-h-52 overflow-y-auto p-1">
                                {group.programs.length === 0 ? (
                                  <p className="px-3 py-2 text-xs text-slate-400">No programs.</p>
                                ) : (
                                  group.programs.map((program) => (
                                    <label
                                      key={program.id}
                                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formData.selectedProgramIds.includes(program.id)}
                                        onChange={() => {
                                          setFormData((prev) => {
                                            if (prev.selectedProgramIds.includes(program.id)) {
                                              return {
                                                ...prev,
                                                selectedProgramIds: prev.selectedProgramIds.filter(
                                                  (id) => id !== program.id
                                                ),
                                              };
                                            }

                                            return {
                                              ...prev,
                                              selectedProgramIds: [...prev.selectedProgramIds, program.id],
                                            };
                                          });
                                        }}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="truncate text-slate-900">
                                        {program.programSname} - {program.programName}
                                      </span>
                                    </label>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tuition Fee Amount <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.amount}
                    onChange={(event) => handleAmountInput(event.target.value)}
                    placeholder="Enter batch fee amount"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {mode === "edit" ? (
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <button
                      type="button"
                      onClick={() => setFormData((previous) => ({ ...previous, isActive: !previous.isActive }))}
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
                ) : null}

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
                    {submitLoading ? "Saving…" : mode === "create" ? "Create" : "Update"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
                      setFormData(createEmptyForm(selectedInstitutionId || lockedInstitutionId));
                    }}
                    className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
