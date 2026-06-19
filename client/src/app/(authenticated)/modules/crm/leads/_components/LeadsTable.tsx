"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import {
  Eye,
  Pencil,
  EllipsisVertical,
  Search,
  Trash2,
  ArrowRightCircle,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  PhoneCall,
  Mail,
  Phone,
  MapPin,
  User,
  BookOpen,
  GraduationCap,
  Calendar,
  AlertCircle,
  Loader2,
  Check,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeadFilter = "all" | "ug" | "pg" | "phd";

type Lead = {
  id: string;
  firstName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  studyLevel: string;
  programApplied: string;
  admissionCycle: string;
  hasApplication: boolean;
  leadSourceType?: string | null;
  // Only present for director / incharge responses
  admissionCounsellor?: string | null;
  admissionConsultant?: string | null;
};

type Counsellor = {
  id: string;
  empId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileNo: string;
  designation: string;
};

type LeadDetail = {
  id: string;
  firstName: string;
  lastName: string;
  mobileNo: string;
  email: string;
  state: string;
  institutionId: string;
  levelId: string;
  programId: string;
  admissionCycleId: string;
  degreeLevel: { id: string; levelName: string };
  program: { id: string; programName: string };
  admissionCycle: { id: string; admissionCycleName: string };
};

type CallLog = {
  id: string;
  callTime: string;
  callStatus: string;
  callType: string;
  callResponse: string;
  notes?: string | null;
  role?: "COUNSELLOR" | "CONSULTANT";
  assignedTo?: string;
};

type CallLogForm = {
  date: string;
  time: string;
  status: string;
  type: string;
  response: string;
  note: string;
  nextFollowUp: string;
};

interface LeadsTableProps {
  filter: LeadFilter;
  pageTitle: string;
  pageDescription: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const PAGE_SIZE = 10;

const CALL_STATUS_STYLES: Record<string, { label: string; className: string }> = {
  ANSWERED: {
    label: "Connected",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Missed",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  BUSY: {
    label: "Follow-up",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  NO_RESPONSE: {
    label: "No Response",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

const STATUS_OPTIONS = [
  { value: "ANSWERED", label: "Connected" },
  { value: "REJECTED", label: "Missed" },
  { value: "BUSY", label: "Follow-up" },
  { value: "NO_RESPONSE", label: "No Response" },
];

const TYPE_OPTIONS = [
  { value: "INBOUND", label: "Incoming" },
  { value: "OUTBOUND", label: "Outgoing" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildApiUrl(
  role: string,
  filter: LeadFilter,
  institutionId: string,
  entityId: string,
): string {
  const filterSegment = filter === "all" ? "" : `/${filter}`;

  if (role === "admissionDirector" || role === "admissionIncharge") {
    return filter === "all"
      ? `${API_BASE}/api/leads/getall/${institutionId}`
      : `${API_BASE}/api/leads${filterSegment}/${institutionId}`;
  }

  if (role === "admissionCounsellor") {
    return filter === "all"
      ? `${API_BASE}/api/leads/counsellor/${institutionId}/${entityId}`
      : `${API_BASE}/api/leads/counsellor${filterSegment}/${institutionId}/${entityId}`;
  }

  if (role === "admissionConsultant") {
    return filter === "all"
      ? `${API_BASE}/api/leads/consultant/${institutionId}/${entityId}`
      : `${API_BASE}/api/leads/consultant${filterSegment}/${institutionId}/${entityId}`;
  }

  return "";
}

function formatDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
  };
}

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date: Date): string {
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded-md bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LeadsTable({ filter, pageTitle, pageDescription }: LeadsTableProps) {
  const router = useRouter();
  const { profile } = useProfile();
  const role = useRole();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Forward modal
  const [forwardLead, setForwardLead] = useState<Lead | null>(null);
  const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
  const [counsellorsLoading, setCounsellorsLoading] = useState(false);
  const [counsellorSearch, setCounsellorSearch] = useState("");
  const [selectedCounsellorId, setSelectedCounsellorId] = useState("");
  const [forwardSaving, setForwardSaving] = useState(false);
  const [forwardError, setForwardError] = useState("");

  // Detail / edit modal
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", mobileNo: "", email: "", state: "",
    levelId: "", programId: "", admissionCycleId: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Edit form dropdown options (cascading)
  type DropdownOpt = { id: string; label: string };
  const [editDegreeLevels, setEditDegreeLevels] = useState<DropdownOpt[]>([]);
  const [editPrograms, setEditPrograms] = useState<DropdownOpt[]>([]);
  const [editAdmissionCycles, setEditAdmissionCycles] = useState<DropdownOpt[]>([]);
  const [editDegreeLoading, setEditDegreeLoading] = useState(false);
  const [editProgramLoading, setEditProgramLoading] = useState(false);
  const [editCycleLoading, setEditCycleLoading] = useState(false);

  // Add Lead modal
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    firstName: "", lastName: "", mobileNo: "", email: "", state: "",
    levelId: "", programId: "", admissionCycleId: "",
  });
  const [addLeadSaving, setAddLeadSaving] = useState(false);
  const [addLeadError, setAddLeadError] = useState("");
  const [addLeadDegreeLevels, setAddLeadDegreeLevels] = useState<DropdownOpt[]>([]);
  const [addLeadPrograms, setAddLeadPrograms] = useState<DropdownOpt[]>([]);
  const [addLeadAdmissionCycles, setAddLeadAdmissionCycles] = useState<DropdownOpt[]>([]);
  const [addLeadDegreeLoading, setAddLeadDegreeLoading] = useState(false);
  const [addLeadProgramLoading, setAddLeadProgramLoading] = useState(false);
  const [addLeadCycleLoading, setAddLeadCycleLoading] = useState(false);

  const [expandedCallLogLeadId, setExpandedCallLogLeadId] = useState<string | null>(null);
  const [callLogsLead, setCallLogsLead] = useState<Lead | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [callLogsError, setCallLogsError] = useState("");
  const [createLogOpen, setCreateLogOpen] = useState(false);
  const [createLogForm, setCreateLogForm] = useState<CallLogForm>({
    date: "",
    time: "",
    status: "",
    type: "",
    response: "",
    note: "",
    nextFollowUp: "",
  });
  const [createLogSaving, setCreateLogSaving] = useState(false);
  const [createLogError, setCreateLogError] = useState("");

  const isDirectorOrIncharge =
    role === "admissionDirector" || role === "admissionIncharge";
  const isCounsellor = role === "admissionCounsellor";
  const isConsultant = role === "admissionConsultant";
  const canCreateLogs = isCounsellor || isConsultant;
  const canManageLeads = isDirectorOrIncharge;
  const canAddLead = isCounsellor || isConsultant || isDirectorOrIncharge;

  // ── Add Lead: cascading dropdowns ────────────────────────────────────────────

  useEffect(() => {
    if (!addLeadOpen || !profile?.institution?.id) return;
    let cancelled = false;
    setAddLeadDegreeLoading(true);
    fetch(`${API_BASE}/api/degree-levels/by-institution/${profile.institution.id}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ degreeLevels?: { id: string; levelName: string }[] }>)
      .then((data) => {
        if (cancelled) return;
        setAddLeadDegreeLevels((data.degreeLevels ?? []).map((l) => ({ id: l.id, label: l.levelName })));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAddLeadDegreeLoading(false); });
    return () => { cancelled = true; };
  }, [addLeadOpen, profile?.institution?.id]);

  useEffect(() => {
    if (!addLeadOpen || !profile?.institution?.id || !addLeadForm.levelId) { setAddLeadPrograms([]); return; }
    let cancelled = false;
    setAddLeadProgramLoading(true);
    fetch(`${API_BASE}/api/programme/${profile.institution.id}/${addLeadForm.levelId}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ id: string; programName: string; programSname: string }[]>)
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setAddLeadPrograms(arr.map((p) => ({ id: p.id, label: `${p.programSname} - ${p.programName}` })));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAddLeadProgramLoading(false); });
    return () => { cancelled = true; };
  }, [addLeadOpen, profile?.institution?.id, addLeadForm.levelId]);

  useEffect(() => {
    if (!addLeadOpen || !profile?.institution?.id || !addLeadForm.levelId || !addLeadForm.programId) {
      setAddLeadAdmissionCycles([]); return;
    }
    let cancelled = false;
    setAddLeadCycleLoading(true);
    fetch(
      `${API_BASE}/api/admission-cycles/latest-active?institutionId=${profile.institution.id}&levelId=${addLeadForm.levelId}&programId=${addLeadForm.programId}`,
      { credentials: "include" }
    )
      .then((r) => r.json() as Promise<{ id?: string; admissionCycleName?: string; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        if (data.id && data.admissionCycleName) {
          setAddLeadAdmissionCycles([{ id: data.id, label: data.admissionCycleName }]);
          setAddLeadForm((prev) => ({ ...prev, admissionCycleId: data.id! }));
        } else {
          setAddLeadAdmissionCycles([]);
          setAddLeadForm((prev) => ({ ...prev, admissionCycleId: "" }));
        }
      })
      .catch(() => { if (!cancelled) { setAddLeadAdmissionCycles([]); setAddLeadForm((prev) => ({ ...prev, admissionCycleId: "" })); } })
      .finally(() => { if (!cancelled) setAddLeadCycleLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLeadOpen, profile?.institution?.id, addLeadForm.levelId, addLeadForm.programId]);

  // ── Fetch leads ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!profile || !role) return;

    const institutionId = profile.institution?.id;
    const entityId = profile.entityId;

    if (!institutionId) {
      setError("Institution not found in your profile.");
      setLoading(false);
      return;
    }

    if (
      (role === "admissionCounsellor" || role === "admissionConsultant") &&
      !entityId
    ) {
      setError("Profile ID not found. Please re-login.");
      setLoading(false);
      return;
    }

    const url = buildApiUrl(role, filter, institutionId, entityId ?? "");

    if (!url) {
      setError("You do not have permission to view leads.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setLeads([]);

    fetch(url, { credentials: "include" })
      .then((r) => r.json() as Promise<{ leads?: Lead[]; error?: string }>)
      .then((data) => {
        if (data.leads) {
          setLeads(data.leads);
        } else {
          setError(data.error ?? "No leads found.");
        }
      })
      .catch(() => setError("Failed to connect to server."))
      .finally(() => setLoading(false));
  }, [profile, role, filter]);

  // ── Close menu on outside click ──────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Cascading dropdowns for edit form ────────────────────────────────────────

  // Fetch degree levels for the institution when edit panel opens
  useEffect(() => {
    if (!isEditing || !leadDetail?.institutionId) return;
    let cancelled = false;
    setEditDegreeLoading(true);
    fetch(`${API_BASE}/api/degree-levels/by-institution/${leadDetail.institutionId}`, {
      credentials: "include",
    })
      .then((r) => r.json() as Promise<{ degreeLevels?: { id: string; levelName: string }[] }>)
      .then((data) => {
        if (cancelled) return;
        setEditDegreeLevels((data.degreeLevels ?? []).map((l) => ({ id: l.id, label: l.levelName })));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setEditDegreeLoading(false); });
    return () => { cancelled = true; };
  }, [isEditing, leadDetail?.institutionId]);

  // Fetch programs when level changes in edit form
  useEffect(() => {
    if (!isEditing || !leadDetail?.institutionId || !editForm.levelId) {
      setEditPrograms([]);
      return;
    }
    let cancelled = false;
    setEditProgramLoading(true);
    fetch(`${API_BASE}/api/programme/${leadDetail.institutionId}/${editForm.levelId}`, {
      credentials: "include",
    })
      .then((r) => r.json() as Promise<{ id: string; programName: string; programSname: string }[]>)
      .then((data) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        setEditPrograms(arr.map((p) => ({ id: p.id, label: `${p.programSname} - ${p.programName}` })));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setEditProgramLoading(false); });
    return () => { cancelled = true; };
  }, [isEditing, leadDetail?.institutionId, editForm.levelId]);

  // Fetch admission cycles when program changes in edit form
  useEffect(() => {
    if (!isEditing || !leadDetail?.institutionId || !editForm.levelId || !editForm.programId) {
      setEditAdmissionCycles([]);
      return;
    }
    let cancelled = false;
    setEditCycleLoading(true);
    fetch(
      `${API_BASE}/api/admission-cycles/latest-active?institutionId=${leadDetail.institutionId}&levelId=${editForm.levelId}&programId=${editForm.programId}`,
      { credentials: "include" }
    )
      .then((r) => r.json() as Promise<{ id?: string; admissionCycleName?: string; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        if (data.id && data.admissionCycleName) {
          setEditAdmissionCycles([{ id: data.id, label: data.admissionCycleName }]);
          // Auto-select if not already set to a valid value
          setEditForm((prev) => {
            const stillValid = prev.programId === editForm.programId && prev.admissionCycleId === data.id;
            return stillValid ? prev : { ...prev, admissionCycleId: data.id! };
          });
        } else {
          setEditAdmissionCycles([]);
          setEditForm((prev) => ({ ...prev, admissionCycleId: "" }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEditAdmissionCycles([]);
          setEditForm((prev) => ({ ...prev, admissionCycleId: "" }));
        }
      })
      .finally(() => { if (!cancelled) setEditCycleLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, leadDetail?.institutionId, editForm.levelId, editForm.programId]);

  // ── Filtered + paginated data ────────────────────────────────────────────────

  const filtered = leads.filter((l) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      l.firstName.toLowerCase().includes(q) ||
      l.lastName.toLowerCase().includes(q) ||
      l.mobileNo.includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.studyLevel.toLowerCase().includes(q) ||
      l.programApplied.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  // ── Column count for skeleton ────────────────────────────────────────────────

  const colCount = isDirectorOrIncharge ? 11 : 10;

  // ── Empty / error states ─────────────────────────────────────────────────────

  if (!loading && error && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
        <div className="mb-4 rounded-full bg-rose-50 p-4">
          <Users size={28} className="text-rose-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-700">No Leads Found</h3>
        <p className="mt-1 max-w-xs text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  // ── Open lead detail modal ────────────────────────────────────────────────────

  function openViewLead(lead: Lead) {
    setViewLead(lead);
    setLeadDetail(null);
    setDetailLoading(true);
    setIsEditing(false);
    setEditError("");
    fetch(`${API_BASE}/api/enquiryform/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: lead.id }),
    })
      .then((r) => r.json() as Promise<{ enquiryForms?: LeadDetail[] }>)
      .then((data) => {
        const form = data.enquiryForms?.[0];
        if (form) {
          setLeadDetail(form);
          setEditForm({
            firstName: form.firstName,
            lastName: form.lastName,
            mobileNo: form.mobileNo,
            email: form.email,
            state: form.state,
            levelId: form.levelId,
            programId: form.programId,
            admissionCycleId: form.admissionCycleId,
          });
        }
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }

  // ── Open lead in edit mode (pencil button) ─────────────────────────────────────

  function openEditLead(lead: Lead) {
    setViewLead(lead);
    setLeadDetail(null);
    setDetailLoading(true);
    setIsEditing(true);
    setEditError("");
    setEditDegreeLevels([]);
    setEditPrograms([]);
    setEditAdmissionCycles([]);
    fetch(`${API_BASE}/api/enquiryform/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: lead.id }),
    })
      .then((r) => r.json() as Promise<{ enquiryForms?: LeadDetail[] }>)
      .then((data) => {
        const form = data.enquiryForms?.[0];
        if (form) {
          setLeadDetail(form);
          setEditForm({
            firstName: form.firstName,
            lastName: form.lastName,
            mobileNo: form.mobileNo,
            email: form.email,
            state: form.state,
            levelId: form.levelId,
            programId: form.programId,
            admissionCycleId: form.admissionCycleId,
          });
        }
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }

  // ── Save edits ────────────────────────────────────────────────────────────────

  // ── Add Lead ──────────────────────────────────────────────────────────────────

  async function handleAddLead() {
    const f = addLeadForm;
    if (!f.firstName.trim() || !f.lastName.trim() || !f.mobileNo.trim() || !f.email.trim() || !f.state.trim()) {
      setAddLeadError("All personal details are required.");
      return;
    }
    if (!f.levelId || !f.programId || !f.admissionCycleId) {
      setAddLeadError("Study level, programme, and admission cycle are required.");
      return;
    }
    const institutionId = profile?.institution?.id;
    if (!institutionId) { setAddLeadError("Institution not found in your profile."); return; }

    setAddLeadSaving(true);
    setAddLeadError("");
    try {
      const res = await fetch(`${API_BASE}/api/leads/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          institutionId,
          levelId: f.levelId,
          programId: f.programId,
          admissionCycleId: f.admissionCycleId,
          firstName: f.firstName.trim(),
          lastName: f.lastName.trim(),
          mobileNo: f.mobileNo.trim(),
          email: f.email.trim(),
          state: f.state.trim(),
          entityId: profile?.entityId ?? "",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        lead?: Lead;
      } | null;
      if (!res.ok) { setAddLeadError(data?.error ?? "Failed to add lead. Please try again."); return; }
      // Prepend new lead to the list
      if (data?.lead) setLeads((prev) => [data.lead!, ...prev]);
      setAddLeadOpen(false);
      setAddLeadForm({ firstName: "", lastName: "", mobileNo: "", email: "", state: "", levelId: "", programId: "", admissionCycleId: "" });
    } catch {
      setAddLeadError("Network error. Please try again.");
    } finally {
      setAddLeadSaving(false);
    }
  }

  async function saveLeadEdit() {
    if (!leadDetail) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.mobileNo.trim() || !editForm.email.trim()) {
      setEditError("First name, last name, mobile and email are required.");
      return;
    }
    if (!editForm.levelId || !editForm.programId || !editForm.admissionCycleId) {
      setEditError("Study level, programme and admission cycle are required.");
      return;
    }
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`${API_BASE}/api/enquiryform/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: leadDetail.id,
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          mobileNo: editForm.mobileNo.trim(),
          email: editForm.email.trim(),
          state: editForm.state.trim(),
          institutionId: leadDetail.institutionId,
          levelId: editForm.levelId,
          programId: editForm.programId,
          admissionCycleId: editForm.admissionCycleId,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) { setEditError(data?.error ?? "Update failed."); return; }
      const updatedLead: Partial<Lead> = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        mobileNo: editForm.mobileNo.trim(),
        email: editForm.email.trim(),
        studyLevel: leadDetail.degreeLevel.levelName,
        programApplied: leadDetail.program.programName,
        admissionCycle: leadDetail.admissionCycle.admissionCycleName,
      };

      // Reflect changes in the table
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadDetail.id ? { ...l, ...updatedLead } : l
        )
      );
      setViewLead((prev) =>
        prev ? { ...prev, ...updatedLead } : prev
      );
      setIsEditing(false);
      setViewLead(null);
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Forward lead to another counsellor ────────────────────────────────────────

  function openForwardLead(lead: Lead) {
    if (!canManageLeads) return;
    setForwardLead(lead);
    setSelectedCounsellorId("");
    setForwardError("");
    setCounsellorSearch("");
    setCounsellors([]);

    const institutionId = profile?.institution?.id;
    if (!institutionId) return;

    setCounsellorsLoading(true);
    fetch(`${API_BASE}/api/counsellors/${institutionId}`, { credentials: "include" })
      .then((r) => r.json() as Promise<{ counsellors?: Counsellor[] }>)
      .then((data) => {
        if (data.counsellors) setCounsellors(data.counsellors);
        else setForwardError("No counsellors found for this institution.");
      })
      .catch(() => setForwardError("Failed to load counsellors."))
      .finally(() => setCounsellorsLoading(false));
  }

  async function handleForward() {
    if (!canManageLeads) return;
    if (!forwardLead || !selectedCounsellorId) return;
    setForwardSaving(true);
    setForwardError("");
    try {
      const res = await fetch(`${API_BASE}/api/leads/change-counsellor`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enquiryFormId: forwardLead.id,
          admissionCounsellorId: selectedCounsellorId,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        assignedCounsellor?: { firstName: string; lastName: string };
      } | null;
      if (!res.ok) {
        setForwardError(data?.error ?? "Forward failed. Please try again.");
        return;
      }
      // Reflect new counsellor name in the table row
      const matched = counsellors.find((c) => c.id === selectedCounsellorId);
      const newName = data?.assignedCounsellor
        ? `${data.assignedCounsellor.firstName} ${data.assignedCounsellor.lastName}`
        : matched
        ? `${matched.firstName} ${matched.lastName}`
        : undefined;
      if (newName) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === forwardLead.id ? { ...l, admissionCounsellor: newName } : l
          )
        );
      }
      setForwardLead(null);
    } catch {
      setForwardError("Network error. Please try again.");
    } finally {
      setForwardSaving(false);
    }
  }

  // ── Delete handler ────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!canManageLeads) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`${API_BASE}/api/leads/delete/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setDeleteError(data?.error ?? "Failed to delete lead. Please try again.");
        return;
      }
      setDeleteConfirmId(null);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  function fetchCallLogsForLead(leadId: string) {
    setCallLogsLoading(true);
    fetch(`${API_BASE}/api/call-logs/enquiry/${leadId}`, { credentials: "include" })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }: { ok: boolean; data: { callLogs?: CallLog[]; total?: number; error?: string } }) => {
        if (!ok) {
          setCallLogsError(data.error ?? "Failed to load call logs.");
          return;
        }
        setCallLogs(data.callLogs ?? []);
      })
      .catch(() => setCallLogsError("Failed to load call logs."))
      .finally(() => setCallLogsLoading(false));
  }

  function openCallLogs(lead: Lead) {
    if (expandedCallLogLeadId === lead.id) {
      setExpandedCallLogLeadId(null);
      setCallLogsLead(null);
      setCallLogs([]);
      setCallLogsError("");
      setCreateLogOpen(false);
      setCreateLogError("");
      return;
    }

    setExpandedCallLogLeadId(lead.id);
    setCallLogsLead(lead);
    setCallLogs([]);
    setCallLogsError("");
    setCreateLogOpen(false);
    setCreateLogError("");

    fetchCallLogsForLead(lead.id);
  }

  function resetCreateForm() {
    const now = new Date();
    setCreateLogForm({
      date: toDateInputValue(now),
      time: toTimeInputValue(now),
      status: "",
      type: "",
      response: "",
      note: "",
      nextFollowUp: "",
    });
  }

  async function submitCreateLog() {
    if (!callLogsLead) return;
    if (!profile?.entityId) {
      setCreateLogError("Profile ID not found. Please re-login.");
      return;
    }
    if (!createLogForm.date || !createLogForm.time) {
      setCreateLogError("Date and time are required.");
      return;
    }
    if (!createLogForm.status || !createLogForm.type || !createLogForm.response.trim()) {
      setCreateLogError("Status, type, and response are required.");
      return;
    }

    const callTime = new Date(`${createLogForm.date}T${createLogForm.time}`).toISOString();
    const nextFollowUp = createLogForm.nextFollowUp
      ? new Date(createLogForm.nextFollowUp).toISOString()
      : null;
    const endpoint = isCounsellor
      ? `${API_BASE}/api/call-logs/admissionCounsellor/create`
      : `${API_BASE}/api/call-logs/admissionConsultant/create`;

    setCreateLogSaving(true);
    setCreateLogError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enquiryId: callLogsLead.id,
          counsellorId: isCounsellor ? profile.entityId : undefined,
          consultantId: isConsultant ? profile.entityId : undefined,
          callType: createLogForm.type,
          callStatus: createLogForm.status,
          callResponse: createLogForm.response.trim(),
          notes: createLogForm.note.trim() || null,
          callTime,
          nextFollowUp,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setCreateLogError(data?.error ?? "Failed to create call log.");
        return;
      }
      setCreateLogOpen(false);
      resetCreateForm();
      fetchCallLogsForLead(callLogsLead.id);
    } catch {
      setCreateLogError("Failed to create call log.");
    } finally {
      setCreateLogSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Delete confirm modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
              <Trash2 size={22} className="text-rose-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Delete Lead?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This action cannot be undone. The lead will be permanently removed.
            </p>
            {deleteError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => { setDeleteConfirmId(null); setDeleteError(""); }}
                disabled={deleteLoading}
                className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleDelete(deleteConfirmId); }}
                disabled={deleteLoading}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deleteLoading && <Loader2 size={13} className="animate-spin" />}
                {deleteLoading ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-900">{pageTitle}</h1>
        <p className="text-sm text-slate-500">{pageDescription}</p>
      </div>

      {/* Search + stats bar */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search name, phone, email, program…"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {loading ? "Loading…" : `${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`}
          </span>
          {canAddLead && (
            <button
              type="button"
              onClick={() => { setAddLeadOpen(true); setAddLeadError(""); setAddLeadForm({ firstName: "", lastName: "", mobileNo: "", email: "", state: "", levelId: "", programId: "", admissionCycleId: "" }); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              <UserPlus size={13} />
              Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 w-10">S.No</th>
              <th className="px-4 py-3">First Name</th>
              <th className="px-4 py-3">Last Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Study Level</th>
              <th className="px-4 py-3">Applied Program</th>
              <th className="px-4 py-3">Admission Cycle</th>
              <th className="px-4 py-3">Lead Type</th>
              {isDirectorOrIncharge && (
                <th className="px-4 py-3">Assigned To</th>
              )}
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} cols={colCount} />
                ))
              : paginated.length === 0
              ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-14 text-center text-sm text-slate-400"
                  >
                    {searchQuery ? "No leads match your search." : "No leads yet."}
                  </td>
                </tr>
              )
              : paginated.map((lead, idx) => {
                  const sNo = (currentPage - 1) * PAGE_SIZE + idx + 1;
                  const assignedTo =
                    lead.admissionCounsellor ?? lead.admissionConsultant ?? "—";
                  const isMenuOpen = openMenuId === lead.id;
                  const isCallLogExpanded = expandedCallLogLeadId === lead.id;
                  const isConverted = lead.hasApplication === true;

                  return (
                    <Fragment key={lead.id}>
                      <tr
                        className="group transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 text-slate-400 font-medium">{sNo}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          <div className="flex items-center gap-2">
                            {lead.firstName}
                            {isConverted && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                <Check size={10} />
                                Applicant
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{lead.lastName}</td>
                        <td className="px-4 py-3 text-slate-600">{lead.mobileNo}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-40 truncate">
                          {lead.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {lead.studyLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-45 truncate">
                          {lead.programApplied}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {lead.admissionCycle}
                        </td>
                        <td className="px-4 py-3">
                          {lead.leadSourceType === "OWN_GENERATED" ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                              Own Generated
                            </span>
                          ) : lead.leadSourceType === "SYSTEM_ASSIGNED" ? (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
                              System Assigned
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {isDirectorOrIncharge && (
                          <td className="px-4 py-3 text-slate-600">
                            {assignedTo}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              title="View lead details"
                              onClick={() => openViewLead(lead)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              title="Edit lead"
                              onClick={() => openEditLead(lead)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                            >
                              <Pencil size={14} />
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                title="More actions"
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
                                  setOpenMenuId(isMenuOpen ? null : lead.id);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                              >
                                <EllipsisVertical size={15} />
                              </button>

                              {isMenuOpen && menuPos && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div
                                    ref={menuRef}
                                    style={{
                                      position: "fixed",
                                      left: Math.max(
                                        Math.min(
                                          menuPos.x + menuPos.w - 176,
                                          window.innerWidth - 192
                                        ),
                                        8
                                      ),
                                      top: menuPos.y + menuPos.h + 4,
                                    }}
                                    className="z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                                  >
                                    {canManageLeads && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          openForwardLead(lead);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                      >
                                        <ArrowRightCircle size={14} className="text-blue-500" />
                                        Forward
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        openCallLogs(lead);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                    >
                                      <PhoneCall size={14} className="text-emerald-500" />
                                      {isCallLogExpanded ? "Hide Call Logs" : "Call Logs"}
                                    </button>
                                    {canManageLeads && !isConverted && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeleteConfirmId(lead.id);
                                          setOpenMenuId(null);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
                                      >
                                        <Trash2 size={14} />
                                        Delete Lead
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {isCallLogExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={colCount} className="px-4 py-4">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-900">
                                    Call Logs - {lead.firstName} {lead.lastName}
                                  </h3>
                                  <p className="text-xs text-slate-500">
                                    {isDirectorOrIncharge
                                      ? "View-only access for Director/In-charge"
                                      : "Only counsellor/consultant can add logs"}
                                  </p>
                                </div>
                                {canCreateLogs && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCreateLogOpen((prev) => {
                                        const next = !prev;
                                        if (next) {
                                          resetCreateForm();
                                          setCreateLogError("");
                                        }
                                        return next;
                                      });
                                    }}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                  >
                                    {createLogOpen ? "Close Add Form" : "+ Add Call Log"}
                                  </button>
                                )}
                              </div>

                              {callLogsError && (
                                <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                                  {callLogsError}
                                </div>
                              )}

                              <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      <th className="px-4 py-3">Date</th>
                                      <th className="px-4 py-3">Time</th>
                                      {isDirectorOrIncharge && <th className="px-4 py-3">Counsellor/Consultant</th>}
                                      <th className="px-4 py-3">Type</th>
                                      <th className="px-4 py-3">Status</th>
                                      <th className="px-4 py-3">Response</th>
                                      <th className="px-4 py-3">Notes</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {callLogsLoading ? (
                                      Array.from({ length: 3 }).map((_, rowIdx) => (
                                        <tr key={rowIdx} className="animate-pulse">
                                          {Array.from({ length: isDirectorOrIncharge ? 7 : 6 }).map((__, cellIdx) => (
                                            <td key={cellIdx} className="px-4 py-3">
                                              <div className="h-4 rounded-md bg-slate-200" />
                                            </td>
                                          ))}
                                        </tr>
                                      ))
                                    ) : callLogs.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={isDirectorOrIncharge ? 7 : 6}
                                          className="px-4 py-8 text-center text-sm text-slate-500"
                                        >
                                          No call logs yet.
                                        </td>
                                      </tr>
                                    ) : (
                                      callLogs.map((log) => {
                                        const when = formatDateTime(log.callTime);
                                        const status = CALL_STATUS_STYLES[log.callStatus];
                                        return (
                                          <tr key={log.id} className="transition hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-600">{when.date}</td>
                                            <td className="px-4 py-3 text-slate-600">{when.time}</td>
                                            {isDirectorOrIncharge && (
                                              <td className="px-4 py-3 text-slate-700">
                                                {log.assignedTo ?? "—"}
                                              </td>
                                            )}
                                            <td className="px-4 py-3 text-slate-700">{formatLabel(log.callType)}</td>
                                            <td className="px-4 py-3">
                                              <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                                  status?.className ?? "bg-slate-100 text-slate-600 border-slate-200"
                                                }`}
                                              >
                                                {status?.label ?? formatLabel(log.callStatus)}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{log.callResponse || "—"}</td>
                                            <td className="px-4 py-3 text-slate-700">
                                              <span className="max-w-xs whitespace-pre-wrap wrap-break-word">
                                                {log.notes?.trim() || "—"}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {canCreateLogs && createLogOpen && (
                                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  {createLogError && (
                                    <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                                      {createLogError}
                                    </div>
                                  )}
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-slate-500">Date</label>
                                      <input
                                        type="date"
                                        value={createLogForm.date}
                                        onChange={(e) => setCreateLogForm({ ...createLogForm, date: e.target.value })}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-slate-500">Time</label>
                                      <input
                                        type="time"
                                        value={createLogForm.time}
                                        onChange={(e) => setCreateLogForm({ ...createLogForm, time: e.target.value })}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-slate-500">Type</label>
                                      <select
                                        value={createLogForm.type}
                                        onChange={(e) => setCreateLogForm({ ...createLogForm, type: e.target.value })}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      >
                                        <option value="">Select type</option>
                                        {TYPE_OPTIONS.map((option) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-slate-500">Status</label>
                                      <select
                                        value={createLogForm.status}
                                        onChange={(e) => setCreateLogForm({ ...createLogForm, status: e.target.value })}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      >
                                        <option value="">Select status</option>
                                        {STATUS_OPTIONS.map((option) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-1 sm:col-span-2">
                                      <label className="text-xs font-medium text-slate-500">Response</label>
                                      <input
                                        type="text"
                                        value={createLogForm.response}
                                        onChange={(e) => setCreateLogForm({ ...createLogForm, response: e.target.value })}
                                        placeholder="Response"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1 sm:col-span-2">
                                      <label className="text-xs font-medium text-slate-500">Notes</label>
                                      <textarea
                                        rows={3}
                                        value={createLogForm.note}
                                        onChange={(e) => setCreateLogForm({ ...createLogForm, note: e.target.value })}
                                        placeholder="Add notes"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1 sm:col-span-2">
                                      <label className="text-xs font-medium text-slate-500">Next Follow Up</label>
                                      <input
                                        type="datetime-local"
                                        value={createLogForm.nextFollowUp}
                                        onChange={(e) => setCreateLogForm({ ...createLogForm, nextFollowUp: e.target.value })}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                      />
                                    </div>
                                  </div>
                                  <div className="mt-4 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => { void submitCreateLog(); }}
                                      disabled={createLogSaving}
                                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                                    >
                                      {createLogSaving && <Loader2 size={14} className="animate-spin" />}
                                      {createLogSaving ? "Saving..." : "Save Call Log"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages} &mdash; {filtered.length} total
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
              )
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1)
                  acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item as number)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition ${
                      currentPage === item
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Add Lead Modal ────────────────────────────────────────────── */}
      {addLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Add New Lead</h3>
                  <p className="text-xs text-slate-400">
                    {isCounsellor || isConsultant ? "Marked as Own Generated" : "System Assigned (auto-assigned counsellor)"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddLeadOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {addLeadError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {addLeadError}
                </div>
              )}

              {/* Personal Details */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Personal Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">First Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={addLeadForm.firstName}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, firstName: e.target.value })}
                      placeholder="First name"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Last Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={addLeadForm.lastName}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, lastName: e.target.value })}
                      placeholder="Last name"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Mobile No. <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      value={addLeadForm.mobileNo}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, mobileNo: e.target.value })}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">Email <span className="text-rose-500">*</span></label>
                    <input
                      type="email"
                      value={addLeadForm.email}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, email: e.target.value })}
                      placeholder="Email address"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-600">State <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={addLeadForm.state}
                      onChange={(e) => setAddLeadForm({ ...addLeadForm, state: e.target.value })}
                      placeholder="State of residence"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {/* Programme Selection */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Programme</p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Study Level <span className="text-rose-500">*</span></label>
                  <select
                    value={addLeadForm.levelId}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, levelId: e.target.value, programId: "", admissionCycleId: "" })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={addLeadDegreeLoading}
                  >
                    <option value="">
                      {addLeadDegreeLoading ? "Loading…" : "— Select level —"}
                    </option>
                    {addLeadDegreeLevels.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Programme <span className="text-rose-500">*</span></label>
                  <select
                    value={addLeadForm.programId}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, programId: e.target.value, admissionCycleId: "" })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={!addLeadForm.levelId || addLeadProgramLoading}
                  >
                    <option value="">
                      {addLeadProgramLoading ? "Loading…" : "— Select programme —"}
                    </option>
                    {addLeadPrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Admission Cycle <span className="text-rose-500">*</span></label>
                  <select
                    value={addLeadForm.admissionCycleId}
                    onChange={(e) => setAddLeadForm({ ...addLeadForm, admissionCycleId: e.target.value })}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    disabled={!addLeadForm.programId || addLeadCycleLoading}
                  >
                    <option value="">
                      {addLeadCycleLoading ? "Loading…" : "— Select cycle —"}
                    </option>
                    {addLeadAdmissionCycles.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => setAddLeadOpen(false)}
                disabled={addLeadSaving}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleAddLead(); }}
                disabled={addLeadSaving}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {addLeadSaving && <Loader2 size={13} className="animate-spin" />}
                {addLeadSaving ? "Adding…" : "Add Lead"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Forward Lead Modal ────────────────────────────────────────────── */}
      {forwardLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <ArrowRightCircle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Forward Lead</h3>
                  <p className="text-xs text-slate-400">
                    {forwardLead.firstName} {forwardLead.lastName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForwardLead(null)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-3 overflow-hidden px-6 py-4 flex-1 min-h-0">
              <p className="text-sm text-slate-500">
                Select a counsellor to reassign this lead to.
              </p>

              {/* Search */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={counsellorSearch}
                  onChange={(e) => setCounsellorSearch(e.target.value)}
                  placeholder="Search by name or designation…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Error */}
              {forwardError && (
                <div className="flex shrink-0 items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  {forwardError}
                </div>
              )}

              {/* Counsellor list */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 min-h-0">
                {counsellorsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  </div>
                ) : counsellors.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    No counsellors available.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {counsellors
                      .filter((c) => {
                        const q = counsellorSearch.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          c.firstName.toLowerCase().includes(q) ||
                          c.lastName.toLowerCase().includes(q) ||
                          c.designation.toLowerCase().includes(q) ||
                          c.empId.toLowerCase().includes(q)
                        );
                      })
                      .map((c) => {
                        const isSelected = selectedCounsellorId === c.id;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedCounsellorId(c.id)}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                                isSelected
                                  ? "bg-blue-50"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                  isSelected
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isSelected ? (
                                  <Check size={14} strokeWidth={2.5} />
                                ) : (
                                  `${c.firstName[0]}${c.lastName[0]}`
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                                  {c.firstName} {c.lastName}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {c.designation} · {c.empId}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => setForwardLead(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { void handleForward(); }}
                disabled={!selectedCounsellorId || forwardSaving}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {forwardSaving && <Loader2 size={13} className="animate-spin" />}
                {forwardSaving ? "Forwarding…" : "Confirm Forward"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Detail / Edit Panel ─────────────────────────────────────────── */}
      {viewLead && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">

            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                {/* Avatar with initials */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
                  {viewLead.firstName[0]?.toUpperCase()}{viewLead.lastName[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {viewLead.firstName} {viewLead.lastName}
                  </h2>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${isEditing ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>
                      {isEditing ? "Editing" : "Viewing"}
                    </span>
                    <span className="text-xs text-slate-400">Lead #{viewLead.id.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Open in Admission Review"
                  onClick={() => { void router.push(`/modules/crm/admissions/review?search=${encodeURIComponent(viewLead.email)}`); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ArrowRightCircle size={14} />
                  Open Application
                </button>
              </div>
              <button
                type="button"
                onClick={() => { setViewLead(null); setIsEditing(false); setEditError(""); }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={17} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 size={28} className="animate-spin text-indigo-400" />
                  <p className="text-sm text-slate-400">Loading lead details…</p>
                </div>
              ) : isEditing ? (

                /* ════════════ EDIT FORM ════════════ */
                <div className="flex flex-col gap-5">
                  {editError && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  {/* Section: Personal Details */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Personal Details</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">First Name <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          placeholder="First name"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">Last Name <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          placeholder="Last name"
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">Mobile Number <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={editForm.mobileNo}
                            onChange={(e) => setEditForm({ ...editForm, mobileNo: e.target.value })}
                            placeholder="+91 9876543210"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">Email Address <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            placeholder="example@email.com"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                      <div className="col-span-2 flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">State / City</label>
                        <div className="relative">
                          <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            placeholder="State"
                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Programme Details */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Programme Details</p>
                    <div className="flex flex-col gap-3">
                      {/* Degree Level */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">Study Level <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <GraduationCap size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            value={editForm.levelId}
                            onChange={(e) => setEditForm({ ...editForm, levelId: e.target.value, programId: "", admissionCycleId: "" })}
                            disabled={editDegreeLoading}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">{editDegreeLoading ? "Loading…" : "Select study level"}</option>
                            {editDegreeLevels.map((l) => (
                              <option key={l.id} value={l.id}>{l.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Programme */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">Programme <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <BookOpen size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            value={editForm.programId}
                            onChange={(e) => setEditForm({ ...editForm, programId: e.target.value, admissionCycleId: "" })}
                            disabled={!editForm.levelId || editProgramLoading}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">
                              {!editForm.levelId ? "Select a study level first" : editProgramLoading ? "Loading…" : "Select programme"}
                            </option>
                            {editPrograms.map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Admission Cycle */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">Admission Cycle <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <Calendar size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          {editCycleLoading ? (
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-2.5 text-sm text-slate-400">
                              <Loader2 size={13} className="animate-spin" /> Loading cycle…
                            </div>
                          ) : editAdmissionCycles.length > 0 ? (
                            <select
                              value={editForm.admissionCycleId}
                              onChange={(e) => setEditForm({ ...editForm, admissionCycleId: e.target.value })}
                              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="">Select cycle</option>
                              {editAdmissionCycles.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
                              <AlertCircle size={13} className="shrink-0" />
                              {!editForm.programId ? "Select a programme first" : "No active admission cycle found"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              ) : (

                /* ════════════ VIEW MODE ════════════ */
                <div className="flex flex-col gap-4">

                  {/* Hero: contact quick-view */}
                  <div className="flex flex-col gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">Full Name</span>
                        <span className="text-sm font-semibold text-slate-800">{viewLead.firstName} {viewLead.lastName}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">State</span>
                        <span className="text-sm font-medium text-slate-700">{leadDetail?.state || "—"}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <a
                        href={`tel:${viewLead.mobileNo}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                      >
                        <Phone size={12} className="text-emerald-500" />
                        {viewLead.mobileNo}
                      </a>
                      <a
                        href={`mailto:${viewLead.email}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
                      >
                        <Mail size={12} className="text-blue-500" />
                        <span className="max-w-[180px] truncate">{viewLead.email}</span>
                      </a>
                    </div>
                  </div>

                  {/* Programme Details */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Programme Details</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <GraduationCap size={12} /> Study Level
                        </div>
                        <span className="text-sm font-semibold text-indigo-700">
                          {leadDetail?.degreeLevel.levelName ?? viewLead.studyLevel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <BookOpen size={12} /> Programme
                        </div>
                        <span className="text-sm font-semibold text-slate-800 leading-tight">
                          {leadDetail?.program.programName ?? viewLead.programApplied}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Calendar size={12} /> Admission Cycle
                        </div>
                        <span className="text-sm font-semibold text-slate-800 leading-tight">
                          {leadDetail?.admissionCycle.admissionCycleName ?? viewLead.admissionCycle}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Assignment */}
                  {(viewLead.admissionCounsellor ?? viewLead.admissionConsultant) && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Assigned To</p>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
                          {(viewLead.admissionCounsellor ?? viewLead.admissionConsultant ?? "?")[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {viewLead.admissionCounsellor ?? viewLead.admissionConsultant}
                          </p>
                          <p className="text-xs text-slate-400">
                            {viewLead.admissionCounsellor ? "Admission Counsellor" : "Admission Consultant"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-6 py-4 shrink-0">
              <button
                type="button"
                onClick={() => { setViewLead(null); setIsEditing(false); setEditError(""); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setViewLead(null); setIsEditing(false); setEditError(""); }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => { void saveLeadEdit(); }}
                    disabled={editSaving || !editForm.admissionCycleId}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editSaving && <Loader2 size={13} className="animate-spin" />}
                    {editSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              ) : null}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
