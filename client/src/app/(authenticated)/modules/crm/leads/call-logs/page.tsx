"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Calendar,
  Clock,
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BarChart3,
  Plus,
  CalendarCheck,
  RefreshCw,
  ChevronDown,
  X,
  PhoneOff,
  Voicemail,
  CircleDot,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Types (mirror schema enums) ───────────────────────────────────────────────

type CallType = "INBOUND" | "OUTBOUND";

type CallStatus = "ANSWERED" | "NO_RESPONSE" | "BUSY" | "REJECTED";

type CallResponse =
  | "CALL_BACK_LATER"
  | "WILL_JOIN"
  | "NEEDS_INFORMATION"
  | "THINKING"
  | "NOT_INTRESTED"
  | "WRONG_NUMBER";

type CallLog = {
  id: string;
  leadName: string;
  leadEmail: string;
  leadMobile: string;
  leadStudyLevel: string;
  counsellorName: string;
  counsellorAvatar: string; // initials
  callType: CallType;
  callStatus: CallStatus;
  callResponse?: CallResponse;
  notes?: string;
  callTime: string; // ISO
  nextFollowUp?: string; // ISO
};

// ── API response types ────────────────────────────────────────────────────────

type ApiCallLog = {
  id: string;
  callType: string;
  callStatus: string;
  callResponse: string;
  notes: string | null;
  callTime: string;
  nextFollowUp: string | null;
  applicantName: string;
  applicantMobileNo?: string;
  applicantEmail?: string;
  applicantStudyLevel?: string;
  // one of these will be present depending on the endpoint
  counsellorName?: string;
  consultantName?: string;
  assignedToName?: string;
};

// ── Map API response → CallLog ─────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function mapApiLog(log: ApiCallLog): CallLog {
  const name =
    log.assignedToName ?? log.counsellorName ?? log.consultantName ?? "";
  return {
    id: log.id,
    leadName: log.applicantName,
    leadEmail: log.applicantEmail ?? "",
    leadMobile: log.applicantMobileNo ?? "",
    leadStudyLevel: log.applicantStudyLevel ?? "",
    counsellorName: name,
    counsellorAvatar: getInitials(name),
    callType: log.callType as CallType,
    callStatus: log.callStatus as CallStatus,
    callResponse: log.callResponse as CallResponse | undefined,
    notes: log.notes ?? undefined,
    callTime: log.callTime,
    nextFollowUp: log.nextFollowUp ?? undefined,
  };
}

// ── Badge config ───────────────────────────────────────────────────────────────

const CALL_TYPE_STYLES: Record<CallType, { label: string; className: string; icon: React.ReactNode }> = {
  INBOUND: {
    label: "Inbound",
    className: "bg-indigo-50 text-indigo-700 border border-indigo-200",
    icon: <PhoneIncoming size={11} />,
  },
  OUTBOUND: {
    label: "Outbound",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: <PhoneOutgoing size={11} />,
  },
};

const CALL_STATUS_STYLES: Record<CallStatus, { label: string; className: string; dot: string }> = {
  ANSWERED: {
    label: "Answered",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  NO_RESPONSE: {
    label: "No Response",
    className: "bg-slate-100 text-slate-500 border border-slate-200",
    dot: "bg-slate-400",
  },
  BUSY: {
    label: "Busy",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
};

const CALL_RESPONSE_STYLES: Record<CallResponse, { label: string; className: string }> = {
  WILL_JOIN: { label: "Will Join", className: "bg-emerald-100 text-emerald-800" },
  CALL_BACK_LATER: { label: "Call Back", className: "bg-amber-100 text-amber-800" },
  NEEDS_INFORMATION: { label: "Needs Info", className: "bg-blue-100 text-blue-800" },
  THINKING: { label: "Thinking", className: "bg-slate-100 text-slate-600" },
  NOT_INTRESTED: { label: "Not Interested", className: "bg-rose-100 text-rose-800" },
  WRONG_NUMBER: { label: "Wrong Number", className: "bg-orange-100 text-orange-800" },
};

const AVATAR_PALETTE = [
  "bg-violet-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

function avatarColor(initials: string): string {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) hash += initials.charCodeAt(i);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function isOverdue(iso: string): boolean {
  return new Date(iso) < new Date();
}

const PAGE_SIZE = 8;

// ── Log-call form helpers ─────────────────────────────────────────────────────

type LeadOption = { id: string; name: string; mobile: string };

function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  enquiryId: "",
  callType: "OUTBOUND" as CallType,
  callStatus: "ANSWERED" as CallStatus,
  callResponse: "" as CallResponse | "",
  notes: "",
  callTime: "",
  nextFollowUp: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function CallLogsPage() {
  const { profile } = useProfile();
  const role = useRole();

  const [logs, setLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<CallType | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<CallStatus | "ALL">("ALL");
  const [filterResponse, setFilterResponse] = useState<CallResponse | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // ── Fetch call logs ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !role) return;

    const institutionId = profile.institution?.id;
    const entityId = profile.entityId;

    let url = "";

    if (role === "admissionCounsellor") {
      if (!entityId) {
        setFetchError("Profile ID not found. Please re-login.");
        setIsLoading(false);
        return;
      }
      url = `${API_BASE}/api/call-logs/counsellor/all/${entityId}`;
    } else if (role === "admissionConsultant") {
      if (!entityId) {
        setFetchError("Profile ID not found. Please re-login.");
        setIsLoading(false);
        return;
      }
      url = `${API_BASE}/api/call-logs/consultant/all/${entityId}`;
    } else if (
      role === "admissionDirector" ||
      role === "admissionIncharge" ||
      role === "collegeAdmin" ||
      role === "admin"
    ) {
      if (!institutionId) {
        setFetchError("Institution not found in your profile.");
        setIsLoading(false);
        return;
      }
      url = `${API_BASE}/api/call-logs/institution/${institutionId}`;
    } else {
      setFetchError("You do not have permission to view call logs.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError("");

    fetch(url, { credentials: "include" })
      .then((r) => r.json() as Promise<{ callLogs?: ApiCallLog[]; error?: string }>)
      .then((data) => {
        if (data.callLogs) {
          setLogs(data.callLogs.map(mapApiLog));
        } else {
          setLogs([]);
        }
      })
      .catch(() => setFetchError("Failed to connect to server."))
      .finally(() => setIsLoading(false));
  }, [profile, role]);

  // ── Log-call modal state ─────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalLeads, setModalLeads] = useState<LeadOption[]>([]);
  const [modalLeadsLoading, setModalLeadsLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, callTime: toDatetimeLocal(new Date()) });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canLogCall =
    role === "admissionCounsellor" || role === "admissionConsultant";

  // Fetch assigned leads when modal opens
  useEffect(() => {
    if (!showModal || !canLogCall || !profile) return;
    const institutionId = profile.institution?.id;
    const entityId = profile.entityId;
    if (!institutionId || !entityId) return;

    const url =
      role === "admissionCounsellor"
        ? `${API_BASE}/api/leads/counsellor/${institutionId}/${entityId}`
        : `${API_BASE}/api/leads/consultant/${institutionId}/${entityId}`;

    setModalLeadsLoading(true);
    fetch(url, { credentials: "include" })
      .then((r) => r.json() as Promise<{ leads?: { id: string; firstName: string; lastName: string; mobileNo: string }[] }>)
      .then((data) => {
        setModalLeads(
          (data.leads ?? []).map((l) => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            mobile: l.mobileNo,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setModalLeadsLoading(false));
  }, [showModal, canLogCall, profile, role]);

  function openModal() {
    setForm({ ...EMPTY_FORM, callTime: toDatetimeLocal(new Date()) });
    setFormError("");
    setShowModal(true);
  }

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.entityId) return;

    if (!form.enquiryId) { setFormError("Please select a lead."); return; }
    if (form.callStatus === "ANSWERED" && !form.callResponse) {
      setFormError("Please select an outcome for the answered call.");
      return;
    }

    const isCounsellor = role === "admissionCounsellor";
    const url = isCounsellor
      ? `${API_BASE}/api/call-logs/admissionCounsellor/create`
      : `${API_BASE}/api/call-logs/admissionConsultant/create`;

    const body: Record<string, unknown> = {
      [isCounsellor ? "counsellorId" : "consultantId"]: profile.entityId,
      enquiryId: form.enquiryId,
      callType: form.callType,
      callStatus: form.callStatus,
      callResponse: form.callStatus === "ANSWERED" ? form.callResponse : "N/A",
      notes: form.notes.trim() || null,
      callTime: new Date(form.callTime).toISOString(),
      nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp).toISOString() : null,
    };

    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; callLog?: ApiCallLog };
      if (!res.ok) {
        setFormError(data.error ?? "Failed to log call.");
        return;
      }
      if (data.callLog) {
        setLogs((prev) => [mapApiLog(data.callLog!), ...prev]);
      }
      setShowModal(false);
    } catch {
      setFormError("Failed to connect to server.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = logs.length;
    const answered = logs.filter((l) => l.callStatus === "ANSWERED").length;
    const followupsToday = logs.filter(
      (l) => l.nextFollowUp && isToday(l.nextFollowUp)
    ).length;
    const overdueFollowups = logs.filter(
      (l) => l.nextFollowUp && isOverdue(l.nextFollowUp) && !isToday(l.nextFollowUp)
    ).length;
    const responseRate = total > 0 ? Math.round((answered / total) * 100) : 0;
    const inbound = logs.filter((l) => l.callType === "INBOUND").length;
    const outbound = logs.filter((l) => l.callType === "OUTBOUND").length;
    return { total, answered, followupsToday, overdueFollowups, responseRate, inbound, outbound };
  }, [logs]);

  // ── Filtered & paginated data ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        log.leadName.toLowerCase().includes(q) ||
        log.leadMobile.includes(q) ||
        log.counsellorName.toLowerCase().includes(q) ||
        log.leadEmail.toLowerCase().includes(q);
      const matchesType = filterType === "ALL" || log.callType === filterType;
      const matchesStatus = filterStatus === "ALL" || log.callStatus === filterStatus;
      const matchesResponse = filterResponse === "ALL" || log.callResponse === filterResponse;
      return matchesSearch && matchesType && matchesStatus && matchesResponse;
    });
  }, [logs, search, filterType, filterStatus, filterResponse]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setFilterType("ALL");
    setFilterStatus("ALL");
    setFilterResponse("ALL");
    setCurrentPage(1);
  }

  const hasActiveFilters =
    filterType !== "ALL" || filterStatus !== "ALL" || filterResponse !== "ALL" || search !== "";

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white border-b border-slate-200 px-6 py-6">
        {/* Subtle gradient accent */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-50/60 via-transparent to-violet-50/40" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-md">
              <PhoneCall size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Track every call, response and follow-up across all leads.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={canLogCall ? openModal : undefined}
            disabled={!canLogCall}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={15} />
            Log a Call
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6">
        {/* ── Loading state ────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
            <Loader2 size={20} className="animate-spin text-indigo-500" />
            <span className="text-sm text-slate-500">Loading call logs…</span>
          </div>
        )}

        {/* ── Error state ──────────────────────────────────────────────── */}
        {!isLoading && fetchError && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
            <AlertCircle size={16} className="text-rose-500" />
            <span className="text-sm text-rose-700">{fetchError}</span>
          </div>
        )}

        {!isLoading && !fetchError && (
        <>
        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total Calls */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Total Calls
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Phone size={16} />
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold text-slate-900">{stats.total}</span>
              <span className="mb-1 flex items-center gap-1 text-xs text-emerald-600">
                <PhoneOutgoing size={11} /> {stats.outbound} out ·{" "}
                <PhoneIncoming size={11} /> {stats.inbound} in
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-linear-to-r from-indigo-400 to-violet-500"
                style={{ width: `${stats.total > 0 ? 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Response Rate */}
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-linear-to-br from-emerald-50 to-teal-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Response Rate
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <BarChart3 size={16} />
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-slate-900">{stats.responseRate}%</span>
              <span className="mb-1 text-xs text-slate-500">
                {stats.answered} answered
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all"
                style={{ width: `${stats.responseRate}%` }}
              />
            </div>
          </div>

          {/* Follow-ups Today */}
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-linear-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-amber-600">
                Follow-ups Today
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <CalendarCheck size={16} />
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-slate-900">{stats.followupsToday}</span>
              <span className="mb-1 text-xs text-slate-500">due today</span>
            </div>
            {stats.overdueFollowups > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5">
                <AlertCircle size={11} className="text-rose-500" />
                <span className="text-xs font-medium text-rose-600">
                  {stats.overdueFollowups} overdue
                </span>
              </div>
            )}
            {stats.overdueFollowups === 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">All on track</span>
              </div>
            )}
          </div>

          {/* Missed / Unreached */}
          <div className="flex flex-col gap-3 rounded-2xl border border-rose-100 bg-linear-to-br from-rose-50 to-pink-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-rose-500">
                Unreached
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
                <PhoneMissed size={16} />
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-slate-900">
                {logs.filter(
                  (l) =>
                    l.callStatus === "NO_RESPONSE" ||
                    l.callStatus === "BUSY" ||
                    l.callStatus === "REJECTED"
                ).length}
              </span>
              <span className="mb-1 text-xs text-slate-500">calls</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> No Resp.
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Busy
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> Rejected
              </span>
            </div>
          </div>
        </div>

        {/* ── Filter / Search bar ────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Top row */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by lead name, mobile or counsellor…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Toggle advanced filters */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition ${
                showFilters
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                  !
                </span>
              )}
            </button>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
              >
                <X size={13} />
                Reset
              </button>
            )}
          </div>

          {/* Advanced filter row */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              {/* Call Type */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400">Call Type</span>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                  {(["ALL", "INBOUND", "OUTBOUND"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setFilterType(t); setCurrentPage(1); }}
                      className={`px-3 py-1.5 text-xs font-medium transition ${
                        filterType === t
                          ? "bg-indigo-500 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t === "ALL" ? "All" : t === "INBOUND" ? "Inbound" : "Outbound"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Status */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400">Call Status</span>
                <div className="flex gap-1.5">
                  {(["ALL", "ANSWERED", "NO_RESPONSE", "BUSY", "REJECTED"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                        filterStatus === s
                          ? s === "ALL"
                            ? "bg-slate-700 text-white border-slate-700"
                            : s === "ANSWERED"
                            ? "bg-emerald-500 text-white border-emerald-500"
                            : s === "NO_RESPONSE"
                            ? "bg-slate-500 text-white border-slate-500"
                            : s === "BUSY"
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-rose-500 text-white border-rose-500"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {s === "ALL"
                        ? "All"
                        : s === "NO_RESPONSE"
                        ? "No Response"
                        : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Response */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400">Outcome</span>
                <div className="flex gap-1.5 flex-wrap">
                  {(["ALL", "WILL_JOIN", "CALL_BACK_LATER", "NEEDS_INFORMATION", "THINKING", "NOT_INTRESTED"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setFilterResponse(r); setCurrentPage(1); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                        filterResponse === r
                          ? "bg-violet-500 text-white border-violet-500"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {r === "ALL"
                        ? "All Outcomes"
                        : r === "WILL_JOIN"
                        ? "Will Join"
                        : r === "CALL_BACK_LATER"
                        ? "Call Back"
                        : r === "NEEDS_INFORMATION"
                        ? "Needs Info"
                        : r === "NOT_INTRESTED"
                        ? "Not Interested"
                        : "Thinking"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Result count ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-700">{filtered.length}</span> call
            {filtered.length !== 1 ? "s" : ""}
            {hasActiveFilters && " matching filters"}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw size={12} />
            <span>Live data from server</span>
          </div>
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <div className="col-span-3">Lead</div>
            <div className="col-span-2">Assigned To</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Outcome</div>
            <div className="col-span-2">Call Time</div>
            <div className="col-span-1">Follow-up</div>
          </div>

          {/* Rows */}
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <PhoneOff size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-400">No call logs found</p>
              <p className="text-xs text-slate-300">Try adjusting your filters</p>
            </div>
          ) : (
            paginated.map((log, idx) => {
              const typeStyle = CALL_TYPE_STYLES[log.callType];
              const statusStyle = CALL_STATUS_STYLES[log.callStatus];
              const responseStyle = log.callResponse
                ? CALL_RESPONSE_STYLES[log.callResponse]
                : null;
              const { date, time } = formatDateTime(log.callTime);
              const followup = log.nextFollowUp ? formatDateTime(log.nextFollowUp) : null;
              const followupOverdue =
                log.nextFollowUp && isOverdue(log.nextFollowUp) && !isToday(log.nextFollowUp);
              const followupToday = log.nextFollowUp && isToday(log.nextFollowUp);
              const color = avatarColor(log.counsellorAvatar);

              return (
                <div
                  key={log.id}
                  className={`grid grid-cols-12 gap-4 items-center px-5 py-4 transition hover:bg-slate-50/70 ${
                    idx !== paginated.length - 1 ? "border-b border-slate-100" : ""
                  }`}
                >
                  {/* Lead info */}
                  <div className="col-span-3 flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-sm font-semibold text-slate-900">
                      {log.leadName}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Phone size={10} />
                      <span>{log.leadMobile}</span>
                    </div>
                    <span className="truncate text-xs text-slate-400">{log.leadEmail}</span>
                  </div>

                  {/* Counsellor */}
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${color}`}
                    >
                      {log.counsellorAvatar}
                    </span>
                    <span className="truncate text-sm text-slate-700">{log.counsellorName}</span>
                  </div>

                  {/* Call Type */}
                  <div className="col-span-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${typeStyle.className}`}
                    >
                      {typeStyle.icon}
                      {typeStyle.label}
                    </span>
                  </div>

                  {/* Call Status */}
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle.className}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                      {statusStyle.label}
                    </span>
                    {log.notes && (
                      <p className="mt-1 truncate text-xs text-slate-400" title={log.notes}>
                        {log.notes.length > 36 ? log.notes.slice(0, 36) + "…" : log.notes}
                      </p>
                    )}
                  </div>

                  {/* Call Response */}
                  <div className="col-span-1">
                    {responseStyle ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${responseStyle.className}`}
                      >
                        {responseStyle.label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>

                  {/* Call Time */}
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-slate-700">{date}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={10} />
                      {time}
                    </div>
                  </div>

                  {/* Follow-up */}
                  <div className="col-span-1">
                    {followup ? (
                      <span
                        className={`inline-flex flex-col gap-0 rounded-xl px-2.5 py-1.5 text-xs font-medium ${
                          followupOverdue
                            ? "bg-rose-50 text-rose-700"
                            : followupToday
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span>{followup.date}</span>
                        <span className="font-normal opacity-70">{followup.time}</span>
                        {followupOverdue && (
                          <span className="mt-0.5 text-rose-500 font-semibold">Overdue</span>
                        )}
                        {followupToday && (
                          <span className="mt-0.5 text-amber-600 font-semibold">Today</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-700">{currentPage}</span> of{" "}
              <span className="font-semibold text-slate-700">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                    page === currentPage
                      ? "bg-indigo-500 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Follow-ups panel ──────────────────────────────────────────── */}
        {(stats.followupsToday > 0 || stats.overdueFollowups > 0) && (
          <div className="rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarCheck size={16} className="text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-900">
                Upcoming Follow-ups
              </h3>
              {stats.overdueFollowups > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  <AlertCircle size={10} />
                  {stats.overdueFollowups} overdue
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {logs.filter((l) => l.nextFollowUp).map((log) => {
                const fu = formatDateTime(log.nextFollowUp!);
                const overdue = isOverdue(log.nextFollowUp!) && !isToday(log.nextFollowUp!);
                const today = isToday(log.nextFollowUp!);
                return (
                  <div
                    key={log.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                      overdue
                        ? "bg-rose-50 border border-rose-200"
                        : today
                        ? "bg-white border border-amber-200"
                        : "bg-white border border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                          avatarColor(log.counsellorAvatar)
                        }`}
                      >
                        {log.counsellorAvatar}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{log.leadName}</p>
                        <p className="text-xs text-slate-400">{log.counsellorName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span
                        className={`text-xs font-semibold ${
                          overdue ? "text-rose-600" : today ? "text-amber-700" : "text-slate-600"
                        }`}
                      >
                        {overdue ? "Overdue · " : today ? "Today · " : ""}{fu.date}
                      </span>
                      <span className="text-xs text-slate-400">{fu.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* ── Log a Call modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-sm">
                  <PhoneCall size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Log a Call</h2>
                  <p className="text-xs text-slate-400">Record the call details below</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
              >
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogCall} className="flex flex-col gap-5 overflow-y-auto px-6 py-5">

              {/* Lead select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Lead *</label>
                {modalLeadsLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                    <Loader2 size={13} className="animate-spin" /> Loading leads…
                  </div>
                ) : (
                  <select
                    required
                    value={form.enquiryId}
                    onChange={(e) => setForm((f) => ({ ...f, enquiryId: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">— Select a lead —</option>
                    {modalLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {l.mobile}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Call Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Call Type *</label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200">
                  {(["OUTBOUND", "INBOUND"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, callType: t }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition ${
                        form.callType === t
                          ? "bg-indigo-500 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t === "OUTBOUND" ? <PhoneOutgoing size={13} /> : <PhoneIncoming size={13} />}
                      {t === "OUTBOUND" ? "Outbound" : "Inbound"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Call Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Call Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["ANSWERED", "NO_RESPONSE", "BUSY", "REJECTED"] as const).map((s) => {
                    const style = CALL_STATUS_STYLES[s];
                    const active = form.callStatus === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, callStatus: s, callResponse: "" }))}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                          active ? style.className + " ring-2 ring-indigo-300" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${active ? style.dot : "bg-slate-300"}`} />
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Call Response — only when ANSWERED */}
              {form.callStatus === "ANSWERED" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600">Outcome *</label>
                  <div className="flex flex-wrap gap-2">
                    {(["WILL_JOIN", "CALL_BACK_LATER", "NEEDS_INFORMATION", "THINKING", "NOT_INTRESTED", "WRONG_NUMBER"] as const).map((r) => {
                      const style = CALL_RESPONSE_STYLES[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, callResponse: r }))}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                            form.callResponse === r
                              ? "bg-violet-500 text-white border-violet-500"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Call Time */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Call Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={form.callTime}
                  onChange={(e) => setForm((f) => ({ ...f, callTime: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Next Follow-up */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Next Follow-up <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="datetime-local"
                  value={form.nextFollowUp}
                  onChange={(e) => setForm((f) => ({ ...f, nextFollowUp: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Add any relevant notes about this call…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5">
                  <AlertCircle size={14} className="text-rose-500" />
                  <span className="text-sm text-rose-700">{formError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                  {submitting ? "Saving…" : "Save Call Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
