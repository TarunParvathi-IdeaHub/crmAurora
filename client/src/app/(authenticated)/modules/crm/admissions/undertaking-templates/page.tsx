"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Pencil, Eye, CheckCircle, XCircle, ClipboardList, Copy,
  Search, ChevronDown, FileText, ArrowLeft, Loader2, AlertCircle, BookOpen,
} from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import type { UndertakingTemplate, UndertakingTemplateContent } from "./types";
import { DEFAULT_CONTENT, genId } from "./utils";
import TemplateBuilder from "./TemplateBuilder";
import TemplatePreview from "./TemplatePreview";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

type ProgrammeOption = { id: string; programName: string; programCode: string };
type ViewMode = "list" | "builder" | "preview";
type ServerTemplate = {
  id: string; title: string; version: string; description?: string;
  isActive: boolean; publishedAt?: string; content: unknown;
};

export default function UndertakingTemplates() {
  const { profile } = useProfile();

  // ── Page state ──────────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<UndertakingTemplate[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeTemplate, setActiveTemplate] = useState<UndertakingTemplate | null>(null);

  // List state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProgrammeId, setFilterProgrammeId] = useState("");
  const [listError, setListError] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Builder state
  const [saving, setSaving] = useState(false);
  const [builderError, setBuilderError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [programmeDropdownOpen, setProgrammeDropdownOpen] = useState(false);
  const programmeDropdownRef = useRef<HTMLDivElement>(null);

  // Shared: available programmes
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [loadingProgrammes, setLoadingProgrammes] = useState(false);

  // ── Fetch templates from server ──────────────────────────────────────────────
  async function fetchTemplates(progs: ProgrammeOption[], institutionId: string) {
    if (!institutionId || progs.length === 0) { setTemplates([]); return; }
    setLoadingTemplates(true);
    setListError("");
    try {
      const results = await Promise.allSettled(
        progs.map(async (prog) => {
          const res = await fetch(
            `${API_BASE_URL}/api/undertaking-templates/by-program?institutionId=${encodeURIComponent(institutionId)}&programId=${encodeURIComponent(prog.id)}`,
            { credentials: "include" }
          );
          if (res.status === 404) return null;
          if (!res.ok) throw new Error();
          const data = (await res.json()) as { template: ServerTemplate };
          return { srv: data.template, programId: prog.id };
        })
      );
      const map = new Map<string, UndertakingTemplate>();
      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value) continue;
        const { srv, programId } = r.value;
        const key = `${srv.title}||${srv.version}`;
        if (map.has(key)) {
          map.get(key)!.programmeIds!.push(programId);
        } else {
          map.set(key, {
            id: srv.id,
            title: srv.title,
            version: srv.version,
            description: srv.description,
            isActive: srv.isActive,
            publishedAt: srv.publishedAt,
            createdAt: srv.publishedAt ?? new Date().toISOString(),
            content: srv.content as UndertakingTemplateContent,
            programmeIds: [programId],
          });
        }
      }
      setTemplates(Array.from(map.values()));
    } catch {
      setListError("Failed to load templates.");
    } finally {
      setLoadingTemplates(false);
    }
  }

  // ── Fetch programmes ────────────────────────────────────────────────────────
  useEffect(() => {
    const institutionId = profile?.institution?.id;
    const url = institutionId
      ? `${API_BASE_URL}/api/programmes/active/by-institution/${institutionId}`
      : `${API_BASE_URL}/api/programmes`;
    setLoadingProgrammes(true);
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then(async (data: { programmes?: ProgrammeOption[] }) => {
        const progs = data.programmes ?? [];
        setProgrammes(progs);
        if (institutionId) await fetchTemplates(progs, institutionId);
      })
      .catch(() => { setProgrammes([]); })
      .finally(() => setLoadingProgrammes(false));
  }, [profile]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (programmeDropdownRef.current && !programmeDropdownRef.current.contains(e.target as Node))
        setProgrammeDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.version.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q);
    const matchesProgramme =
      !filterProgrammeId || (t.programmeIds ?? []).includes(filterProgrammeId);
    return matchesSearch && matchesProgramme;
  });

  // ── List actions ────────────────────────────────────────────────────────────
  function openCreate() {
    const blank: UndertakingTemplate = {
      id: genId(),
      title: "",
      version: "v1",
      description: "",
      isActive: false,
      createdAt: new Date().toISOString(),
      content: DEFAULT_CONTENT,
      programmeIds: [],
    };
    setActiveTemplate(blank);
    setViewMode("builder");
  }

  function openEdit(template: UndertakingTemplate) {
    setBuilderError("");
    setSaveSuccess("");
    setActiveTemplate({ ...template });
    setViewMode("builder");
  }

  function openCopy(template: UndertakingTemplate) {
    setBuilderError("");
    setSaveSuccess("");
    setActiveTemplate({
      ...template,
      id: genId(),
      title: `Copy of ${template.title}`,
      isActive: false,
      publishedAt: undefined,
      createdAt: new Date().toISOString(),
      content: JSON.parse(JSON.stringify(template.content)) as typeof template.content,
      programmeIds: [...(template.programmeIds ?? [])],
    });
    setViewMode("builder");
  }

  function openPreview(template: UndertakingTemplate) {
    setActiveTemplate(template);
    setViewMode("preview");
  }

  async function toggleActive(id: string) {
    const target = templates.find((t) => t.id === id);
    if (!target) return;

    const nextActive = !target.isActive;
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: nextActive } : t))
    );

    try {
      const res = await fetch(`${API_BASE_URL}/api/undertaking-templates/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, isActive: nextActive }),
      });

      if (!res.ok) {
        throw new Error();
      }

      const data = (await res.json()) as { template?: ServerTemplate; error?: string };
      const updatedTemplate = data?.template;
      if (updatedTemplate) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isActive: updatedTemplate.isActive } : t))
        );
      }
    } catch {
      setListError('Failed to update template activation status. Please try again.');
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isActive: target.isActive } : t))
      );
    }
  }

  // ── Builder: save → POST /api/undertaking-templates/create per programme ───
  async function saveTemplate(template: UndertakingTemplate) {
    setBuilderError("");
    setSaveSuccess("");

    if (!template.title.trim()) { setBuilderError("Template title is required."); return; }
    if (!template.version.trim()) { setBuilderError("Version is required."); return; }

    const selectedIds = template.programmeIds ?? [];
    const institutionId = profile?.institution?.id;
    const editMode = templates.some((t) => t.id === template.id);

    if (!institutionId) { setBuilderError("Institution not found. Please reload and try again."); return; }
    if (selectedIds.length === 0) { setBuilderError("Select at least one programme to save the template."); return; }

    setSaving(true);
    setBuilderError("");

    try {
      if (editMode) {
        const res = await fetch(`${API_BASE_URL}/api/undertaking-templates/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: template.id,
            title: template.title.trim(),
            version: template.version.trim(),
            description: template.description?.trim() || undefined,
            content: template.content,
            isActive: template.isActive,
            programmeIds: selectedIds,
          }),
        });

        const data = (await res.json().catch(() => null)) as { template?: ServerTemplate; error?: string } | null;
        if (!res.ok) {
          throw new Error(data?.error || "Failed to update template.");
        }

        setSaveSuccess("Template updated successfully.");
      } else {
        const errors: string[] = [];

        for (const programId of selectedIds) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/undertaking-templates/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                institutionId,
                programId,
                title: template.title.trim(),
                version: template.version.trim(),
                description: template.description?.trim() || undefined,
                content: template.content,
              }),
            });
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            if (!res.ok && res.status !== 409) {
              const name = programmes.find((p) => p.id === programId)?.programName ?? programId;
              errors.push(`${name}: ${data?.error ?? "Failed."}`);
            }
          } catch {
            errors.push(
              `${programmes.find((p) => p.id === programId)?.programName ?? programId}: Network error.`
            );
          }
        }

        if (errors.length > 0) {
          throw new Error(errors.join(" · "));
        }

        setSaveSuccess(`Saved for ${selectedIds.length} programme${selectedIds.length > 1 ? "s" : ""}.`);
      }
    } catch (error) {
      setBuilderError(error instanceof Error ? error.message : "Failed to save template.");
      setSaving(false);
      return;
    }

    setSaving(false);
    void fetchTemplates(programmes, institutionId);

    setTimeout(() => { setViewMode("list"); setActiveTemplate(null); setSaveSuccess(""); }, 1500);
  }

  function updateActiveContent(content: UndertakingTemplateContent) {
    if (!activeTemplate) return;
    setActiveTemplate({ ...activeTemplate, content });
  }

  function programmeName(id: string) {
    return programmes.find((p) => p.id === id)?.programName ?? id;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PREVIEW VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (viewMode === "preview" && activeTemplate) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("builder")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{activeTemplate.title}</h2>
              <p className="text-xs text-slate-400">v{activeTemplate.version} · Preview mode</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">Read-only</span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <TemplatePreview content={activeTemplate.content} />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BUILDER VIEW
  // ════════════════════════════════════════════════════════════════════════════
  if (viewMode === "builder" && activeTemplate) {
    const selectedCount = activeTemplate.programmeIds?.length ?? 0;
    return (
      <div className="flex h-full flex-col">
        {/* Builder top bar */}
        <div className="border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Metadata fields */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText size={14} />
                </div>
                <input
                  type="text"
                  value={activeTemplate.title}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, title: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Template title *"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={activeTemplate.version}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, version: e.target.value })}
                  className="w-32 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Version (e.g. v1) *"
                />
                <input
                  type="text"
                  value={activeTemplate.description ?? ""}
                  onChange={(e) => setActiveTemplate({ ...activeTemplate, description: e.target.value })}
                  className="min-w-40 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Short description (optional)"
                />

                {/* Programme multi-select with checkboxes */}
                <div className="relative" ref={programmeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProgrammeDropdownOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                      selectedCount > 0
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                    }`}
                  >
                    <BookOpen size={13} />
                    {selectedCount === 0
                      ? "Assign Programmes"
                      : `${selectedCount} programme${selectedCount > 1 ? "s" : ""}`}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${programmeDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {programmeDropdownOpen && (
                    <div className="absolute left-0 top-full z-50 mt-1.5 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 px-4 py-2.5">
                        <p className="text-xs font-semibold text-slate-700">Select Programmes</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          One template record is created per selected programme
                        </p>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {loadingProgrammes ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                          </div>
                        ) : programmes.length === 0 ? (
                          <p className="px-4 py-4 text-xs text-slate-400">
                            No active programmes found for your institution.
                          </p>
                        ) : (
                          programmes.map((prog) => {
                            const checked = activeTemplate.programmeIds?.includes(prog.id) ?? false;
                            return (
                              <label
                                key={prog.id}
                                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const ids = activeTemplate.programmeIds ?? [];
                                    setActiveTemplate({
                                      ...activeTemplate,
                                      programmeIds: checked
                                        ? ids.filter((id) => id !== prog.id)
                                        : [...ids, prog.id],
                                    });
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-slate-800">{prog.programName}</p>
                                  <p className="text-xs text-slate-400">{prog.programCode}</p>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                      {selectedCount > 0 && (
                        <div className="border-t border-slate-100 px-4 py-2">
                          <p className="text-xs font-medium text-indigo-600">
                            {selectedCount} programme{selectedCount > 1 ? "s" : ""} selected
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {builderError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  {builderError}
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                  <CheckCircle size={13} className="shrink-0" />
                  {saveSuccess}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => { setViewMode("list"); setActiveTemplate(null); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => openPreview(activeTemplate)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                <Eye size={14} /> Preview
              </button>
              <button
                onClick={() => { void saveTemplate(activeTemplate); }}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {saving ? "Saving…" : "Save Template"}
              </button>
            </div>
          </div>
        </div>

        {/* Split editor / live preview */}
        <div className="grid flex-1 overflow-hidden lg:grid-cols-2">
          <div className="flex flex-col overflow-auto border-r border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Template Editor</p>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <TemplateBuilder content={activeTemplate.content} onChange={updateActiveContent} />
            </div>
          </div>
          <div className="flex flex-col overflow-auto bg-slate-50/40">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live Preview</p>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <TemplatePreview content={activeTemplate.content} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Undertaking Templates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage admission undertaking templates per programme.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={15} /> New Template
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, version, description…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={filterProgrammeId}
          onChange={(e) => setFilterProgrammeId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">All Programmes</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>{p.programName}</option>
          ))}
        </select>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          {filteredTemplates.length} / {templates.length}
        </span>
      </div>

      {listError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={15} className="shrink-0" />
          {listError}
        </div>
      )}

      {/* Cards */}
      {loadingTemplates ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ClipboardList size={26} />
          </div>
          <p className="text-base font-semibold text-slate-700">No templates yet</p>
          <p className="mt-1.5 max-w-xs text-sm text-slate-400">
            Create your first undertaking template and assign it to one or more programmes.
          </p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={15} /> Create Template
          </button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Search size={22} className="mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No templates match your filters.</p>
          <button
            onClick={() => { setSearchQuery(""); setFilterProgrammeId(""); }}
            className="mt-3 text-xs font-medium text-indigo-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTemplates.map((tpl) => {
            const assigned = (tpl.programmeIds ?? []).map((id) => programmeName(id));
            return (
              <div
                key={tpl.id}
                className="group flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FileText size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{tpl.title}</span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {tpl.version}
                      </span>
                      {tpl.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                          <CheckCircle size={10} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
                          <XCircle size={10} /> Inactive
                        </span>
                      )}
                    </div>
                    {tpl.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{tpl.description}</p>
                    )}
                    {assigned.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {assigned.slice(0, 4).map((name) => (
                          <span key={name} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            <BookOpen size={10} /> {name}
                          </span>
                        ))}
                        {assigned.length > 4 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            +{assigned.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-1.5 text-xs text-slate-400">
                      Created {new Date(tpl.createdAt).toLocaleDateString("en-IN")}
                      {tpl.publishedAt && (
                        <> · Published {new Date(tpl.publishedAt).toLocaleDateString("en-IN")}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleActive(tpl.id)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
                  >
                    {tpl.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => openPreview(tpl)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Eye size={12} /> Preview
                  </button>
                  <button
                    onClick={() => openCopy(tpl)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <button
                    onClick={() => openEdit(tpl)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
