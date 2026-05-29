import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { ApplicationStatus, InvoiceStatus, PaymentStatus, PaymentType } from "@prisma/client";
import prisma from "../../config/database";

// ── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_APPLICATION_FEE = 1000;
const SEQUENCE_PAD = 4;

// ── TypeScript types ────────────────────────────────────────────────────────

type EasebuzzEnv = "test" | "prod";

interface EasebuzzConfig {
  key: string;
  subMerchantId: string;
  salt: string;
  env: EasebuzzEnv;
}

interface EasebuzzHashFields {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  salt: string;
}

interface EasebuzzCallbackBody {
  txnid?: string;
  status?: string;
  amount?: string;
  productinfo?: string;
  firstname?: string;
  email?: string;
  phone?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  hash?: string;
  easepayid?: string;
  payment_source?: string;
  error?: string;
  error_Message?: string;
}

// ── Environment helpers ───────────────────────────────────────────────────────

function getEasebuzzConfig(): EasebuzzConfig {
  const key = process.env.EASEBUZZ_KEY;
  const salt = process.env.EASEBUZZ_SALT;
  const subMerchantId = process.env.EASEBUZZ_SUBKEY;
  if (!key || !salt || !subMerchantId) {
    throw new Error("EASEBUZZ_KEY, EASEBUZZ_SUBKEY, and EASEBUZZ_SALT must be configured in .env");
  }
  const env: EasebuzzEnv = process.env.EASEBUZZ_ENV === "prod" ? "prod" : "test";
  return { key, subMerchantId, salt, env };
}

function getEasebuzzBaseUrl(env: EasebuzzEnv): string {
  return env === "prod"
    ? "https://pay.easebuzz.in"
    : "https://testpay.easebuzz.in";
}

// ── Validation helpers ────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// ── EaseBuzz hash helpers ─────────────────────────────────────────────────────

/**
 * Generates the SHA-512 hash for EaseBuzz payment initiation.
 * Format: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
 */
function generateEasebuzzHash(f: EasebuzzHashFields): string {
  const str = [
    f.key, f.txnid, f.amount, f.productinfo, f.firstname, f.email,
    f.udf1, f.udf2, f.udf3, f.udf4, f.udf5,
    "", "", "", "", "",
    f.salt,
  ].join("|");
  return crypto.createHash("sha512").update(str).digest("hex");
}

/**
 * Verifies the SHA-512 hash received in an EaseBuzz callback.
 * Reverse format: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
function verifyEasebuzzHash(
  f: EasebuzzHashFields & { status: string; receivedHash: string }
): boolean {
  const str = [
    f.salt, f.status,
    "", "", "", "", "",
    f.udf5, f.udf4, f.udf3, f.udf2, f.udf1,
    f.email, f.firstname, f.productinfo, f.amount, f.txnid, f.key,
  ].join("|");
  const computed = crypto.createHash("sha512").update(str).digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(f.receivedHash.toLowerCase(), "hex")
    );
  } catch {
    return false;
  }
}

// ── Transaction ID generator ──────────────────────────────────────────────────

/**
 * Generates a unique transaction reference ID for EaseBuzz.
 * Format: APPPAY-{YEAR}-{12 random hex chars uppercase}
 */
function generateTransactionId(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `APPPAY-${year}-${rand}`;
}

// ── Invoice / Receipt number formatter ───────────────────────────────────────

function formatSequenceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(SEQUENCE_PAD, "0")}`;
}

// ── Temporary invoice number (placeholder before real number is assigned) ─────

function buildPendingInvoiceNumber(txnid: string): string {
  return `PENDING-${txnid}`;
}

// ── Frontend redirect helper ──────────────────────────────────────────────────

/**
 * Builds the URL to redirect the applicant's browser back to the frontend
 * after EaseBuzz posts the payment result. This ensures the applicant always
 * lands on the proper UI instead of seeing raw JSON.
 */
function buildFrontendPaymentUrl(
  status: "success" | "failed" | "error",
  applicationId?: string | null
): string {
  const base =
    process.env.FRONTEND_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const path = "/modules/crm/applicants/application";
  const params = new URLSearchParams({ payment: status });
  if (applicationId) params.set("applicationId", applicationId);
  return `${base}${path}?${params.toString()}`;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/application-fee/initiate-payment
 *
 * Validates the application, creates a PENDING Invoice and PENDING
 * PaymentTransaction (required by the schema FK: PaymentTransaction.invoiceId),
 * then calls EaseBuzz to obtain an access_key and returns the payment URL.
 *
 * NOTE: The invoice gets a placeholder number (PENDING-{txnid}) at this stage.
 * The real sequential invoice number is assigned atomically on payment success.
 */
export async function initiatePayment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { studentAdmissionApplicationId } = req.body as {
      studentAdmissionApplicationId?: unknown;
    };

    if (!isValidUuid(studentAdmissionApplicationId)) {
      res
        .status(400)
        .json({ error: "studentAdmissionApplicationId must be a valid UUID." });
      return;
    }

    // ── Fetch application ────────────────────────────────────────────────────
    const application = await prisma.studentAdmissionApplication.findUnique({
      where: { id: studentAdmissionApplicationId },
      select: {
        id: true,
        institutionId: true,
        applicationNumber: true,
        applicationStatus: true,
        isActive: true,
        firstName: true,
        lastName: true,
        email: true,
        mobileNo: true,
        applicationFees: {
          select: { id: true, paymentStatus: true },
        },
      },
    });

    if (!application) {
      res.status(404).json({ error: "Application not found." });
      return;
    }

    if (!application.isActive) {
      res.status(409).json({ error: "Application is inactive." });
      return;
    }

    // ── Block if fee already paid ─────────────────────────────────────────────
    const alreadyPaid = application.applicationFees.some(
      (f) => f.paymentStatus === PaymentStatus.SUCCESS
    );
    if (alreadyPaid) {
      res.status(409).json({ error: "Application fee has already been paid." });
      return;
    }

    // ── Fetch InstitutionFinanceConfig ────────────────────────────────────────
    const financeConfig = await prisma.institutionFinanceConfig.findUnique({
      where: { institutionId: application.institutionId },
      select: { id: true, invoicePrefix: true, receiptPrefix: true },
    });
    if (!financeConfig) {
      res.status(409).json({
        error:
          "Finance configuration not found for this institution. Please contact admin.",
      });
      return;
    }

    // ── Fetch APPLICATION_FEE category ────────────────────────────────────────
    const feeCategory = await prisma.feeCategory.findFirst({
      where: {
        institutionId: application.institutionId,
        categoryType: "APPLICATION_FEE",
        isActive: true,
      },
      select: { id: true, amount: true, feeName: true },
    });
    if (!feeCategory) {
      res.status(409).json({
        error:
          "Application fee category not configured for this institution. Please contact admin.",
      });
      return;
    }

    const feeAmount =
      feeCategory.amount != null && feeCategory.amount > 0
        ? feeCategory.amount
        : DEFAULT_APPLICATION_FEE;

    // ── Load EaseBuzz config ──────────────────────────────────────────────────
    let ebConfig: EasebuzzConfig;
    try {
      ebConfig = getEasebuzzConfig();
    } catch (configErr) {
      next(configErr);
      return;
    }

    // ── Reuse existing PENDING transaction if one already exists ─────────────
    const existingPending = await prisma.paymentTransaction.findFirst({
      where: {
        studentAdmissionApplicationId,
        paymentStatus: PaymentStatus.PENDING,
      },
      select: {
        id: true,
        transactionId: true,
        amount: true,
      },
    });

    let effectiveTxnId: string;
    let effectiveFeeAmount: number;

    if (existingPending?.transactionId) {
      // Re-use the existing pending transaction (user retrying payment)
      effectiveTxnId = existingPending.transactionId;
      effectiveFeeAmount = existingPending.amount;
    } else {
      // ── Generate new transaction ID ───────────────────────────────────────
      const txnid = generateTransactionId();

      // ── Create placeholder PENDING Invoice ────────────────────────────────
      // The schema requires PaymentTransaction.invoiceId to be non-null.
      // A placeholder invoice (status=PENDING, invoiceNumber=PENDING-{txnid})
      // is created here. The real sequential invoice number is assigned inside
      // the atomic prisma.$transaction() on payment success.
      const pendingInvoice = await prisma.invoice.create({
        data: {
          institutionId: application.institutionId,
          invoiceNumber: buildPendingInvoiceNumber(txnid),
          invoiceDate: new Date(),
          dueDate: null,
          studentAdmissionApplicationId,
          feeCategoryId: feeCategory.id,
          amount: feeAmount,
          status: InvoiceStatus.PENDING,
          remarks: "Application fee payment initiated",
        },
        select: { id: true },
      });

      // ── Create PENDING PaymentTransaction ─────────────────────────────────
      await prisma.paymentTransaction.create({
        data: {
          institutionId: application.institutionId,
          invoiceId: pendingInvoice.id,
          studentAdmissionApplicationId,
          transactionId: txnid,
          amount: feeAmount,
          amountPaid: 0,
          amountDue: feeAmount,
          paymentType: PaymentType.ONLINE,
          paymentStatus: PaymentStatus.PENDING,
          gatewayName: "EASEBUZZ",
        },
        select: { id: true },
      });

      effectiveTxnId = txnid;
      effectiveFeeAmount = feeAmount;
    }

    // ── Build EaseBuzz hash ───────────────────────────────────────────────────
    const amountStr = effectiveFeeAmount.toFixed(2);
    const hashFields: EasebuzzHashFields = {
      key: ebConfig.key,
      txnid: effectiveTxnId,
      amount: amountStr,
      productinfo: feeCategory.feeName ?? "Application Fee",
      firstname: application.firstName,
      email: application.email ?? "",
      udf1: studentAdmissionApplicationId, // used to identify the application on callback
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
      salt: ebConfig.salt,
    };
    const hash = generateEasebuzzHash(hashFields);

    const baseUrl = getEasebuzzBaseUrl(ebConfig.env);
    const backendUrl =
      process.env.BACKEND_URL?.replace(/\/$/, "") ?? "http://localhost:5000";
    const successUrl =
      process.env.EASEBUZZ_SUCCESS_URL ??
      `${backendUrl}/api/application-fee/payment-success`;
    const failureUrl =
      process.env.EASEBUZZ_FAILURE_URL ??
      `${backendUrl}/api/application-fee/payment-failure`;

    // ── Call EaseBuzz initiateLink ────────────────────────────────────────────
    const params = new URLSearchParams({
      key: ebConfig.key,
      sub_merchant_id: ebConfig.subMerchantId,
      txnid: effectiveTxnId,
      amount: amountStr,
      productinfo: hashFields.productinfo,
      firstname: application.firstName,
      email: application.email ?? "",
      phone: application.mobileNo ?? "",
      surl: successUrl,
      furl: failureUrl,
      hash,
      udf1: studentAdmissionApplicationId,
      udf2: "",
      udf3: "",
      udf4: "",
      udf5: "",
    });

    const ebResponse = await fetch(`${baseUrl}/payment/initiateLink`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const ebData = (await ebResponse.json()) as {
      status?: number;
      data?: string;
      error_desc?: string;
    };

    if (!ebResponse.ok || ebData.status !== 1 || !ebData.data) {
      res.status(502).json({
        error: "Payment gateway error. Please try again later.",
        detail:
          ebData.error_desc ?? "EaseBuzz returned an unexpected response.",
      });
      return;
    }

    const accessKey = ebData.data;
    const paymentUrl = `${baseUrl}/pay/${accessKey}`;

    res.status(200).json({
      message: "Payment initiated successfully.",
      transactionId: effectiveTxnId,
      accessKey,
      paymentUrl,
      amount: effectiveFeeAmount,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/application-fee/payment-success
 *
 * EaseBuzz callback on successful payment (no JWT — called by EaseBuzz directly).
 *
 * Flow:
 *  1. Verify EaseBuzz response hash
 *  2. Find the linked PaymentTransaction via txnid
 *  3. Idempotency: return 200 immediately if already processed
 *  4. In a single prisma.$transaction():
 *     a. Increment invoice counter → assign real invoice number to PENDING Invoice
 *     b. Update Invoice status to PAID
 *     c. Update PaymentTransaction to SUCCESS
 *     d. Create ApplicationFee (SUCCESS)
 *     e. Increment receipt counter → create Receipt with real receipt number
 *     f. Update StudentAdmissionApplication status to APPLICATION_FEE_PAID
 */
export async function paymentSuccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as EasebuzzCallbackBody;

    const txnid = body.txnid ?? "";
    const status = body.status ?? "";
    const receivedHash = body.hash ?? "";
    const amount = body.amount ?? "";
    const productinfo = body.productinfo ?? "";
    const firstname = body.firstname ?? "";
    const email = body.email ?? "";
    const udf1 = body.udf1 ?? "";
    const udf2 = body.udf2 ?? "";
    const udf3 = body.udf3 ?? "";
    const udf4 = body.udf4 ?? "";
    const udf5 = body.udf5 ?? "";
    const easepayid = body.easepayid ?? null;

    if (!txnid || !status || !receivedHash) {
      res.redirect(302, buildFrontendPaymentUrl("error", udf1 || null));
      return;
    }

    // ── Load EaseBuzz config for verification ─────────────────────────────────
    let ebConfig: EasebuzzConfig;
    try {
      ebConfig = getEasebuzzConfig();
    } catch (configErr) {
      next(configErr);
      return;
    }

    // ── Verify EaseBuzz hash ──────────────────────────────────────────────────
    const hashValid = verifyEasebuzzHash({
      key: ebConfig.key,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      status,
      salt: ebConfig.salt,
      receivedHash,
    });

    if (!hashValid) {
      res.redirect(302, buildFrontendPaymentUrl("error", udf1 || null));
      return;
    }

    if (status !== "success") {
      res.redirect(302, buildFrontendPaymentUrl("failed", udf1 || null));
      return;
    }

    // ── Find PaymentTransaction ───────────────────────────────────────────────
    const txn = await prisma.paymentTransaction.findUnique({
      where: { transactionId: txnid },
      select: {
        id: true,
        invoiceId: true,
        institutionId: true,
        studentAdmissionApplicationId: true,
        amount: true,
        paymentStatus: true,
      },
    });

    if (!txn) {
      res.redirect(302, buildFrontendPaymentUrl("error", udf1 || null));
      return;
    }

    // ── Idempotency: already processed ────────────────────────────────────────
    if (txn.paymentStatus === PaymentStatus.SUCCESS) {
      const alreadyPaidId = txn.studentAdmissionApplicationId ?? (udf1 || null);
      res.redirect(302, buildFrontendPaymentUrl("success", alreadyPaidId));
      return;
    }

    const applicationId =
      txn.studentAdmissionApplicationId ?? (udf1 || null);

    if (!applicationId) {
      res.redirect(302, buildFrontendPaymentUrl("error", null));
      return;
    }

    // Extra idempotency check via ApplicationFee
    const existingAppFee = await prisma.applicationFee.findUnique({
      where: { studentAdmissionApplicationId: applicationId },
      select: { id: true, paymentStatus: true },
    });
    if (existingAppFee?.paymentStatus === PaymentStatus.SUCCESS) {
      res.redirect(302, buildFrontendPaymentUrl("success", applicationId));
      return;
    }

    // ── Fetch InstitutionFinanceConfig ────────────────────────────────────────
    const financeConfig = await prisma.institutionFinanceConfig.findUnique({
      where: { institutionId: txn.institutionId },
      select: {
        id: true,
        invoicePrefix: true,
        receiptPrefix: true,
        currentInvoiceNumber: true,
        currentReceiptNumber: true,
      },
    });
    if (!financeConfig) {
      res.redirect(302, buildFrontendPaymentUrl("error", applicationId));
      return;
    }

    // ── Fetch fee category ────────────────────────────────────────────────────
    const feeCategory = await prisma.feeCategory.findFirst({
      where: {
        institutionId: txn.institutionId,
        categoryType: "APPLICATION_FEE",
        isActive: true,
      },
      select: { id: true },
    });
    if (!feeCategory) {
      res.redirect(302, buildFrontendPaymentUrl("error", applicationId));
      return;
    }

    const now = new Date();
    const paidAmount = txn.amount;

    // ── Atomic transaction ────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Increment invoice counter and compute real invoice number
      const updatedConfigInvoice = await tx.institutionFinanceConfig.update({
        where: { id: financeConfig.id },
        data: { currentInvoiceNumber: { increment: 1 } },
        select: { invoicePrefix: true, currentInvoiceNumber: true },
      });
      const invoiceNumber = formatSequenceNumber(
        updatedConfigInvoice.invoicePrefix,
        updatedConfigInvoice.currentInvoiceNumber
      );

      // Step 2: Update the PENDING Invoice → assign real number + mark PAID
      const updatedInvoice = await tx.invoice.update({
        where: { id: txn.invoiceId },
        data: {
          invoiceNumber,
          invoiceDate: now,
          status: InvoiceStatus.PAID,
          remarks: "Application fee paid via EaseBuzz",
        },
        select: { id: true, invoiceNumber: true },
      });

      // Step 3: Update PaymentTransaction → SUCCESS
      await tx.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          paymentStatus: PaymentStatus.SUCCESS,
          amountPaid: paidAmount,
          amountDue: 0,
          easebuzzPaymentId: easepayid,
          orderId: easepayid,
          collectionDate: now,
        },
      });

      // Step 4: Create ApplicationFee
      await tx.applicationFee.create({
        data: {
          institutionId: txn.institutionId,
          studentAdmissionApplicationId: applicationId,
          invoiceId: updatedInvoice.id,
          feeCategoryId: feeCategory.id,
          amount: paidAmount,
          amountPaid: paidAmount,
          amountDue: 0,
          paymentStatus: PaymentStatus.SUCCESS,
          paidAt: now,
          remarks: `EaseBuzz payment ID: ${easepayid ?? "N/A"}`,
        },
        select: { id: true },
      });

      // Step 5: Increment receipt counter and compute receipt number
      const updatedConfigReceipt = await tx.institutionFinanceConfig.update({
        where: { id: financeConfig.id },
        data: { currentReceiptNumber: { increment: 1 } },
        select: { receiptPrefix: true, currentReceiptNumber: true },
      });
      const receiptNumber = formatSequenceNumber(
        updatedConfigReceipt.receiptPrefix,
        updatedConfigReceipt.currentReceiptNumber
      );

      // Step 6: Create Receipt
      const receipt = await tx.receipt.create({
        data: {
          institutionId: txn.institutionId,
          paymentTransactionId: txn.id,
          studentAdmissionApplicationId: applicationId,
          receiptNumber,
          receiptDate: now,
          amount: paidAmount,
        },
        select: { id: true, receiptNumber: true },
      });

      // Step 7: Update application status
      await tx.studentAdmissionApplication.update({
        where: { id: applicationId },
        data: { applicationStatus: ApplicationStatus.APPLICATION_FEE_PAID },
      });

      return {
        invoiceNumber: updatedInvoice.invoiceNumber,
        receiptNumber: receipt.receiptNumber,
      };
    });

    res.redirect(302, buildFrontendPaymentUrl("success", applicationId));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/application-fee/payment-failure
 *
 * EaseBuzz callback on failed/cancelled payment (no JWT — called by EaseBuzz directly).
 * Marks the PaymentTransaction as FAILED and the placeholder Invoice as CANCELLED.
 * Does NOT create any invoice, receipt, or application fee record.
 */
export async function paymentFailure(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as EasebuzzCallbackBody;

    const txnid = body.txnid ?? "";
    const status = body.status ?? "failure";
    const receivedHash = body.hash ?? "";
    const udf1 = body.udf1 ?? "";

    if (!txnid) {
      res.redirect(302, buildFrontendPaymentUrl("failed", udf1 || null));
      return;
    }

    // ── Verify hash if provided ───────────────────────────────────────────────
    if (receivedHash) {
      let ebConfig: EasebuzzConfig;
      try {
        ebConfig = getEasebuzzConfig();
      } catch (configErr) {
        next(configErr);
        return;
      }

      const hashValid = verifyEasebuzzHash({
        key: ebConfig.key,
        txnid,
        amount: body.amount ?? "",
        productinfo: body.productinfo ?? "",
        firstname: body.firstname ?? "",
        email: body.email ?? "",
        udf1: body.udf1 ?? "",
        udf2: body.udf2 ?? "",
        udf3: body.udf3 ?? "",
        udf4: body.udf4 ?? "",
        udf5: body.udf5 ?? "",
        status,
        salt: ebConfig.salt,
        receivedHash,
      });

      if (!hashValid) {
        res.redirect(302, buildFrontendPaymentUrl("failed", udf1 || null));
        return;
      }
    }

    // ── Find PaymentTransaction ───────────────────────────────────────────────
    const txn = await prisma.paymentTransaction.findUnique({
      where: { transactionId: txnid },
      select: {
        id: true,
        invoiceId: true,
        paymentStatus: true,
        studentAdmissionApplicationId: true,
      },
    });

    if (!txn) {
      res.redirect(302, buildFrontendPaymentUrl("failed", udf1 || null));
      return;
    }

    const failureAppId = txn.studentAdmissionApplicationId ?? (udf1 || null);

    // If already finalized, redirect based on the actual recorded status
    if (txn.paymentStatus !== PaymentStatus.PENDING) {
      const redirectStatus =
        txn.paymentStatus === PaymentStatus.SUCCESS ? "success" : "failed";
      res.redirect(302, buildFrontendPaymentUrl(redirectStatus, failureAppId));
      return;
    }

    // ── Mark transaction FAILED and placeholder invoice CANCELLED ─────────────
    await prisma.$transaction([
      prisma.paymentTransaction.update({
        where: { id: txn.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      }),
      prisma.invoice.update({
        where: { id: txn.invoiceId },
        data: { status: InvoiceStatus.CANCELLED },
      }),
    ]);

    res.redirect(302, buildFrontendPaymentUrl("failed", failureAppId));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/application-fee/status/:applicationId
 *
 * Returns the current payment status for an application, including
 * invoice number, receipt number, and amount details.
 */
export async function getPaymentStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { applicationId } = req.params;

    if (!isValidUuid(applicationId)) {
      res.status(400).json({ error: "applicationId must be a valid UUID." });
      return;
    }

    const application = await prisma.studentAdmissionApplication.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });

    if (!application) {
      res.status(404).json({ error: "Application not found." });
      return;
    }

    // ── Check for a completed ApplicationFee (payment succeeded) ─────────────
    const appFee = await prisma.applicationFee.findUnique({
      where: { studentAdmissionApplicationId: applicationId },
      select: {
        amount: true,
        amountPaid: true,
        amountDue: true,
        paymentStatus: true,
        paidAt: true,
        invoice: {
          select: {
            invoiceNumber: true,
            status: true,
            paymentTransactions: {
              where: { paymentStatus: PaymentStatus.SUCCESS },
              select: {
                receipt: {
                  select: { receiptNumber: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (appFee) {
      const receiptNumber =
        appFee.invoice?.paymentTransactions?.[0]?.receipt?.receiptNumber ??
        null;
      res.status(200).json({
        paymentStatus: appFee.paymentStatus,
        invoiceNumber: appFee.invoice?.invoiceNumber ?? null,
        receiptNumber,
        amount: appFee.amount,
        amountPaid: appFee.amountPaid,
        amountDue: appFee.amountDue,
        paidAt: appFee.paidAt,
      });
      return;
    }

    // ── No ApplicationFee: check for a pending/failed transaction ─────────────
    const latestTxn = await prisma.paymentTransaction.findFirst({
      where: { studentAdmissionApplicationId: applicationId },
      orderBy: { createdAt: "desc" },
      select: {
        paymentStatus: true,
        amount: true,
        amountPaid: true,
        amountDue: true,
        transactionId: true,
      },
    });

    if (!latestTxn) {
      res.status(200).json({
        paymentStatus: "NOT_INITIATED",
        invoiceNumber: null,
        receiptNumber: null,
        amount: null,
        amountPaid: null,
        amountDue: null,
        paidAt: null,
      });
      return;
    }

    res.status(200).json({
      paymentStatus: latestTxn.paymentStatus,
      invoiceNumber: null,
      receiptNumber: null,
      amount: latestTxn.amount,
      amountPaid: latestTxn.amountPaid,
      amountDue: latestTxn.amountDue,
      paidAt: null,
    });
  } catch (error) {
    next(error);
  }
}
