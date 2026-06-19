"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Loader2, Landmark, Save } from "lucide-react";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import type { FeeConcessionContext } from "@/lib/api/feeConcession";
import {
  fetchActiveBatches,
  fetchFeeConcessionContext,
  fetchProgramTuitionFee,
  saveFeeConcession,
} from "@/lib/api/feeConcession";
import {
  canManageFeeConcession,
  formatFeeConcessionPreviousDetails,
} from "@/lib/utils/feeConcession";

const dialogBackdrop = "fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px]";
const dialogPanel = "fixed left-1/2 top-1/2 z-50 w-[min(92vw,44rem)] -translate-x-1/2 -translate-y-1/2";

type FeeConcessionFormValues = {
  batchId: string;
  concessionAmount: string;
  concessionReason: string;
};

type FeeConcessionDialogProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

function toMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `₹ ${value.toLocaleString("en-IN")}`;
}

function toDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-IN");
  } catch {
    return value;
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-600">{message}</p>;
}

export default function FeeConcessionDialog({
  applicationId,
  open,
  onOpenChange,
  onSaved,
}: FeeConcessionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState<FeeConcessionContext | null>(null);
  const [loadError, setLoadError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [liveProgramTuitionFee, setLiveProgramTuitionFee] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isValid },
  } = useForm<FeeConcessionFormValues>({
    mode: "onChange",
    defaultValues: {
      batchId: "",
      concessionAmount: "",
      concessionReason: "",
    },
  });

  const batchId = useWatch({ control, name: "batchId" });
  const concessionAmount = useWatch({ control, name: "concessionAmount" });

  const selectedBatchName = useMemo(
    () => context?.activeBatches.find((batch) => batch.id === batchId)?.batchName ?? "",
    [batchId, context?.activeBatches],
  );

  const programTuitionFee = useMemo(() => {
    if (liveProgramTuitionFee != null) return liveProgramTuitionFee;
    return context?.programTuitionFee?.amount ?? null;
  }, [context?.programTuitionFee?.amount, liveProgramTuitionFee]);

  const concessionAmountNumber = Number(concessionAmount || 0);
  const fixedTuitionFee = useMemo(() => {
    if (programTuitionFee == null || Number.isNaN(concessionAmountNumber)) return null;
    return Math.max(0, programTuitionFee - concessionAmountNumber);
  }, [programTuitionFee, concessionAmountNumber]);

  const previousDetails = useMemo(() => {
    if (!context) return null;
    return formatFeeConcessionPreviousDetails(context);
  }, [context]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setLoadError("");
      setSuccessMessage("");
    });

    fetchFeeConcessionContext(applicationId)
      .then(async (data) => {
        if (cancelled) return;
        const activeBatches = await fetchActiveBatches(data.application.institutionId).catch(() => data.activeBatches);
        if (cancelled) return;
        setContext({
          ...data,
          activeBatches: activeBatches.length > 0 ? activeBatches : data.activeBatches,
        });
        reset({
          batchId: data.existingConcession?.batchId ?? data.programTuitionFee?.batchId ?? "",
          concessionAmount: "",
          concessionReason: "",
        });
        if (data.existingConcession?.batchId) {
          const selectedTuitionFee = await fetchProgramTuitionFee(
            data.application.institutionId,
            data.application.programId,
            data.existingConcession.batchId,
          ).catch(() => null);
          if (!cancelled) {
            setLiveProgramTuitionFee(selectedTuitionFee?.amount ?? data.programTuitionFee?.amount ?? null);
          }
        } else {
          setLiveProgramTuitionFee(data.programTuitionFee?.amount ?? null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load fee concession details.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId, open, reset]);

  useEffect(() => {
    if (!batchId || !context?.application.programId) return;
    let cancelled = false;

    fetchProgramTuitionFee(context.application.institutionId, context.application.programId, batchId)
      .then((fee) => {
        if (!cancelled) setLiveProgramTuitionFee(fee?.amount ?? null);
      })
      .catch(() => {
        if (!cancelled) setLiveProgramTuitionFee(null);
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, context?.application.institutionId, context?.application.programId]);

  useEffect(() => {
    if (!open) return;
    const amount = Number(concessionAmount || 0);
    if (programTuitionFee != null && amount > programTuitionFee) {
      setValue("concessionAmount", String(programTuitionFee), { shouldValidate: true });
    }
  }, [concessionAmount, open, programTuitionFee, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (!context) return;
    if (!canManageFeeConcession(context.application.applicationStatus)) {
      setLoadError("Fee concession not allowed for current application status");
      return;
    }

    setSaving(true);
    setLoadError("");
    try {
      const message = await saveFeeConcession(
        {
          applicationId,
          batchId: values.batchId,
          consessionAmount: Number(values.concessionAmount),
          consessionReason: values.concessionReason.trim(),
        },
        Boolean(context.existingConcession),
      );
      setSuccessMessage(message || "Fee Concession Updated Successfully");
      onSaved?.();
      const refreshed = await fetchFeeConcessionContext(applicationId);
      setContext(refreshed);
      reset({
        batchId: refreshed.existingConcession?.batchId ?? values.batchId,
        concessionAmount: "",
        concessionReason: "",
      });
      setLiveProgramTuitionFee(refreshed.programTuitionFee?.amount ?? null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to update fee concession.");
    } finally {
      setSaving(false);
    }
  });

  if (!open) return null;

  return (
    <>
      <div className={dialogBackdrop} onClick={() => onOpenChange(false)} />
      <div className={dialogPanel} role="dialog" aria-modal="true" aria-labelledby="fee-concession-title">
        <Card variant="elevated" className="max-h-[90vh] overflow-y-auto p-0">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="fee-concession-title" className="text-xl font-semibold text-slate-900">
                  Fee Concession
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure concession amount and final tuition fee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full px-2 py-1 text-slate-500 transition hover:bg-white hover:text-slate-700"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            {loading ? (
              <div className="flex min-h-56 items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading fee concession details...
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {loadError}
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-slate-500">Batch</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      {...register("batchId", { required: "Batch is required." })}
                    >
                      <option value="">Select batch</option>
                      {context?.activeBatches.map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.batchName}
                        </option>
                      ))}
                    </select>
                    <FieldError message={errors.batchId?.message} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500">Program Tuition Fee</label>
                    <input
                      readOnly
                      value={programTuitionFee != null ? toMoney(programTuitionFee) : ""}
                      placeholder="Auto-populated from selected batch"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 shadow-sm"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedBatchName ? `Loaded for ${selectedBatchName}` : "Choose a batch to load tuition fee."}
                    </p>
                    <FieldError message={errors.concessionAmount?.message} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500">Concession Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      {...register("concessionAmount", {
                        required: "Concession Amount is required.",
                        validate: (value) => {
                          const numberValue = Number(value);
                          if (Number.isNaN(numberValue)) return "Concession Amount must be numeric.";
                          if (numberValue < 0) return "Concession Amount cannot be negative.";
                          if (programTuitionFee != null && numberValue > programTuitionFee) {
                            return "Concession Amount cannot exceed Program Tuition Fee.";
                          }
                          return true;
                        },
                      })}
                    />
                    <FieldError message={errors.concessionAmount?.message} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500">Fixed Tuition Fee</label>
                    <input
                      readOnly
                      value={fixedTuitionFee != null ? toMoney(fixedTuitionFee) : ""}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-500">Concession Reason</label>
                  <textarea
                    rows={4}
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter a minimum 10 character reason"
                    {...register("concessionReason", {
                      required: "Concession Reason is required.",
                      minLength: { value: 10, message: "Concession Reason must be at least 10 characters." },
                    })}
                  />
                  <FieldError message={errors.concessionReason?.message} />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                    <Landmark size={14} />
                    {context?.application.firstName} {context?.application.lastName}
                  </span>
                  <span>{context?.application.applicationNumber || "No application number yet"}</span>
                </div>

                {previousDetails && (
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900">Previous Concession Details</h3>
                      <Badge label="History" variant="info" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <InfoRow label="Batch" value={previousDetails.batch} />
                      <InfoRow label="Program" value={previousDetails.program} />
                      <InfoRow label="Actual Tuition Fee" value={toMoney(previousDetails.actualTuitionAmount)} />
                      <InfoRow label="Previous Concession" value={toMoney(previousDetails.consessionAmount)} />
                      <InfoRow label="Fixed Tuition Fee" value={toMoney(previousDetails.fixedTuitionAmount)} />
                      <InfoRow label="Last Updated" value={toDateTime(previousDetails.lastUpdated)} />
                    </div>
                    <InfoRow label="Reason" value={previousDetails.consessionReason} />
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {successMessage}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={onSubmit}
                    loading={saving}
                    disabled={
                      saving ||
                      !isValid ||
                      !programTuitionFee ||
                      !canManageFeeConcession(context?.application.applicationStatus)
                    }
                    leftIcon={saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  >
                    Update Concession
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value ?? "—"}</span>
    </div>
  );
}
