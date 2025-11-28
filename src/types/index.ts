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
  consistency?: {
    familySync?: {
      idField?: string;
      listSelector?: (data: unknown) => { items: unknown[]; total?: number } | null;
      writeBack?: (old: unknown, items: unknown[], total?: number) => unknown;
      maxKeys?: number;
      enableForOperations?: Array<"update" | "delete">;
    };
    mode?: "sync+invalidate" | "invalidate-only";
  };
}
