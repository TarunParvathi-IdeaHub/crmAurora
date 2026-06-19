"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  IndianRupee,
  RefreshCw,
  Clock,
  ReceiptText,
  Lock,
} from "lucide-react";
import Card from "@/components/common/Card";
import { motion, type Variants } from "framer-motion";
import { useProfile } from "@/providers/ProfileProvider";

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingInvoice {
  invoiceId: string;
  invoiceNumber: string;
  feeName: string;
  totalAmount: number;
  dueAmount: number;
  paidAmount: number;
  nowPaying: number;
  status: "PENDING" | "PARTIALLY_PAID";
  feeType: "REGISTRATION" | "TUITION" | "OTHER";
  createdAt: string;
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

// ── Currency formatter ────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ── Payment status badge ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "PARTIALLY_PAID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <Clock size={10} />
        Partially Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      <Clock size={10} />
      Pending
    </span>
  );
}

// ── Pay button ────────────────────────────────────────────────────────────────

interface PayButtonProps {
  invoice: PendingInvoice;
  disabled?: boolean;
  disabledReason?: string;
  onSuccess: () => void;
}

function PayButton({ invoice, disabled = false, disabledReason, onSuccess }: PayButtonProps) {
  const [initiating, setInitiating] = useState(false);
  const [payError, setPayError] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  async function handlePay() {
    if (disabled) return;
    setInitiating(true);
    setPayError("");

    try {
      const res = await fetch(`${API_BASE}/api/applicant-fees/initiate-payment`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.invoiceId,
          paymentAmount: invoice.nowPaying,
        }),
      });

      const json = (await res.json()) as {
        paymentUrl?: string;
        error?: string;
        message?: string;
      };

      if (!res.ok || !json.paymentUrl) {
        setPayError(json.error ?? "Failed to initiate payment.");
        return;
      }

      // Redirect to EaseBuzz payment page
      window.location.href = json.paymentUrl;
      onSuccess();
    } catch {
      setPayError("Network error. Please try again.");
    } finally {
      setInitiating(false);
    }
  }

  if (disabled) {
    return (
      <div className="relative flex flex-col items-end gap-1.5">
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            id={`btn-pay-${invoice.invoiceId}`}
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-400 cursor-not-allowed shadow-sm"
          >
            <Lock size={14} />
            Locked
          </button>
          {showTooltip && disabledReason && (
            <div className="absolute bottom-full right-0 mb-2 z-50 w-64 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 shadow-lg">
              <div className="flex items-start gap-1.5">
                <AlertCircle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                {disabledReason}
              </div>
              {/* Arrow */}
              <div className="absolute right-4 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-200" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        id={`btn-pay-${invoice.invoiceId}`}
        onClick={handlePay}
        disabled={initiating}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {initiating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ExternalLink size={14} />
        )}
        {initiating ? "Initiating..." : `Pay ${formatINR(invoice.nowPaying)}`}
      </button>
      {payError && (
        <p className="text-xs text-rose-600 max-w-48 text-right">{payError}</p>
      )}
    </div>
  );
}

// ── Invoice card (mobile-friendly) ───────────────────────────────────────────

interface InvoiceCardProps {
  invoice: PendingInvoice;
  payLocked: boolean;
  lockReason?: string;
}

function InvoiceCard({ invoice, payLocked, lockReason }: InvoiceCardProps) {
  const isPartial = invoice.status === "PARTIALLY_PAID";
  const isRegistration = invoice.feeType === "REGISTRATION";
  // Registration fee is never locked (it's the one that must be paid first)
  const isButtonLocked = payLocked && !isRegistration;

  return (
    <motion.div variants={slideItem}>
      <Card className={`p-5 ${isButtonLocked ? "opacity-80" : ""}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: invoice details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-xs font-mono text-slate-500">{invoice.invoiceNumber}</p>
              <StatusBadge status={invoice.status} />
              {isRegistration && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Registration Fee
                </span>
              )}
              {invoice.feeType === "TUITION" && (
                <span className="rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">
                  Tuition Fee
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {invoice.feeName}
            </h3>

            {/* Amount grid */}
            <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="font-semibold text-slate-800">{formatINR(invoice.totalAmount)}</p>
              </div>
              {isPartial && (
                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="font-semibold text-emerald-600">{formatINR(invoice.paidAmount)}</p>
                </div>
              )}
              <div className={isPartial ? "" : "col-span-2"}>
                <p className="text-xs text-slate-500">Due</p>
                <p className="font-bold text-rose-600">{formatINR(invoice.dueAmount)}</p>
              </div>
            </div>

            {/* Tuition partial note */}
            {invoice.feeType === "TUITION" && invoice.paidAmount === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                First instalment: 50% of total. Remaining balance due in second semester.
              </p>
            )}

            {/* Lock warning for non-registration fees */}
            {isButtonLocked && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                <Lock size={11} className="shrink-0 text-amber-600" />
                {lockReason ?? "Pay Registration Fee first to unlock this payment."}
              </div>
            )}
          </div>

          {/* Right: Pay button */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-slate-500 mb-1">Now Paying</p>
            <p className="text-lg font-bold text-slate-900 mb-2">
              {isButtonLocked ? "—" : formatINR(invoice.nowPaying)}
            </p>
            <PayButton
              invoice={invoice}
              disabled={isButtonLocked}
              disabledReason={lockReason}
              onSuccess={() => {}}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function PendingPaymentsContent() {
  const { profile } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState<PendingInvoice[]>([]);
  const cancelledRef = useRef(false);

  // Payment result from EaseBuzz redirect
  const paymentResult = searchParams.get("payment") as "success" | "failed" | "error" | null;

  const loadPendingPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/applicant-fees/pending-payments`, {
        credentials: "include",
      });

      if (cancelledRef.current) return;

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        setError(json.error ?? "Failed to load pending payments.");
        return;
      }

      const json = (await res.json()) as { pendingPayments: PendingInvoice[] };
      if (!cancelledRef.current) setInvoices(json.pendingPayments ?? []);
    } catch {
      if (!cancelledRef.current) setError("Failed to load pending payments.");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void loadPendingPayments();
    return () => {
      cancelledRef.current = true;
    };
  }, [loadPendingPayments]);

  // ── Registration fee lock logic ──────────────────────────────────────────────
  // Registration Fee must be fully paid before other fees are payable.
  const registrationFeePending = invoices.some(
    (inv) => inv.feeType === "REGISTRATION" && (inv.status === "PENDING" || inv.status === "PARTIALLY_PAID")
  );
  const LOCK_REASON =
    "Registration Fee must be paid before you can pay other fees. Please complete the Registration Fee payment first.";

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerList}
      className="mx-auto max-w-4xl space-y-5 py-2"
    >
      {/* Hero */}
      <motion.div variants={slideItem}>
        <Card className="overflow-hidden border-0 bg-linear-to-r from-indigo-700 via-indigo-600 to-violet-600 p-0 text-white shadow-xl">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 shadow-inner">
                <CreditCard size={30} />
              </div>
              <div>
                <p className="text-sm font-medium text-indigo-200">Applicant Fee Module</p>
                <h1 className="mt-0.5 text-2xl font-bold md:text-3xl">Pending Payments</h1>
                <p className="mt-1 text-sm text-indigo-200">
                  Complete your fee payments to proceed with admission
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/modules/crm/applicants/fees/receipts")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition"
              >
                <ReceiptText size={16} />
                View Receipts
              </button>
              <button
                onClick={() => void loadPendingPayments()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Registration fee lock notice */}
      {!loading && !error && registrationFeePending && invoices.length > 1 && (
        <motion.div variants={slideItem}>
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Lock size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Registration Fee must be paid first</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Please complete your Registration Fee payment before proceeding to other fees.
                Other fee payments are locked until the Registration Fee is fully paid.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment result banner */}
      {paymentResult === "success" && (
        <motion.div variants={slideItem}>
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800">Payment successful!</p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Your payment has been processed. Your receipt has been generated and is
                available in the Receipts section.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {paymentResult === "failed" && (
        <motion.div variants={slideItem}>
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-800">Payment failed</p>
              <p className="text-sm text-rose-700 mt-0.5">
                Your payment was not completed. Please try again. If the amount was debited,
                it will be refunded within 5–7 business days.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <motion.div variants={slideItem}>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-indigo-600" />
            Loading pending payments...
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
      {!loading && !error && invoices.length === 0 && (
        <motion.div variants={slideItem}>
          <Card className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={30} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">No pending payments</h2>
            <p className="mt-2 text-sm text-slate-500">
              You have no pending invoices at this time. All fees are up to date.
            </p>
            <button
              onClick={() => router.push("/modules/crm/applicants/fees/receipts")}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
            >
              <ReceiptText size={15} />
              View Receipts
            </button>
          </Card>
        </motion.div>
      )}

      {/* Invoice list */}
      {!loading && !error && invoices.length > 0 && (
        <>
          {/* Summary header */}
          <motion.div variants={slideItem}>
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-medium text-slate-600">
                {invoices.length} pending invoice{invoices.length > 1 ? "s" : ""}
              </p>
              <p className="text-sm font-bold text-slate-900">
                Total Due:{" "}
                <span className="text-rose-600">
                  {formatINR(invoices.reduce((s, inv) => s + inv.dueAmount, 0))}
                </span>
              </p>
            </div>
          </motion.div>

          {/* Sort: Registration Fee first */}
          {[...invoices]
            .sort((a, b) => {
              if (a.feeType === "REGISTRATION" && b.feeType !== "REGISTRATION") return -1;
              if (a.feeType !== "REGISTRATION" && b.feeType === "REGISTRATION") return 1;
              return 0;
            })
            .map((invoice) => (
              <InvoiceCard
                key={invoice.invoiceId}
                invoice={invoice}
                payLocked={registrationFeePending}
                lockReason={LOCK_REASON}
              />
            ))}
        </>
      )}
    </motion.div>
  );
}

export default function PendingPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-3 p-8 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Loading...
        </div>
      }
    >
      <PendingPaymentsContent />
    </Suspense>
  );
}
