import type { QueryKey, UseMutationOptions } from "@tanstack/react-query";
export * from "./base.js";
export * from "./infinite.js";
export * from "./offline.js";
export * from "./optimistic.js";
export * from "./persistence.js";
export * from "./selectors.js";
export * from "./suspense.js";
export interface MutationContext<TData = unknown, TContext = unknown> { previousData?: TData; userContext?: TContext; conditionMet?: boolean }
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
  };
}
