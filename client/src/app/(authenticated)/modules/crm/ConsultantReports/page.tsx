"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useProfile } from "@/providers/ProfileProvider";
import { useRole } from "@/lib/hooks/useRole";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthlyRow {
  month: string;
  generatedLeads: number;
  closedLeads: number;
  admitted: number;
  notAdmitted: number;
}

interface IndividualReport {
  consultantId: string;
  consultantName: string;
  total: number;
  report: MonthlyRow[];
}

interface SummaryRow {
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

interface AllReports {
  institutionId: string;
  total: number;
  reports: SummaryRow[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function IndividualView({ data }: { data: IndividualReport }) {
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

function AllConsultantsView({ data }: { data: AllReports }) {
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

export default function ConsultantReportsPage() {
  const { profile, isProfileLoading } = useProfile();
  const role = useRole();

  const isAdmin = ["admissionDirector", "admissionIncharge", "collegeAdmin", "admin"].includes(role ?? "");
  const isConsultant = role === "admissionConsultant";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [individualData, setIndividualData] = useState<IndividualReport | null>(null);
  const [allData, setAllData] = useState<AllReports | null>(null);

  useEffect(() => {
    if (isProfileLoading || !profile || !role) return;
    if (!isConsultant && !isAdmin) {
      setLoading(false);
      return;
    }

    const entityId = profile.entityId ?? "";
    const institutionId = profile.institution?.id ?? "";
    const url = isConsultant
      ? `${API_BASE}/api/consultant/report/${entityId}`
      : `${API_BASE}/api/consultant/reports/getall/${institutionId}`;

    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(d.error || "Failed to load report."));
        return res.json();
      })
      .then((data) => {
        if (isConsultant) setIndividualData(data as IndividualReport);
        else setAllData(data as AllReports);
      })
      .catch((err: unknown) =>
        setError(typeof err === "string" ? err : "Failed to load report.")
      )
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfileLoading, profile, role]);

  if (isProfileLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Consultant Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Performance summary for all consultants in your institution."
            : "Your monthly performance report."}
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-rose-600 font-medium">
          {error}
        </div>
      )}

      {!error && individualData && <IndividualView data={individualData} />}
      {!error && allData && <AllConsultantsView data={allData} />}

      {!error && !individualData && !allData && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          {!isConsultant && !isAdmin
            ? "Consultant reports are not available for your role."
            : "No report data available."}
        </div>
      )}
    </div>
  );
}
