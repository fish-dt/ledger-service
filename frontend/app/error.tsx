"use client";

import { useEffect } from "react";
import { IconAlert } from "@/components/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <IconAlert className="h-8 w-8 text-brand" />
      <p className="text-sm font-medium text-ink">Something went wrong rendering this page.</p>
      <p className="max-w-sm text-sm text-ink-muted">{error.message}</p>
      <button
        onClick={reset}
        className="mt-2 rounded border border-hairline px-3 py-1.5 text-sm text-ink hover:bg-panel-raised"
      >
        Try again
      </button>
    </div>
  );
}
