import { z } from "zod";
import { parseDollarsToCents } from "./money";

export const entryLineSchema = z.object({
  accountId: z.number({ invalid_type_error: "Pick an account" }),
  amount: z
    .string()
    .min(1, "Required")
    .refine((v) => parseDollarsToCents(v) !== null, "Enter an amount like 10.00 or -10.00"),
});

export const postTransactionFormSchema = z.object({
  idempotencyKey: z.string().min(1, "Required"),
  description: z.string().optional(),
  entries: z.array(entryLineSchema).min(2, "A transaction needs at least two entry lines"),
});

export type PostTransactionFormValues = z.infer<typeof postTransactionFormSchema>;

// CSV row validation for the upload preview on /reconciliation.
export const payoutRowSchema = z.object({
  processor_ref: z.string().min(1, "Missing reference"),
  amount_cents: z
    .string()
    .regex(/^-?\d+$/, "Must be a whole number of cents"),
});
