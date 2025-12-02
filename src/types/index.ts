import type { QueryKey, UseMutationOptions } from "@tanstack/react-query";
export * from "./base.js";
export * from "./dataGuard.js";
export * from "./infinite.js";
export * from "./offline.js";
export * from "./optimistic.js";
export * from "./persistence.js";
export * from "./selectors.js";
export * from "./suspense.js";
export interface MutationContext<TData = unknown, TContext = unknown> { 
  /** Snapshots of all query variants (from getQueriesData) */
  previousData?: Array<[QueryKey, any]>; 
  /** User-provided context from onMutate */
  userContext?: TContext; 
  /** For conditional mutations */
  conditionMet?: boolean; 
}
/**
 * Enhanced mutation options using official TanStack Query approach
 * 
 * Uses setQueriesData to update all cached query variants automatically.
 * This prevents data rollback and flicker when switching between pageSize, filters, etc.
 * 
 * Recommended: Use long staleTime (5+ minutes) in your queries for best results.
 */
export interface MutationOptions<TData, TError, TVariables, TContext = unknown> extends UseMutationOptions<TData, TError, TVariables, TContext> {
  optimistic?: {
    /** Query key to update (will also update all variants in the same family) */
    queryKey: QueryKey;
    /** Function to update the cached data - will be applied to all query variants */
    updater: <TQueryData = unknown>(oldData: TQueryData | undefined, variables: TVariables) => TQueryData | undefined;
    /** Enable/disable optimistic updates */
    enabled?: boolean;
    /** Map mutation variable fields to cache data fields */
    fieldMapping?: Record<string, string>;
    /** Callback when rollback occurs on error */
    rollback?: <TQueryData = unknown>(previousData: TQueryData, error: Error) => void;
    /** 
     * Invalidation scope after success:
     * - "exact": Only invalidate the exact queryKey
     * - "family": Invalidate all queries in the family (default for list queries)
     * - "none": Don't invalidate (rely on optimistic update only)
     */
    invalidateScope?: "none" | "exact" | "family";
    /** Override the derived family key (e.g., ['products', 'list']) */
    familyKey?: QueryKey;
    /** Additional query keys to invalidate */
    relatedKeys?: QueryKey[];
    /** Alias for relatedKeys */
    invalidates?: QueryKey[];
  };
}
