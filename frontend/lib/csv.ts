import { payoutRowSchema } from "./schemas";

export type ParsedRow = {
  rowNumber: number;
  processorRef: string;
  amountCents: string;
  error: string | null;
};

// Mirrors the backend's tolerant parsing in ReconciliationUploadService.java
// (skip an optional header, split on the first comma) so the preview shown
// here matches what the server will actually do with the same file.
export function parsePayoutCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: ParsedRow[] = [];
  let rowNumber = 0;

  for (const [i, line] of lines.entries()) {
    if (i === 0 && line.toLowerCase().startsWith("processor_ref")) continue;

    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) {
      rows.push({ rowNumber, processorRef: line, amountCents: "", error: "Expected 'processor_ref,amount_cents'" });
      rowNumber++;
      continue;
    }

    const processor_ref = line.slice(0, commaIndex).trim();
    const amount_cents = line.slice(commaIndex + 1).trim();
    const result = payoutRowSchema.safeParse({ processor_ref, amount_cents });

    rows.push({
      rowNumber,
      processorRef: processor_ref,
      amountCents: amount_cents,
      error: result.success ? null : result.error.issues[0]?.message ?? "Invalid row",
    });
    rowNumber++;
  }

  return rows;
}

export function buildSampleCsv(): string {
  const rows = [
    ["po_sample_a1b2c3", "5000"],
    ["po_sample_b2c3d4", "12599"],
    ["po_sample_c3d4e5", "899"],
  ];
  return ["processor_ref,amount_cents", ...rows.map((r) => r.join(","))].join("\n");
}
