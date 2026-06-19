"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CounsellorMonthlyRow {
  month: string;
  assignedLeads: number;
  closedLeads: number;
  admitted: number;
  notAdmitted: number;
}

interface ConsultantMonthlyRow {
  month: string;
  generatedLeads: number;
  closedLeads: number;
  admitted: number;
  notAdmitted: number;
}

interface IndividualCounsellorReport {
  counsellorId: string;
  counsellorName: string;
  total: number;
  report: CounsellorMonthlyRow[];
}

interface IndividualConsultantReport {
  consultantId: string;
  consultantName: string;
  total: number;
  report: ConsultantMonthlyRow[];
}

interface CounsellorSummaryRow {
  counsellorId: string;
  counsellorName: string;
  systemGeneratedLeads: number;
  systemClosedLeads: number;
  systemAdmittedLeads: number;
  systemNotAdmitted: number;
  ownLeadsGenerated: number;
  ownLeadsClosed: number;
  ownLeadsAdmitted: number;
  ownLeadsNotAdmitted: number;
  totalAssignedLeads: number;
  totalAdmittedLeads: number;
  conversionRatio: number;
}

interface ConsultantSummaryRow {
  consultantId: string;
  consultantName: string;
  generatedLeads: number;
  closedLeads: number;
  admittedLeads: number;
  notAdmitted: number;
  totalAssignedLeads: number;
  totalAdmittedLeads: number;
  conversionRatio: number;
}

interface AllCounsellorReports {
  institutionId: string;
  total: number;
  reports: CounsellorSummaryRow[];
}

interface AllConsultantReports {
  institutionId: string;
  total: number;
  reports: ConsultantSummaryRow[];
}

type ReportTab = "counsellor" | "consultant";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function SectionLoader() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
    </div>
  );
}

// ── Individual counsellor report ──────────────────────────────────────────────

function IndividualCounsellorView({ data }: { data: IndividualCounsellorReport }) {
  const totals = data.report.reduce(
    (acc, r) => ({
      assignedLeads: acc.assignedLeads + r.assignedLeads,
      closedLeads: acc.closedLeads + r.closedLeads,
      admitted: acc.admitted + r.admitted,
      notAdmitted: acc.notAdmitted + r.notAdmitted,
    }),
    { assignedLeads: 0, closedLeads: 0, admitted: 0, notAdmitted: 0 }
  );
  const conversionRatio =
    totals.assignedLeads > 0
      ? ((totals.admitted / totals.assignedLeads) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{data.counsellorName}</h2>
        <p className="text-sm text-slate-500">{data.total} month(s) of data</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Assigned Leads" value={totals.assignedLeads} color="text-indigo-600" />
        <StatCard label="Closed Leads" value={totals.closedLeads} color="text-violet-600" />
        <StatCard label="Admitted" value={totals.admitted} color="text-emerald-600" />
        <StatCard label="Not Admitted" value={totals.notAdmitted} color="text-rose-500" />
      </div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 flex items-center gap-3">
        <span className="text-sm text-slate-500">Overall Conversion Ratio</span>
        <span className="text-xl font-bold text-indigo-700">{conversionRatio}%</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {["Month", "Assigned Leads", "Closed Leads", "Admitted", "Not Admitted"].map((h) => (
                <th key={h} className="px-5 py-3 text-left font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.report.map((row) => (
              <tr key={row.month} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 font-medium text-slate-900">{row.month}</td>
                <td className="px-5 py-3 text-indigo-700 font-semibold">{row.assignedLeads}</td>
                <td className="px-5 py-3 text-violet-700 font-semibold">{row.closedLeads}</td>
                <td className="px-5 py-3 text-emerald-600 font-semibold">{row.admitted}</td>
                <td className="px-5 py-3 text-rose-500 font-semibold">{row.notAdmitted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── All counsellors summary table ─────────────────────────────────────────────

function AllCounsellorsView({ data }: { data: AllCounsellorReports }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">All Counsellors Summary</h2>
        <p className="text-sm text-slate-500">{data.total} counsellor(s)</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                "Counsellor", "System Leads", "System Closed", "System Admitted",
                "Own Generated", "Own Closed", "Own Admitted",
                "Total Assigned", "Total Admitted", "Conversion %",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.reports.map((row) => (
              <tr key={row.counsellorId} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{row.counsellorName}</td>
                <td className="px-4 py-3 text-slate-700">{row.systemGeneratedLeads}</td>
                <td className="px-4 py-3 text-slate-700">{row.systemClosedLeads}</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">{row.systemAdmittedLeads}</td>
                <td className="px-4 py-3 text-slate-700">{row.ownLeadsGenerated}</td>
                <td className="px-4 py-3 text-slate-700">{row.ownLeadsClosed}</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">{row.ownLeadsAdmitted}</td>
                <td className="px-4 py-3 text-indigo-700 font-bold">{row.totalAssignedLeads}</td>
                <td className="px-4 py-3 text-emerald-700 font-bold">{row.totalAdmittedLeads}</td>
                <td className="px-4 py-3 text-violet-700 font-bold">{row.conversionRatio}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Individual consultant report ──────────────────────────────────────────────

function IndividualConsultantView({ data }: { data: IndividualConsultantReport }) {
  const totals = data.report.reduce(
    (acc, r) => ({
      generatedLeads: acc.generatedLeads + r.generatedLeads,
      closedLeads: acc.closedLeads + r.closedLeads,
      admitted: acc.admitted + r.admitted,
      notAdmitted: acc.notAdmitted + r.notAdmitted,
    }),
    { generatedLeads: 0, closedLeads: 0, admitted: 0, notAdmitted: 0 }
  );
  const conversionRatio =
    totals.generatedLeads > 0
      ? ((totals.admitted / totals.generatedLeads) * 100).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{data.consultantName}</h2>
        <p className="text-sm text-slate-500">{data.total} month(s) of data</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Generated Leads" value={totals.generatedLeads} color="text-indigo-600" />
        <StatCard label="Closed Leads" value={totals.closedLeads} color="text-violet-600" />
        <StatCard label="Admitted" value={totals.admitted} color="text-emerald-600" />
        <StatCard label="Not Admitted" value={totals.notAdmitted} color="text-rose-500" />
      </div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-3 flex items-center gap-3">
        <span className="text-sm text-slate-500">Overall Conversion Ratio</span>
        <span className="text-xl font-bold text-indigo-700">{conversionRatio}%</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {["Month", "Generated Leads", "Closed Leads", "Admitted", "Not Admitted"].map((h) => (
                <th key={h} className="px-5 py-3 text-left font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.report.map((row) => (
              <tr key={row.month} className="hover:bg-slate-50 transition">
                <td className="px-5 py-3 font-medium text-slate-900">{row.month}</td>
                <td className="px-5 py-3 text-indigo-700 font-semibold">{row.generatedLeads}</td>
                <td className="px-5 py-3 text-violet-700 font-semibold">{row.closedLeads}</td>
                <td className="px-5 py-3 text-emerald-600 font-semibold">{row.admitted}</td>
                <td className="px-5 py-3 text-rose-500 font-semibold">{row.notAdmitted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── All consultants summary table ─────────────────────────────────────────────

function AllConsultantsView({ data }: { data: AllConsultantReports }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">All Consultants Summary</h2>
        <p className="text-sm text-slate-500">{data.total} consultant(s)</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                "Consultant", "Generated Leads", "Closed Leads", "Admitted",
                "Not Admitted", "Total Assigned", "Total Admitted", "Conversion %",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.reports.map((row) => (
              <tr key={row.consultantId} className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{row.consultantName}</td>
                <td className="px-4 py-3 text-slate-700">{row.generatedLeads}</td>
                <td className="px-4 py-3 text-slate-700">{row.closedLeads}</td>
                <td className="px-4 py-3 text-emerald-600 font-semibold">{row.admittedLeads}</td>
                <td className="px-4 py-3 text-rose-500">{row.notAdmitted}</td>
                <td className="px-4 py-3 text-indigo-700 font-bold">{row.totalAssignedLeads}</td>
                <td className="px-4 py-3 text-emerald-700 font-bold">{row.totalAdmittedLeads}</td>
                <td className="px-4 py-3 text-violet-700 font-bold">{row.conversionRatio}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { profile, isProfileLoading } = useProfile();
  const role = useRole();

  const isAdmin = ["admissionDirector", "admissionIncharge", "collegeAdmin", "admin"].includes(role ?? "");
  const isCounsellor = role === "admissionCounsellor";
  const isConsultant = role === "admissionConsultant";

  // Tab visibility: admins see both; counsellors see only counsellor; consultants see only consultant
  const showCounsellorTab = isAdmin || isCounsellor;
  const showConsultantTab = isAdmin || isConsultant;
  const defaultTab: ReportTab = isConsultant ? "consultant" : "counsellor";

  const [activeTab, setActiveTab] = useState<ReportTab>(defaultTab);

  // Counsellor report state
  const [counsellorLoading, setCounsellorLoading] = useState(false);
  const [counsellorError, setCounsellorError] = useState("");
  const [individualCounsellorData, setIndividualCounsellorData] = useState<IndividualCounsellorReport | null>(null);
  const [allCounsellorData, setAllCounsellorData] = useState<AllCounsellorReports | null>(null);

  // Consultant report state
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [consultantError, setConsultantError] = useState("");
  const [individualConsultantData, setIndividualConsultantData] = useState<IndividualConsultantReport | null>(null);
  const [allConsultantData, setAllConsultantData] = useState<AllConsultantReports | null>(null);

  // Fetch counsellor report
  useEffect(() => {
    if (isProfileLoading || !profile || !role || !showCounsellorTab) return;
    if (individualCounsellorData || allCounsellorData) return; // already fetched

    const entityId = profile.entityId ?? "";
    const institutionId = profile.institution?.id ?? "";
    const url = isCounsellor
      ? `${API_BASE}/api/counsellor/report/${entityId}`
      : `${API_BASE}/api/counsellor/reports/getall/${institutionId}`;

    setCounsellorLoading(true);
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error || "Failed to load counsellor report."));
        return res.json();
      })
      .then((data) => {
        if (isCounsellor) setIndividualCounsellorData(data as IndividualCounsellorReport);
        else setAllCounsellorData(data as AllCounsellorReports);
      })
      .catch((err: unknown) =>
        setCounsellorError(typeof err === "string" ? err : "Failed to load counsellor report.")
      )
      .finally(() => setCounsellorLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfileLoading, profile, role]);

  // Fetch consultant report
  useEffect(() => {
    if (isProfileLoading || !profile || !role || !showConsultantTab) return;
    if (individualConsultantData || allConsultantData) return; // already fetched

    const entityId = profile.entityId ?? "";
    const institutionId = profile.institution?.id ?? "";
    const url = isConsultant
      ? `${API_BASE}/api/consultant/report/${entityId}`
      : `${API_BASE}/api/consultant/reports/getall/${institutionId}`;

    setConsultantLoading(true);
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error || "Failed to load consultant report."));
        return res.json();
      })
      .then((data) => {
        if (isConsultant) setIndividualConsultantData(data as IndividualConsultantReport);
        else setAllConsultantData(data as AllConsultantReports);
      })
      .catch((err: unknown) =>
        setConsultantError(typeof err === "string" ? err : "Failed to load consultant report.")
      )
      .finally(() => setConsultantLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfileLoading, profile, role]);

  if (isProfileLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Institution-wide performance and conversion reports."
            : "Your personal performance and conversion report."}
        </p>
      </div>

      {/* Tab bar — only show if both tabs are visible */}
      {showCounsellorTab && showConsultantTab && (
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-fit">
          <button
            onClick={() => setActiveTab("counsellor")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              activeTab === "counsellor"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Counsellor Reports
          </button>
          <button
            onClick={() => setActiveTab("consultant")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition ${
              activeTab === "consultant"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            Consultant Reports
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 min-h-40">
        {/* Counsellor tab */}
        {(activeTab === "counsellor" || !showConsultantTab) && showCounsellorTab && (
          <>
            {counsellorLoading && <SectionLoader />}
            {!counsellorLoading && counsellorError && (
              <p className="text-center text-rose-500 font-medium">{counsellorError}</p>
            )}
            {!counsellorLoading && !counsellorError && individualCounsellorData && (
              <IndividualCounsellorView data={individualCounsellorData} />
            )}
            {!counsellorLoading && !counsellorError && allCounsellorData && (
              <AllCounsellorsView data={allCounsellorData} />
            )}
            {!counsellorLoading && !counsellorError && !individualCounsellorData && !allCounsellorData && (
              <p className="text-center text-slate-500">No counsellor report data available.</p>
            )}
          </>
        )}

        {/* Consultant tab */}
        {(activeTab === "consultant" || !showCounsellorTab) && showConsultantTab && (
          <>
            {consultantLoading && <SectionLoader />}
            {!consultantLoading && consultantError && (
              <p className="text-center text-rose-500 font-medium">{consultantError}</p>
            )}
            {!consultantLoading && !consultantError && individualConsultantData && (
              <IndividualConsultantView data={individualConsultantData} />
            )}
            {!consultantLoading && !consultantError && allConsultantData && (
              <AllConsultantsView data={allConsultantData} />
            )}
            {!consultantLoading && !consultantError && !individualConsultantData && !allConsultantData && (
              <p className="text-center text-slate-500">No consultant report data available.</p>
            )}
          </>
        )}

        {/* No role match */}
        {!showCounsellorTab && !showConsultantTab && (
          <p className="text-center text-slate-500">Reports are not available for your role.</p>
        )}
      </div>
    </div>
  );
}
