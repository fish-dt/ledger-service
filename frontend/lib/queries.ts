import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAccounts,
  getReconciliationJobs,
  getReconciliationJob,
  getTransaction,
  postTransaction,
  updateMismatch,
  uploadPayoutFile,
  type PostTransactionBody,
} from "./api";

const POLL_INTERVAL_MS = 5000;

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useReconciliationJobs() {
  return useQuery({
    queryKey: ["reconciliation-jobs"],
    queryFn: getReconciliationJobs,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useReconciliationJob(id: number) {
  return useQuery({
    queryKey: ["reconciliation-job", id],
    queryFn: () => getReconciliationJob(id),
    // Only poll while the job could still change -- once it's DONE/FAILED,
    // or once mismatches have been resolved, there's nothing left to
    // arrive, so keep polling until the first successful read confirms
    // that, then let the per-mutation invalidation (below) carry updates.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "PROCESSING" ? 2000 : false;
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(id),
    enabled: Boolean(id),
  });
}

export function usePostTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PostTransactionBody) => postTransaction(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUpdateMismatch(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolved }: { id: number; resolved: boolean }) =>
      updateMismatch(id, resolved),
    // Optimistic update: the triage page should feel instant when you
    // resolve/ignore a row, not wait a round trip. Rolled back on error.
    onMutate: async ({ id, resolved }) => {
      await queryClient.cancelQueries({ queryKey: ["reconciliation-job", jobId] });
      const previous = queryClient.getQueryData(["reconciliation-job", jobId]);
      queryClient.setQueryData(["reconciliation-job", jobId], (old: any) =>
        old
          ? {
              ...old,
              mismatches: old.mismatches.map((m: any) =>
                m.id === id ? { ...m, resolved } : m
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["reconciliation-job", jobId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-jobs"] });
    },
  });
}

export function useUploadPayoutFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadPayoutFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
