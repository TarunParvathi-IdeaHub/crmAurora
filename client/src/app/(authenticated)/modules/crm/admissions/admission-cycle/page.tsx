"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  GraduationCap,
  PencilLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/utils/authFetch";

type Mode = "create" | "edit";

type Institution = {
  id: string;
  institutionName: string;
};

type ProgramOption = {
  id: string;
  programName: string;
  programSname: string;
  level: { id: string; levelName: string };
};

type BatchOption = {
  id: string;
  batchName: string;
};

type AdmissionCycleRow = {
  id: string;
  admissionCycleName: string;
  institutionId: string;
  levelId: string;
  programId: string;
  isActive: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

const emptyForm = {
  batchId: "",
  admissionCyclePrefix: "",
  selectedProgramIds: [] as string[],
  isActive: true,
};

export default function AdmissionCycleManagementPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const menuRef = useRef<HTMLDivElement>(null);

  const initialAction = searchParams?.get("action");
  const [mode, setMode] = useState<Mode>(
    initialAction === "edit" ? "edit" : "create"
  );
  const [formOpen, setFormOpen] = useState(false);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [cycleRows, setCycleRows] = useState<AdmissionCycleRow[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<AdmissionCycleRow | null>(null);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editName, setEditName] = useState("");
  const [editProgramId, setEditProgramId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openDropdownLevel, setOpenDropdownLevel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Group cycleRows by prefix (text before first "-")
  const cycleGroups = useMemo(() => {
    const grouped = new Map<string, AdmissionCycleRow[]>();
    for (const row of cycleRows) {
      const prefix = row.admissionCycleName.split("-")[0]?.trim() ?? row.admissionCycleName;
      if (!grouped.has(prefix)) grouped.set(prefix, []);
      grouped.get(prefix)!.push(row);
    }
    return Array.from(grouped.entries()).map(([prefix, cycles]) => ({
      prefix,
      cycles,
    }));
  }, [cycleRows]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return cycleGroups;
    return cycleGroups.filter(
      (g) =>
        g.prefix.toLowerCase().includes(q) ||
        g.cycles.some((c) => c.admissionCycleName.toLowerCase().includes(q))
    );
  }, [cycleGroups, searchQuery]);

  // Group programOptions by levelName for checkbox UI
  const programsByLevel = useMemo(() => {
    const map: Record<string, ProgramOption[]> = {};
    for (const p of programOptions) {
      const key = p.level.levelName;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  }, [programOptions]);

  const levelNames = useMemo(() => Object.keys(programsByLevel).sort(), [programsByLevel]);

  const getProgramName = useCallback(
    (programId: string) =>
      programOptions.find((p) => p.id === programId)?.programName ?? "",
    [programOptions]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const instRes = await authFetch(`${API_BASE_URL}/api/institutions/current`);
        const instData = await instRes.json();
        const inst: Institution = instData.institution;
        setInstitution(inst);

        const [progRes, batchRes, cycleRes] = await Promise.all([
          authFetch(`${API_BASE_URL}/api/programmes/active/by-institution/${inst.id}`),
          authFetch(`${API_BASE_URL}/api/batches/active/by-institution/${inst.id}`),
          authFetch(`${API_BASE_URL}/api/admission-cycles/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ institutionId: inst.id }),
          }),
        ]);

        const progData = await progRes.json();
        const batchData = await batchRes.json();
        const cycleData = await cycleRes.json();

        // API returns { programmes: [...] }, not a bare array
        setProgramOptions(
          Array.isArray(progData?.programmes) ? progData.programmes : []
        );
        setBatches(batchData.batches || []);
        setCycleRows(cycleData.admissionCycles || []);
      } catch (err) {
        console.error(err);
        setError("Unable to load data.");
      }
    };
    loadData();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateUrlMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFormOpen(true);
    router.replace(`${pathname}?action=${nextMode}`);
  };

  const startCreate = () => {
    setFormData(emptyForm);
    setError("");
    updateUrlMode("create");
  };

  const startEdit = (cycle: AdmissionCycleRow) => {
    setSelectedCycle(cycle);
    setEditName(cycle.admissionCycleName);
    setEditProgramId(cycle.programId);
    setError("");
    updateUrlMode("edit");
  };

  const handleProgramToggle = (programId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedProgramIds.includes(programId);
      return {
        ...prev,
        selectedProgramIds: exists
          ? prev.selectedProgramIds.filter((id) => id !== programId)
          : [...prev.selectedProgramIds, programId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setLoading(true);
    try {
      if (mode === "create") {
        if (!formData.admissionCyclePrefix.trim()) {
          setError("Admission cycle prefix is required.");
          return;
        }
        if (formData.selectedProgramIds.length === 0) {
          setError("Select at least one program.");
          return;
        }

        const payload = {
          institutionId: institution?.id,
          batchId: formData.batchId || undefined,
          admissionCyclePrefix: formData.admissionCyclePrefix.trim(),
          programIds: formData.selectedProgramIds,
          isActive: formData.isActive,
        };

        const res = await authFetch(`${API_BASE_URL}/api/admission-cycles/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || "Unable to create admission cycle.");
          return;
        }

        setCycleRows((prev) => [...prev, ...(data.admissionCycles || [])]);
        setFormOpen(false);
        setFormData(emptyForm);
        return;
      }

      // Edit mode
      if (!selectedCycle) return;

      const res = await authFetch(`${API_BASE_URL}/api/admission-cycles/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCycle.id,
          admissionCycleName: editName.trim(),
          institutionId: selectedCycle.institutionId,
          levelId:
            editProgramId !== selectedCycle.programId
              ? programOptions.find((p) => p.id === editProgramId)?.level.id ?? selectedCycle.levelId
              : selectedCycle.levelId,
          programId: editProgramId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Unable to update admission cycle.");
        return;
      }

      setCycleRows((prev) =>
        prev.map((row) =>
          row.id === selectedCycle.id ? data.admissionCycle : row
        )
      );
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cycle: AdmissionCycleRow) => {
    if (!confirm(`Delete "${cycle.admissionCycleName}"?`)) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/api/admission-cycles/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cycle.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.error || "Unable to delete.");
        return;
      }
      setCycleRows((prev) => prev.filter((r) => r.id !== cycle.id));
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    }
  };

  return (
    <div className="px-1">
      <section>
        {/* Header bar */}
        <div className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              {error && <div className="text-sm text-rose-600">{error}</div>}
            </div>
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Admission Cycle..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={16} />
              Create Admission Cycle
            </button>
          </div>
        </div>

        <div className="flex gap-5 overflow-hidden pt-4">
          {/* List */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Admission Cycles
                </h2>
                <p className="text-sm text-slate-500">
                  Create and manage admission cycles per programme.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {cycleGroups.length} groups &middot; {cycleRows.length} cycles
              </span>
            </div>

            <div
              className="mt-3 max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto pb-2 pr-1"
              ref={menuRef}
            >
              {filteredGroups.map((group) => (
                <article
                  key={group.prefix}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm shrink-0">
                      <GraduationCap size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-900">
                        {group.prefix}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.cycles.map((cycle) => (
                          <div
                            key={cycle.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                          >
                            <span>
                              {getProgramName(cycle.programId) ||
                                cycle.admissionCycleName.split("-").slice(1).join("-").trim()}
                            </span>
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                cycle.isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(
                                  openMenuId === cycle.id ? null : cycle.id
                                );
                              }}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              <EllipsisVertical size={12} />
                            </button>
                            {openMenuId === cycle.id && (
                              <div className="absolute z-30 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    startEdit(cycle);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <PencilLine size={14} />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(cycle)}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
              {filteredGroups.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                  No admission cycles found.
                </div>
              )}
            </div>
          </div>

          {/* Right-side form panel */}
          {formOpen && (
            <div className="w-[340px] shrink-0 border-l border-slate-200 pl-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {mode === "create" ? "Create Admission Cycle" : "Edit Admission Cycle"}
                </h3>
                {mode === "edit" && selectedCycle && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <ChevronRight size={14} />
                    {selectedCycle.admissionCycleName.split("-")[0]?.trim()}
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Institution (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Institution
                  </label>
                  <input
                    type="text"
                    value={institution?.institutionName ?? ""}
                    readOnly
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500"
                  />
                </div>

                {mode === "create" ? (
                  <>
                    {/* Batch dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Batch
                      </label>
                      <select
                        value={formData.batchId}
                        onChange={(e) =>
                          setFormData({ ...formData, batchId: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Select a batch (optional)</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batchName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Prefix */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Admission Cycle Prefix <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.admissionCyclePrefix}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            admissionCyclePrefix: e.target.value,
                          })
                        }
                        placeholder="e.g. AUCET2026"
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Cycle names will be generated as: {formData.admissionCyclePrefix || "PREFIX"}-&lt;programSname&gt;
                      </p>
                    </div>

                    {/* Programs grouped by level */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Programs <span className="text-rose-500">*</span>
                      </label>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formData.selectedProgramIds.length} selected
                      </p>
                      <div className="mt-2 space-y-2">
                        {levelNames.map((levelName) => (
                          <LevelDropdown
                            key={levelName}
                            levelName={levelName}
                            programs={programsByLevel[levelName]}
                            selectedIds={formData.selectedProgramIds}
                            open={openDropdownLevel === levelName}
                            onToggle={() =>
                              setOpenDropdownLevel(
                                openDropdownLevel === levelName ? null : levelName
                              )
                            }
                            onToggleProgram={handleProgramToggle}
                          />
                        ))}
                        {levelNames.length === 0 && (
                          <p className="text-xs text-slate-400">No programs available.</p>
                        )}
                      </div>
                    </div>

                    {/* Status toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Status</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {formData.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
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
                  </>
                ) : (
                  <>
                    {/* Edit: cycle name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Cycle Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Edit: program single-select */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Program
                      </label>
                      <select
                        value={editProgramId}
                        onChange={(e) => setEditProgramId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Select program</option>
                        {programOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.programName} ({p.level.levelName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {mode === "create" ? <Plus size={16} /> : <PencilLine size={16} />}
                    {loading ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormOpen(false);
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

// ── Sub-component: collapsible programme checkbox group per level ─────────────
type LevelDropdownProps = {
  levelName: string;
  programs: ProgramOption[];
  selectedIds: string[];
  open: boolean;
  onToggle: () => void;
  onToggleProgram: (id: string) => void;
};

function LevelDropdown({
  levelName,
  programs,
  selectedIds,
  open,
  onToggle,
  onToggleProgram,
}: LevelDropdownProps) {
  const selectedCount = programs.filter((p) => selectedIds.includes(p.id)).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
      >
        <span className="font-medium text-slate-700">
          {levelName} Programs
          {selectedCount > 0 && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {selectedCount}
            </span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-52 overflow-y-auto p-1">
            {programs.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">No programs.</p>
            ) : (
              programs.map((program) => (
                <label
                  key={program.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(program.id)}
                    onChange={() => onToggleProgram(program.id)}
                    className="rounded"
                  />
                  <span>{program.programName}</span>
                  {program.programSname && (
                    <span className="ml-auto text-xs text-slate-400">
                      {program.programSname}
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
