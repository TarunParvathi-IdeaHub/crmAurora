import type { NextFunction, Request, Response } from "express";
import prisma from "../../config/database";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreateConfigBody {
  institutionId?: unknown;
  invoicePrefix?: unknown;
  receiptPrefix?: unknown;
}

interface EditConfigBody {
  invoicePrefix?: unknown;
  receiptPrefix?: unknown;
  currentInvoiceNumber?: unknown;
  currentReceiptNumber?: unknown;
}

interface FinanceConfigRecord {
  id: string;
  institutionId: string;
  invoicePrefix: string;
  receiptPrefix: string;
  currentInvoiceNumber: number;
  currentReceiptNumber: number;
  createdAt: Date;
  updatedAt: Date;
  institution: {
    id: string;
    institutionName: string;
    institutionCode: string;
    institutionCity: string;
    institutionState: string;
  };
}

// ── Prisma select clause (reused across queries) ──────────────────────────────

const CONFIG_SELECT = {
  id:                    true,
  institutionId:         true,
  invoicePrefix:         true,
  receiptPrefix:         true,
  currentInvoiceNumber:  true,
  currentReceiptNumber:  true,
  createdAt:             true,
  updatedAt:             true,
  institution: {
    select: {
      id:               true,
      institutionName:  true,
      institutionCode:  true,
      institutionCity:  true,
      institutionState: true,
    },
  },
} as const;

// ── Validation helpers ────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// ── Response formatter ────────────────────────────────────────────────────────

function formatConfig(config: FinanceConfigRecord) {
  return {
    id:                   config.id,
    institutionId:        config.institutionId,
    invoicePrefix:        config.invoicePrefix,
    receiptPrefix:        config.receiptPrefix,
    currentInvoiceNumber: config.currentInvoiceNumber,
    currentReceiptNumber: config.currentReceiptNumber,
    institution:          config.institution,
    createdAt:            config.createdAt,
    updatedAt:            config.updatedAt,
  };
}

// ── Sequence helpers ──────────────────────────────────────────────────────────

/**
 * Increments and returns the next invoice number for the given config.
 * Atomically updates `currentInvoiceNumber` in the DB and returns the
 * zero-padded formatted invoice string, e.g. "AUU-000101".
 */
export async function generateNextInvoiceNumber(configId: string): Promise<string> {
  const updated = await prisma.institutionFinanceConfig.update({
    where: { id: configId },
    data: { currentInvoiceNumber: { increment: 1 } },
    select: { invoicePrefix: true, currentInvoiceNumber: true },
  });
  const padded = String(updated.currentInvoiceNumber).padStart(6, "0");
  return `${updated.invoicePrefix}-${padded}`;
}

/**
 * Increments and returns the next receipt number for the given config.
 * Atomically updates `currentReceiptNumber` in the DB and returns the
 * zero-padded formatted receipt string, e.g. "AUUR-000051".
 */
export async function generateNextReceiptNumber(configId: string): Promise<string> {
  const updated = await prisma.institutionFinanceConfig.update({
    where: { id: configId },
    data: { currentReceiptNumber: { increment: 1 } },
    select: { receiptPrefix: true, currentReceiptNumber: true },
  });
  const padded = String(updated.currentReceiptNumber).padStart(6, "0");
  return `${updated.receiptPrefix}-${padded}`;
}

// ── Partial update helper ─────────────────────────────────────────────────────

/**
 * Builds a Prisma `data` object containing only the fields present in the
 * request body. Fields absent from the body are left untouched in the DB.
 *
 * `institutionId` is intentionally excluded — it is immutable after creation.
 */
function buildPartialUpdate(body: EditConfigBody): Record<string, string | number> {
  const data: Record<string, string | number> = {};

  if (body.invoicePrefix !== undefined) {
    data.invoicePrefix = (body.invoicePrefix as string).trim();
  }
  if (body.receiptPrefix !== undefined) {
    data.receiptPrefix = (body.receiptPrefix as string).trim();
  }
  if (body.currentInvoiceNumber !== undefined) {
    data.currentInvoiceNumber = body.currentInvoiceNumber as number;
  }
  if (body.currentReceiptNumber !== undefined) {
    data.currentReceiptNumber = body.currentReceiptNumber as number;
  }

  return data;
}

// ── Controller: createFinanceConfig ──────────────────────────────────────────

/**
 * POST /api/institution-finance-config/create
 *
 * Creates a new finance configuration for an institution.
 * Each institution may have at most one config (enforced by @unique on institutionId).
 */
export const createFinanceConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as CreateConfigBody;

    // ── Validate institutionId ───────────────────────────────────────────────
    if (!isValidUuid(body.institutionId)) {
      res.status(400).json({ success: false, error: "institutionId must be a valid UUID." });
      return;
    }

    // ── Validate prefix fields ───────────────────────────────────────────────
    if (!isNonEmptyString(body.invoicePrefix)) {
      res.status(400).json({ success: false, error: "invoicePrefix is required." });
      return;
    }
    if (!isNonEmptyString(body.receiptPrefix)) {
      res.status(400).json({ success: false, error: "receiptPrefix is required." });
      return;
    }

    const institutionId  = body.institutionId.trim();
    const invoicePrefix  = body.invoicePrefix.trim().toUpperCase();
    const receiptPrefix  = body.receiptPrefix.trim().toUpperCase();

    // ── Check institution exists ─────────────────────────────────────────────
    const institution = await prisma.institution.findUnique({
      where:  { id: institutionId },
      select: { id: true },
    });
    if (!institution) {
      res.status(404).json({ success: false, error: "Institution not found." });
      return;
    }

    // ── Prevent duplicate config ─────────────────────────────────────────────
    const existing = await prisma.institutionFinanceConfig.findUnique({
      where:  { institutionId },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        error: "A finance configuration already exists for this institution.",
      });
      return;
    }

    // ── Create config ────────────────────────────────────────────────────────
    const config = await prisma.institutionFinanceConfig.create({
      data: {
        institutionId,
        invoicePrefix,
        receiptPrefix,
        currentInvoiceNumber: 0,
        currentReceiptNumber: 0,
      },
      select: CONFIG_SELECT,
    });

    res.status(201).json({
      success: true,
      message: "Finance configuration created successfully.",
      data: formatConfig(config as unknown as FinanceConfigRecord),
    });
  } catch (error) {
    next(error);
  }
};

// ── Controller: getAllFinanceConfigs ──────────────────────────────────────────

/**
 * GET /api/institution-finance-config/getall
 *
 * Returns all finance configurations ordered newest-first.
 */
export const getAllFinanceConfigs = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const configs = await prisma.institutionFinanceConfig.findMany({
      select:  CONFIG_SELECT,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count:   configs.length,
      data:    (configs as unknown as FinanceConfigRecord[]).map(formatConfig),
    });
  } catch (error) {
    next(error);
  }
};

// ── Controller: getFinanceConfigByInstitution ─────────────────────────────────

/**
 * GET /api/institution-finance-config/:institutionId
 *
 * Returns the finance configuration for a specific institution.
 */
export const getFinanceConfigByInstitution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { institutionId } = req.params;

    if (!isValidUuid(institutionId)) {
      res.status(400).json({ success: false, error: "institutionId must be a valid UUID." });
      return;
    }

    const config = await prisma.institutionFinanceConfig.findUnique({
      where:  { institutionId },
      select: CONFIG_SELECT,
    });

    if (!config) {
      res.status(404).json({
        success: false,
        error: "Finance configuration not found for this institution.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: formatConfig(config as unknown as FinanceConfigRecord),
    });
  } catch (error) {
    next(error);
  }
};

// ── Controller: editFinanceConfig ─────────────────────────────────────────────

/**
 * PUT /api/institution-finance-config/edit/:configId
 *
 * Partially updates an existing finance configuration.
 * Only fields present in the request body are updated.
 * institutionId is immutable and is ignored even if supplied.
 */
export const editFinanceConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { configId } = req.params;
    const body = req.body as EditConfigBody;

    if (!isValidUuid(configId)) {
      res.status(400).json({ success: false, error: "configId must be a valid UUID." });
      return;
    }

    // ── Validate fields that ARE present in the body ─────────────────────────
    if (body.invoicePrefix !== undefined && !isNonEmptyString(body.invoicePrefix)) {
      res.status(400).json({ success: false, error: "invoicePrefix must be a non-empty string." });
      return;
    }
    if (body.receiptPrefix !== undefined && !isNonEmptyString(body.receiptPrefix)) {
      res.status(400).json({ success: false, error: "receiptPrefix must be a non-empty string." });
      return;
    }
    if (
      body.currentInvoiceNumber !== undefined &&
      !isNonNegativeInteger(body.currentInvoiceNumber)
    ) {
      res.status(400).json({
        success: false,
        error: "currentInvoiceNumber must be a non-negative integer.",
      });
      return;
    }
    if (
      body.currentReceiptNumber !== undefined &&
      !isNonNegativeInteger(body.currentReceiptNumber)
    ) {
      res.status(400).json({
        success: false,
        error: "currentReceiptNumber must be a non-negative integer.",
      });
      return;
    }

    // ── Confirm config exists ────────────────────────────────────────────────
    const existing = await prisma.institutionFinanceConfig.findUnique({
      where:  { id: configId },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Finance configuration not found." });
      return;
    }

    // ── Build partial update payload ─────────────────────────────────────────
    const updateData = buildPartialUpdate(body);

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        error: "No updatable fields provided. Supply at least one of: invoicePrefix, receiptPrefix, currentInvoiceNumber, currentReceiptNumber.",
      });
      return;
    }

    // ── Normalise string fields ──────────────────────────────────────────────
    if (typeof updateData.invoicePrefix === "string") {
      updateData.invoicePrefix = updateData.invoicePrefix.toUpperCase();
    }
    if (typeof updateData.receiptPrefix === "string") {
      updateData.receiptPrefix = updateData.receiptPrefix.toUpperCase();
    }

    // ── Persist ──────────────────────────────────────────────────────────────
    const updated = await prisma.institutionFinanceConfig.update({
      where:  { id: configId },
      data:   updateData,
      select: CONFIG_SELECT,
    });

    res.status(200).json({
      success: true,
      message: "Finance configuration updated successfully.",
      data: formatConfig(updated as unknown as FinanceConfigRecord),
    });
  } catch (error) {
    next(error);
  }
};
