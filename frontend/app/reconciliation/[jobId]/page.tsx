"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useReconciliationJob, useUpdateMismatch } from "@/lib/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobStatusBadge, ResolvedBadge } from "@/components/ui/StatusBadge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconArrowLeft, IconCheck, IconX } from "@/components/icons";
import { formatCents, formatRelativeTime } from "@/lib/format";
import type { MismatchFlag, MismatchType } from "@/lib/api";

const typeCopy: Record<MismatchType, string> = {
  AMOUNT_MISMATCH: "Amount disagrees",
  MISSING_INTERNAL: "Not in our ledger",
  MISSING_PROCESSOR: "Not in payout file",
  DUPLICATE: "Duplicate reference",
};

const columnHelper = createColumnHelper<MismatchFlag>();

export default function MismatchTriagePage({ params }: { params: { jobId: string } }) {
  const jobId = Number(params.jobId);
  const jobQuery = useReconciliationJob(jobId);
  const updateMismatch = useUpdateMismatch(jobId);

  // Filters live in the URL -- shareable, back-button safe, exactly what
  // the brief asks for (nuqs instead of component state).
  const [typeFilter, setTypeFilter] = useQueryState("type", { defaultValue: "ALL" });
  const [statusFilter, setStatusFilter] = useQueryState("status", { defaultValue: "open" });

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const allMismatches = useMemo(() => jobQuery.data?.mismatches ?? [], [jobQuery.data]);
  const filtered = useMemo(() => {
    return allMismatches.filter((m) => {
      if (typeFilter !== "ALL" && m.mismatchType !== typeFilter) return false;
      if (statusFilter === "open" && m.resolved) return false;
      if (statusFilter === "resolved" && !m.resolved) return false;
      return true;
    });
  }, [allMismatches, typeFilter, statusFilter]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all rows"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select row ${row.original.processorRef}`}
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      columnHelper.accessor("processorRef", {
        header: "Reference",
        cell: (info) => <span className="font-mono text-xs">{info.getValue()}</span>,
      }),
      columnHelper.accessor("mismatchType", {
        header: "Type",
        cell: (info) => typeCopy[info.getValue()],
      }),
      columnHelper.display({
        id: "diff",
        header: "Internal vs. processor",
        cell: ({ row }) => {
          const m = row.original;
          const differs =
            m.internalAmountCents !== null &&
            m.processorAmountCents !== null &&
            m.internalAmountCents !== m.processorAmountCents;
          return (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={differs ? "text-brand" : "text-ink"}>
                {m.internalAmountCents !== null ? formatCents(m.internalAmountCents) : "—"}
              </span>
              <span className="text-ink-faint">vs</span>
              <span className={differs ? "text-brand" : "text-ink"}>
                {m.processorAmountCents !== null ? formatCents(m.processorAmountCents) : "—"}
              </span>
            </div>
          );
        },
      }),
      columnHelper.accessor("resolved", {
        header: "Status",
        cell: (info) => <ResolvedBadge resolved={info.getValue()} />,
      }),
      columnHelper.accessor("createdAt", {
        header: "Found",
        cell: (info) => formatRelativeTime(info.getValue()),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() =>
              updateMismatch.mutate({ id: row.original.id, resolved: !row.original.resolved })
            }
            className="rounded border border-hairline px-2 py-1 text-xs text-ink-muted hover:bg-panel-raised hover:text-ink"
          >
            {row.original.resolved ? "Reopen" : "Resolve"}
          </button>
        ),
      }),
    ],
    [updateMismatch]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.id);

  async function bulkUpdate(resolved: boolean) {
    await Promise.all(selectedIds.map((id) => updateMismatch.mutateAsync({ id, resolved })));
    toast.success(`${selectedIds.length} mismatch${selectedIds.length === 1 ? "" : "es"} ${resolved ? "resolved" : "reopened"}`);
    setRowSelection({});
  }

  return (
    <>
      <PageHeader title={`Job #${jobId}`}>
        <Link href="/reconciliation" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <IconArrowLeft className="h-4 w-4" />
          All jobs
        </Link>
      </PageHeader>

      <div className="p-6">
        {jobQuery.isLoading && (
          <div className="rounded border border-hairline bg-panel">
            <TableSkeleton rows={4} />
          </div>
        )}

        {jobQuery.error && (
          <div className="rounded border border-brand-dim bg-brand-dim/20 px-4 py-3 text-sm text-brand">
            {(jobQuery.error as Error).message}
          </div>
        )}

        {jobQuery.data && (
          <>
            <div className="mb-4 flex items-center gap-4 rounded border border-hairline bg-panel px-5 py-3">
              <JobStatusBadge status={jobQuery.data.status} />
              <span className="text-sm text-ink-muted">{jobQuery.data.sourceFile}</span>
              <span className="text-sm text-ink-faint">· {jobQuery.data.rowCount} rows</span>
              <span className="text-sm text-ink-faint">
                · {allMismatches.length} mismatch{allMismatches.length === 1 ? "" : "es"}
              </span>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by mismatch type"
                className="rounded border border-hairline bg-panel px-3 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
              >
                <option value="ALL">All types</option>
                {Object.entries(typeCopy).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="rounded border border-hairline bg-panel px-3 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
              >
                <option value="open">Open only</option>
                <option value="resolved">Resolved only</option>
                <option value="all">All statuses</option>
              </select>

              {selectedIds.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-ink-muted">{selectedIds.length} selected</span>
                  <button
                    onClick={() => bulkUpdate(true)}
                    className="flex items-center gap-1 rounded border border-ok-dim px-2.5 py-1.5 text-xs text-ok hover:bg-ok-dim/30"
                  >
                    <IconCheck className="h-3 w-3" /> Resolve selected
                  </button>
                  <button
                    onClick={() => bulkUpdate(false)}
                    className="flex items-center gap-1 rounded border border-hairline px-2.5 py-1.5 text-xs text-ink-muted hover:bg-panel-raised"
                  >
                    <IconX className="h-3 w-3" /> Reopen selected
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded border border-hairline bg-panel">
              {filtered.length === 0 ? (
                <EmptyState
                  title="No mismatches match these filters"
                  description="Try a different type or status filter."
                />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b border-hairline text-left text-ink-muted">
                        {hg.headers.map((header) => (
                          <th key={header.id} className="px-4 py-2.5 font-normal">
                            {header.column.getCanSort() ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="flex items-center gap-1 hover:text-ink"
                                aria-label={`Sort by ${String(flexRender(header.column.columnDef.header, header.getContext()))}`}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {{ asc: "↑", desc: "↓" }[header.column.getIsSorted() as string] ?? ""}
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-2.5 text-ink">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
