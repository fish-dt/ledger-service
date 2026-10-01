"use client";

import { useRef } from "react";
import { IconSearch, IconUpload } from "./icons";

export function TopBar({
  onUpload,
  uploading,
  uploadError,
  searchTerm,
  onSearchChange,
}: {
  onUpload: (file: File) => void;
  uploading: boolean;
  uploadError: string | null;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="border-b border-hairline px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-normal text-ink">Reconciliation</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Processor payouts matched against the internal ledger
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by reference"
              className="w-56 rounded border border-hairline bg-panel py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = ""; // allow re-uploading the same filename
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded bg-brand px-3.5 py-2 text-sm font-medium text-base transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconUpload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload payout file"}
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="mt-2 text-sm text-brand">{uploadError}</p>
      )}
    </header>
  );
}
