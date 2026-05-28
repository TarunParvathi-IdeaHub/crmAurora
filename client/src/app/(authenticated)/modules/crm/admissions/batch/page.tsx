"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  EllipsisVertical,
  GraduationCap,
  PencilLine,
  Plus,
  Search,
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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

type BatchProgram = {
  id: string;
  programName: string;
  programSname: string;
  levelId: string;
  levelName: string;
};

type Batch = {
  id: string;
  batchName: string;
  isActive: boolean;
  institutionName: string;
  programs: BatchProgram[];
  programsByLevel: Record<string, BatchProgram[]>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

const emptyForm = {
  batchName: "",
  startDate: "",
  endDate: "",
  selectedProgramIds: [] as string[],
};

export default function BatchManagementPage() {
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
  const [batches, setBatches] = useState<Batch[]>([]);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openDropdownLevel, setOpenDropdownLevel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedBatch = useMemo(
    () => batches.find((b) => b.id === selectedBatchId) ?? null,
    [batches, selectedBatchId]
  );

  const filteredBatches = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return batches;
    return batches.filter((b) => b.batchName.toLowerCase().includes(q));
  }, [batches, searchQuery]);

  // Group programOptions by levelName
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

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load institution
        const instRes = await fetch(`${API_BASE_URL}/api/institutions/current`, {
          credentials: "include",
        });
        const instData = await instRes.json();
        const inst: Institution = instData.institution;
        setInstitution(inst);

        // Load programmes and batches in parallel
        const [progRes, batchRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/programmes/active/by-institution/${inst.id}`),
          fetch(`${API_BASE_URL}/api/batches`, { credentials: "include" }),
        ]);
        const progData: ProgramOption[] = await progRes.json();
        const batchData = await batchRes.json();
        setProgramOptions(Array.isArray(progData) ? progData : []);
        setBatches(batchData.batches || []);
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

  useEffect(() => {
    if (mode === "edit" && selectedBatch) {
      setFormData({
        batchName: selectedBatch.batchName,
        startDate: "",
        endDate: "",
        selectedProgramIds: selectedBatch.programs.map((p) => p.id),
      });
    }
  }, [mode, selectedBatch]);

  const updateUrlMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFormOpen(true);
    router.replace(`${pathname}?action=${nextMode}`);
  };

  const startCreate = () => {
    setSelectedBatchId("");
    setFormData(emptyForm);
    setError("");
    updateUrlMode("create");
  };

  const startEdit = (batch: Batch) => {
    setSelectedBatchId(batch.id);
    setError("");
    updateUrlMode("edit");
  };

  const toggleProgram = (programId: string) => {
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

    if (!formData.batchName.trim()) {
      setError("Batch name is required.");
      return;
    }
    if (formData.selectedProgramIds.length === 0) {
      setError("Select at least one program.");
      return;
    }

    setLoading(true);
    const payload: Record<string, unknown> = {
      batchName: formData.batchName.trim(),
      programIds: formData.selectedProgramIds,
    };
    if (formData.startDate) payload.startDate = formData.startDate;
    if (formData.endDate) payload.endDate = formData.endDate;

    try {
      if (mode === "create") {
        const res = await fetch(`${API_BASE_URL}/api/batches/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error || "Unable to create batch.");
          return;
        }
        setBatches((prev) => [data.batch, ...prev]);
        setFormOpen(false);
        setFormData(emptyForm);
        return;
      }

      if (!selectedBatch) return;
      const res = await fetch(`${API_BASE_URL}/api/batches/${selectedBatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Unable to update batch.");
        return;
      }
      setBatches((prev) =>
        prev.map((b) => (b.id === selectedBatch.id ? data.batch : b))
      );
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
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
                placeholder="Search Batch..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <Plus size={16} />
              Create Batch
            </button>
          </div>
        </div>

        <div className="flex gap-5 overflow-hidden pt-4">
          {/* Batch list */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Batches</h2>
                <p className="text-sm text-slate-500">Create and manage batches with programme assignments.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {batches.length} records
              </span>
            </div>

            <div className="mt-3 max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto pb-2 pr-1">
              {filteredBatches.map((batch) => (
                <article
                  key={batch.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                      <GraduationCap size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {batch.batchName}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            batch.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {batch.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">{batch.institutionName}</p>
                      {/* Programme tags grouped by level */}
                      {Object.entries(batch.programsByLevel).map(([levelName, progs]) => (
                        <div key={levelName} className="mt-2">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            {levelName}
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {progs.map((p) => (
                              <span
                                key={p.id}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700"
                              >
                                {p.programName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="relative shrink-0" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuId(openMenuId === batch.id ? null : batch.id)
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <EllipsisVertical size={16} />
                      </button>
                      {openMenuId === batch.id && (
                        <div className="absolute right-0 top-8 z-30 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null);
                              startEdit(batch);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <PencilLine size={14} />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {filteredBatches.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                  No batches found.
                </div>
              )}
            </div>
          </div>

          {/* Right-side form panel */}
          {formOpen && (
            <div className="w-[340px] shrink-0 border-l border-slate-200 pl-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  {mode === "create" ? "Create Batch" : "Edit Batch"}
                </h3>
                {mode === "edit" && selectedBatch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <ChevronRight size={14} />
                    {selectedBatch.batchName}
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

                {/* Batch Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Batch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.batchName}
                    onChange={(e) =>
                      setFormData({ ...formData, batchName: e.target.value })
                    }
                    placeholder="e.g. 2025-2027"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
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
                        onToggleProgram={toggleProgram}
                      />
                    ))}
                    {levelNames.length === 0 && (
                      <p className="text-xs text-slate-400">No programs available.</p>
                    )}
                  </div>
                </div>

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

// â”€â”€ Sub-component: collapsible programme checkbox group per level â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

