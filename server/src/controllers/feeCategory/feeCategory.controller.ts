import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../config/database";

// ── Enum ─────────────────────────────────────────────────────────────────────

const FEE_CATEGORY_TYPES = [
  "APPLICATION_FEE",
  "REGISTRATION_FEE",
  "TUITION_FEE",
  "HOSTEL_FEE",
  "TRANSPORT_FEE",
  "EXAM_FEE",
] as const;

type FeeCategoryType = (typeof FEE_CATEGORY_TYPES)[number];

// ── TypeScript interfaces ─────────────────────────────────────────────────────

interface CreateFeeCategoryBody {
  institutionId?: unknown;
  categoryType?: unknown;
  feeName?: unknown;
  amount?: unknown;
  isFixed?: unknown;
}

interface UpdateFeeCategoryBody {
  id?: unknown;
  feeName?: unknown;
  amount?: unknown;
  isFixed?: unknown;
  isActive?: unknown;
}

interface FeeCategoryRecord {
  id: string;
  institutionId: string;
  categoryType: FeeCategoryType;
  feeName: string;
  amount: number | null;
  isFixed: boolean;
  isActive: boolean;
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

// ── Prisma select clause ──────────────────────────────────────────────────────

const FEE_CATEGORY_SELECT = {
  id: true,
  institutionId: true,
  categoryType: true,
  feeName: true,
  amount: true,
  isFixed: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  institution: {
    select: {
      id: true,
      institutionName: true,
      institutionCode: true,
      institutionCity: true,
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

function isValidFeeCategoryType(value: unknown): value is FeeCategoryType {
  return (
    typeof value === "string" &&
    (FEE_CATEGORY_TYPES as readonly string[]).includes(value)
  );
}

function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Validates the amount field against isFixed.
 * Returns an error string if invalid, or null if valid.
 */
function validateFeeCategoryAmount(
  isFixed: boolean,
  amount: unknown
): string | null {
  if (isFixed) {
    if (amount === undefined || amount === null) {
      return "amount is required when isFixed is true.";
    }
    if (!isValidAmount(amount)) {
      return "amount must be a non-negative number when isFixed is true.";
    }
  }
  // When isFixed is false: amount is optional; if provided it must be a valid number
  if (
    amount !== undefined &&
    amount !== null &&
    !isValidAmount(amount)
  ) {
    return "amount must be a non-negative number.";
  }
  return null;
}

// ── Response formatter ────────────────────────────────────────────────────────

function formatFeeCategory(record: FeeCategoryRecord) {
  return {
    id: record.id,
    institutionId: record.institutionId,
    categoryType: record.categoryType,
    feeName: record.feeName,
    amount: record.amount,
    isFixed: record.isFixed,
    isActive: record.isActive,
    institution: record.institution,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

// ── Dependency checker ────────────────────────────────────────────────────────

async function checkFeeCategoryDependencies(id: string): Promise<boolean> {
  const [invoiceCount, applicationFeeCount] = await Promise.all([
    prisma.invoice.count({ where: { feeCategoryId: id } }),
    prisma.applicationFee.count({ where: { feeCategoryId: id } }),
  ]);
  return invoiceCount > 0 || applicationFeeCount > 0;
}

// ── Partial update builder ────────────────────────────────────────────────────

function buildPartialUpdate(body: UpdateFeeCategoryBody): {
  data: Prisma.FeeCategoryUpdateInput;
  error: string | null;
} {
  const data: Prisma.FeeCategoryUpdateInput = {};

  if (body.feeName !== undefined) {
    if (!isNonEmptyString(body.feeName)) {
      return { data: {}, error: "feeName must be a non-empty string." };
    }
    data.feeName = (body.feeName as string).trim();
  }

  // Resolve the effective isFixed value
  const effectiveIsFixed =
    body.isFixed !== undefined ? body.isFixed : undefined;

  if (body.isFixed !== undefined) {
    if (typeof body.isFixed !== "boolean") {
      return { data: {}, error: "isFixed must be a boolean." };
    }
    data.isFixed = body.isFixed;
  }

  if (body.amount !== undefined) {
    if (body.amount === null) {
      data.amount = null;
    } else {
      if (!isValidAmount(body.amount)) {
        return { data: {}, error: "amount must be a non-negative number." };
      }
      data.amount = body.amount as number;
    }
  }

  // Cross-field validation: if isFixed is being set to true, amount must end up non-null
  if (effectiveIsFixed === true) {
    const resolvedAmount =
      body.amount !== undefined ? body.amount : undefined;
    if (resolvedAmount === null || resolvedAmount === undefined) {
      // amount is not supplied in this request; caller must ensure it already exists
      // We allow the partial update here; the controller will do the cross-check
      // against the existing record.
    } else if (!isValidAmount(resolvedAmount)) {
      return {
        data: {},
        error: "amount must be a non-negative number when isFixed is true.",
      };
    }
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return { data: {}, error: "isActive must be a boolean." };
    }
    data.isActive = body.isActive;
  }

  return { data, error: null };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/feecategory/create
 */
export async function createFeeCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateFeeCategoryBody;

    // ── Validate institutionId ──
    if (!isValidUuid(body.institutionId)) {
      res.status(400).json({ error: "institutionId must be a valid UUID." });
      return;
    }

    // ── Validate categoryType ──
    if (!isValidFeeCategoryType(body.categoryType)) {
      res.status(400).json({
        error: `categoryType must be one of: ${FEE_CATEGORY_TYPES.join(", ")}.`,
      });
      return;
    }

    // ── Validate feeName ──
    if (!isNonEmptyString(body.feeName)) {
      res.status(400).json({ error: "feeName is required." });
      return;
    }

    // ── Resolve isFixed (default true) ──
    const isFixed =
      body.isFixed === undefined ? true : Boolean(body.isFixed);

    // ── Validate amount vs isFixed ──
    const amountError = validateFeeCategoryAmount(isFixed, body.amount);
    if (amountError) {
      res.status(400).json({ error: amountError });
      return;
    }

    // ── Verify institution exists ──
    const institution = await prisma.institution.findUnique({
      where: { id: body.institutionId },
      select: { id: true },
    });
    if (!institution) {
      res.status(404).json({ error: "Institution not found." });
      return;
    }

    // ── Duplicate check (institutionId + categoryType) ──
    const existing = await prisma.feeCategory.findUnique({
      where: {
        institutionId_categoryType: {
          institutionId: body.institutionId,
          categoryType: body.categoryType,
        },
      },
      select: { id: true },
    });
    if (existing) {
      res.status(409).json({
        error:
          "Fee category already exists for this institution and category type.",
      });
      return;
    }

    // ── Create ──
    const created = await prisma.feeCategory.create({
      data: {
        institutionId: body.institutionId,
        categoryType: body.categoryType,
        feeName: (body.feeName as string).trim(),
        amount:
          isFixed
            ? (body.amount as number)
            : body.amount !== undefined && body.amount !== null
            ? (body.amount as number)
            : null,
        isFixed,
        isActive: true,
      },
      select: FEE_CATEGORY_SELECT,
    });

    res.status(201).json({
      message: "Fee category created successfully.",
      feeCategory: formatFeeCategory(created as FeeCategoryRecord),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/feecategory/update
 */
export async function updateFeeCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as UpdateFeeCategoryBody;

    // ── Validate id ──
    if (!isValidUuid(body.id)) {
      res.status(400).json({ error: "id must be a valid UUID." });
      return;
    }

    // ── Verify fee category exists ──
    const existing = await prisma.feeCategory.findUnique({
      where: { id: body.id as string },
      select: {
        id: true,
        isFixed: true,
        amount: true,
      },
    });
    if (!existing) {
      res.status(404).json({ error: "Fee category not found." });
      return;
    }

    // ── Build partial update payload ──
    const { data, error: buildError } = buildPartialUpdate(body);
    if (buildError) {
      res.status(400).json({ error: buildError });
      return;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({
        error:
          "No updatable fields provided. Provide at least one of: feeName, amount, isFixed, isActive.",
      });
      return;
    }

    // ── Cross-field isFixed + amount validation against merged state ──
    const mergedIsFixed =
      body.isFixed !== undefined ? (body.isFixed as boolean) : existing.isFixed;
    const mergedAmount =
      body.amount !== undefined
        ? body.amount === null
          ? null
          : (body.amount as number)
        : existing.amount;

    const amountError = validateFeeCategoryAmount(mergedIsFixed, mergedAmount);
    if (amountError) {
      res.status(400).json({ error: amountError });
      return;
    }

    // ── Update ──
    const updated = await prisma.feeCategory.update({
      where: { id: body.id as string },
      data,
      select: FEE_CATEGORY_SELECT,
    });

    res.status(200).json({
      message: "Fee category updated successfully.",
      feeCategory: formatFeeCategory(updated as FeeCategoryRecord),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/feecategory/delete/:id
 */
export async function deleteFeeCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    // ── Validate id ──
    if (!isValidUuid(id)) {
      res.status(400).json({ error: "id must be a valid UUID." });
      return;
    }

    // ── Verify fee category exists ──
    const existing = await prisma.feeCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      res.status(404).json({ error: "Fee category not found." });
      return;
    }

    // ── Dependency check ──
    const hasDependencies = await checkFeeCategoryDependencies(id);
    if (hasDependencies) {
      res.status(409).json({
        error:
          "Cannot delete fee category: it is linked to existing invoices or application fees.",
      });
      return;
    }

    // ── Delete ──
    await prisma.feeCategory.delete({ where: { id } });

    res.status(200).json({ message: "Fee category deleted successfully." });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feecategory/getall
 */
export async function getAllFeeCategories(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await prisma.feeCategory.findMany({
      select: FEE_CATEGORY_SELECT,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      feeCategories: (categories as FeeCategoryRecord[]).map(formatFeeCategory),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feecategory/:institutionId
 */
export async function getFeeCategoriesByInstitution(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { institutionId } = req.params;

    // ── Validate institutionId ──
    if (!isValidUuid(institutionId)) {
      res.status(400).json({ error: "institutionId must be a valid UUID." });
      return;
    }

    // ── Verify institution exists ──
    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });
    if (!institution) {
      res.status(404).json({ error: "Institution not found." });
      return;
    }

    const categories = await prisma.feeCategory.findMany({
      where: { institutionId },
      select: FEE_CATEGORY_SELECT,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      feeCategories: (categories as FeeCategoryRecord[]).map(formatFeeCategory),
    });
  } catch (error) {
    next(error);
  }
}
