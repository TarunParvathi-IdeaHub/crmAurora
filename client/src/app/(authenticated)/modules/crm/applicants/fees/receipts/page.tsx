"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReceiptText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  CreditCard,
  Calendar,
  IndianRupee,
} from "lucide-react";
import Card from "@/components/common/Card";
import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceiptRecord {
  receiptId: string;
  receiptNumber: string;
  feeName: string;
  amountPaid: number;
  receiptDate: string;
}

// ── Animation variants ────────────────────────────────────────────────────────

const staggerList: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const slideItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

// ── Utility ───────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Receipt row ───────────────────────────────────────────────────────────────

function ReceiptRow({ receipt }: { receipt: ReceiptRecord }) {
  return (
    <motion.div variants={slideItem}>
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left */}
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <ReceiptText size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-mono font-medium text-slate-500">
                {receipt.receiptNumber}
              </p>
              <p className="text-base font-semibold text-slate-900">{receipt.feeName}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <Calendar size={11} />
                {formatDate(receipt.receiptDate)}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-1 sm:ml-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={10} />
              Paid
            </span>
            <p className="text-xl font-bold text-slate-900">
              {formatINR(receipt.amountPaid)}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReceiptsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const cancelledRef = useRef(false);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/applicant-fees/receipts`, {
        credentials: "include",
      });

      if (cancelledRef.current) return;

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Failed to load receipts.");
        return;
      }

      const json = (await res.json()) as { receipts: ReceiptRecord[] };
      if (!cancelledRef.current) setReceipts(json.receipts ?? []);
    } catch {
      if (!cancelledRef.current) setError("Failed to load receipts.");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void loadReceipts();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadReceipts]);

  const totalPaid = receipts.reduce((s, r) => s + r.amountPaid, 0);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerList}
      className="mx-auto max-w-4xl space-y-5 py-2"
    >
      {/* Hero */}
      <motion.div variants={slideItem}>
        <Card className="overflow-hidden border-0 bg-linear-to-r from-emerald-700 via-emerald-600 to-teal-600 p-0 text-white shadow-xl">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <ReceiptText size={30} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-200">Applicant Fee Module</p>
                <h1 className="mt-0.5 text-2xl font-bold md:text-3xl">Payment Receipts</h1>
                <p className="mt-1 text-sm text-emerald-200">
                  All completed payments and receipts
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/modules/crm/applicants/fees/pending")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition"
              >
                <CreditCard size={16} />
                Pending Payments
              </button>
              <button
                onClick={() => void loadReceipts()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Loading */}
      {loading && (
        <motion.div variants={slideItem}>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-emerald-600" />
            Loading receipts...
          </div>
        </motion.div>
      )}

      {/* Error */}
      {!loading && error && (
        <motion.div variants={slideItem}>
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {error}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && !error && receipts.length === 0 && (
        <motion.div variants={slideItem}>
          <Card className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ReceiptText size={28} className="text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">No receipts yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your payment receipts will appear here after successful fee payments.
            </p>
            <button
              onClick={() => router.push("/modules/crm/applicants/fees/pending")}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              <CreditCard size={15} />
              Go to Pending Payments
            </button>
          </Card>
        </motion.div>
      )}

      {/* Total paid summary */}
      {!loading && !error && receipts.length > 0 && (
        <>
          <motion.div variants={slideItem}>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                    <IndianRupee size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Paid</p>
                    <p className="text-lg font-bold text-slate-900">{formatINR(totalPaid)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                    <ReceiptText size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total Receipts</p>
                    <p className="text-lg font-bold text-slate-900">{receipts.length}</p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>

          {/* Table header */}
          <motion.div variants={slideItem}>
            <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Fee / Receipt</span>
              <span className="text-right">Receipt Date</span>
              <span className="text-right">Amount Paid</span>
            </div>
          </motion.div>

          {/* Receipt list */}
          {receipts.map((receipt) => (
            <ReceiptRow key={receipt.receiptId} receipt={receipt} />
          ))}
        </>
      )}
    </motion.div>
  );
}
