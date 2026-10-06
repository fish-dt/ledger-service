"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { parsePayoutCsv, buildSampleCsv, type ParsedRow } from "@/lib/csv";
import { useUploadPayoutFile } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { IconUpload, IconCheck, IconAlert, IconX } from "./icons";

export function UploadPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const uploadMutation = useUploadPayoutFile();

  const errorCount = rows.filter((r) => r.error).length;
  const canUpload = rows.length > 0 && errorCount === 0;

  async function handleFileSelect(file: File) {
    setSelectedFile(file);
    const text = await file.text();
    setRows(parsePayoutCsv(text));
  }

  function handleDownloadSample() {
    const blob = new Blob([buildSampleCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_payout.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleConfirmUpload() {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile, {
      onSuccess: (job) => {
        toast.success(`Reconciliation started — job #${job.id}`);
        setSelectedFile(null);
        setRows([]);
        router.push(`/reconciliation/${job.id}`);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Upload failed");
      },
    });
  }

  function reset() {
    setSelectedFile(null);
    setRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="rounded border border-hairline bg-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-ink">Upload a processor payout file</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            CSV with <code className="rounded bg-panel-raised px-1 py-0.5">processor_ref,amount_cents</code> columns
          </p>
        </div>
        <button
          onClick={handleDownloadSample}
          className="text-xs text-ink-muted underline decoration-hairline underline-offset-2 hover:text-ink"
        >
          Download a sample CSV
        </button>
      </div>

      {!selectedFile ? (
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-hairline py-8 text-sm text-ink-muted hover:border-brand hover:text-ink">
          <IconUpload className="h-5 w-5" />
          Click to choose a CSV file
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </label>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink">
              {selectedFile.name} · {rows.length} row{rows.length === 1 ? "" : "s"}
              {errorCount > 0 && <span className="text-brand"> · {errorCount} invalid</span>}
            </p>
            <button onClick={reset} aria-label="Remove file" className="text-ink-faint hover:text-brand">
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto rounded border border-hairline">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-hairline bg-panel-raised text-left text-ink-muted">
                  <th className="px-3 py-1.5 font-normal">Row</th>
                  <th className="px-3 py-1.5 font-normal">processor_ref</th>
                  <th className="px-3 py-1.5 font-normal">amount_cents</th>
                  <th className="px-3 py-1.5 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="border-b border-hairline last:border-0">
                    <td className="px-3 py-1.5 text-ink-faint">{row.rowNumber}</td>
                    <td className="px-3 py-1.5 text-ink">{row.processorRef}</td>
                    <td className="px-3 py-1.5 text-ink">{row.amountCents}</td>
                    <td className="px-3 py-1.5">
                      {row.error ? (
                        <span className="flex items-center gap-1 text-brand" title={row.error}>
                          <IconAlert className="h-3 w-3" /> {row.error}
                        </span>
                      ) : (
                        <IconCheck className="h-3 w-3 text-ok" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleConfirmUpload}
            disabled={!canUpload || uploadMutation.isPending}
            className="mt-3 rounded bg-brand px-4 py-2 text-sm font-medium text-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadMutation.isPending
              ? "Uploading…"
              : canUpload
                ? `Upload ${rows.length} rows`
                : "Fix the invalid rows above first"}
          </button>
        </div>
      )}
    </div>
  );
}
