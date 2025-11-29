import type { QueryKey, UseMutationOptions } from "@tanstack/react-query";
export * from "./base.js";
export * from "./infinite.js";
export * from "./offline.js";
export * from "./optimistic.js";
export * from "./persistence.js";
export * from "./selectors.js";
export * from "./suspense.js";
export interface MutationContext<TData = unknown, TContext = unknown> { previousData?: TData; userContext?: TContext; conditionMet?: boolean; familyRollbackData?: Array<{ queryKey: QueryKey; previousData: unknown }>; }
export interface MutationOptions<TData, TError, TVariables, TContext = unknown> extends UseMutationOptions<TData, TError, TVariables, TContext> {
  optimistic?: {
    queryKey: QueryKey;
    updater: <TQueryData = unknown>(oldData: TQueryData | undefined, variables: TVariables) => TQueryData | undefined;
    enabled?: boolean;
    fieldMapping?: Record<string, string>;
    rollback?: <TQueryData = unknown>(previousData: TQueryData, error: Error) => void;
    invalidateScope?: "none" | "exact" | "family";
    familyKey?: QueryKey;
    relatedKeys?: QueryKey[];
    invalidates?: QueryKey[];
  };
  consistency?: {
    familySync?: {
      idField?: string;
      listSelector?: (data: unknown) => { items: unknown[]; total?: number } | null;
      writeBack?: (old: unknown, items: unknown[], total?: number) => unknown;
      maxKeys?: number;
      enableForOperations?: Array<"update" | "delete">;
    };
    /**
     * Consistency strategy:
     * - "sync+invalidate": Update cache locally AND invalidate queries (default).
     * - "sync-only": Update cache locally only (use when server is eventually consistent and you trust the client).
     * - "invalidate-only": Do not update cache locally, just invalidate.
     * - "auto": "sync-only" for updates, "sync+invalidate" for deletes.
     */
    mode?: "sync+invalidate" | "invalidate-only" | "sync-only" | "auto";
    /**
     * Default operation type if not provided in variables.
     * Useful for useMutation where variables might not contain operation info.
     */
    defaultOperation?: "create" | "update" | "delete";
    /**
     * Delay in milliseconds before invalidating queries.
     * Useful for eventually consistent backends (e.g. ElasticSearch).
     * Default: 0
     */
    invalidationDelay?: number;
  };
}
