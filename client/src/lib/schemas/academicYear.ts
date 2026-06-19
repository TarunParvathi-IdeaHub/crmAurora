import { z } from "zod";

const ACADEMIC_YEAR_REGEX = /^(\d{4})-(\d{4})$/;

function parseAcademicYear(academicYearName: string) {
  const match = ACADEMIC_YEAR_REGEX.exec(academicYearName);
  if (!match) return null;

  const firstYear = Number(match[1]);
  const secondYear = Number(match[2]);
  if (secondYear !== firstYear + 1) return null;

  return { firstYear, secondYear };
}

function parseDateString(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export const academicYearFormSchema = z
  .object({
    academicYearName: z
      .string()
      .trim()
      .regex(
        ACADEMIC_YEAR_REGEX,
        "Academic Year must follow YYYY-YYYY format and years must be consecutive.",
      ),
    startDate: z.string().min(1, "Start Date is required."),
    endDate: z.string().min(1, "End Date is required."),
    batchIds: z.array(z.string().min(1)).min(1, "Select at least one batch."),
  })
  .superRefine((value, ctx) => {
    const parsedYear = parseAcademicYear(value.academicYearName);
    if (!parsedYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["academicYearName"],
        message: "Academic Year must follow YYYY-YYYY format and years must be consecutive.",
      });
      return;
    }

    const startDate = parseDateString(value.startDate);
    const endDate = parseDateString(value.endDate);

    if (!startDate || !endDate) return;

    if (startDate.getUTCFullYear() !== parsedYear.firstYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Start Date must belong to the first year of Academic Year.",
      });
    }

    if (endDate.getUTCFullYear() !== parsedYear.secondYear) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End Date must belong to the second year of Academic Year.",
      });
    }

    const tenMonthsAhead = new Date(startDate);
    tenMonthsAhead.setUTCMonth(tenMonthsAhead.getUTCMonth() + 10);

    if (endDate < tenMonthsAhead) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Academic Year duration must be at least 10 months.",
      });
    }
  });

export type AcademicYearFormValues = z.infer<typeof academicYearFormSchema>;

export function getYearConstraints(academicYearName: string) {
  const parsed = parseAcademicYear(academicYearName.trim());
  if (!parsed) return null;

  return {
    startMin: `${parsed.firstYear}-01-01`,
    startMax: `${parsed.firstYear}-12-31`,
    endMin: `${parsed.secondYear}-01-01`,
    endMax: `${parsed.secondYear}-12-31`,
  };
}
