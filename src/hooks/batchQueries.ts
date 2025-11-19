import type { QueryClient, UseQueryOptions, UseQueryResult, UseSuspenseQueryOptions, UseSuspenseQueryResult, DefaultError } from "@tanstack/react-query";
import type { BatchErrorAggregate, BatchOperationReport, BatchQueryConfig, BatchQueryOperations, BatchQueryStats, BatchRetryConfig } from "../types/optimistic";
import { useQueries, useQuery, useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

interface InternalBatchQueryOperations extends BatchQueryOperations { _queryClient: QueryClient; _queries: UseQueryOptions[]; _results: UseQueryResult[] | UseSuspenseQueryResult[] }

function createErrorAggregate<TError = Error>(results: UseQueryResult[] | UseSuspenseQueryResult[], queries: UseQueryOptions[]): BatchErrorAggregate<TError> {
  const errors: Array<{ index: number; error: TError; queryKey?: unknown[] }> = [];
  const errorsByType = new Map<string, TError[]>();
  results.forEach((result, index) => {
    if (result.isError && result.error) {
      const error = result.error as TError;
      const queryKey = queries[index]?.queryKey as unknown[];
      errors.push({ index, error, queryKey });
      const errorType = error instanceof Error ? error.constructor.name : "Unknown";
      if (!errorsByType.has(errorType)) { errorsByType.set(errorType, []); }
      errorsByType.get(errorType)!.push(error);
    }
  });
  const firstError = errors.length > 0 ? errors[0].error : null;
  const lastError = errors.length > 0 ? errors[errors.length - 1].error : null;
  const errorSummary = errors.length === 0 ? "No errors" : errors.length === 1 ? `1 error: ${firstError instanceof Error ? firstError.message : String(firstError)}` : `${errors.length} errors: ${Array.from(errorsByType.entries()).map(([type, errs]) => `${type}(${errs.length})`).join(", ")}`;
  return { totalErrors: errors.length, errors, errorsByType, firstError, lastError, errorSummary };
}

function createOperationReport<TData = unknown, TError = Error>(results: UseQueryResult[] | UseSuspenseQueryResult[], queries: UseQueryOptions[], startTime: number, retryCount = 0): BatchOperationReport<TData, TError> {
  const total = results.length;
  const successResults: Array<{ index: number; data: TData }> = [];
  const failureErrors: Array<{ index: number; error: TError; queryKey?: unknown[] }> = [];
  results.forEach((result, index) => {
    if (result.isSuccess && result.data !== undefined) {
      successResults.push({ index, data: result.data as TData });
    } else if (result.isError && result.error) {
      failureErrors.push({ index, error: result.error as TError, queryKey: queries[index]?.queryKey as unknown[] });
    }
  });
  const successful = successResults.length;
  const failed = failureErrors.length;
  const isFullSuccess = successful === total && failed === 0;
  const isFullFailure = failed === total && successful === 0;
  const isPartialSuccess = successful > 0 && failed > 0;
  return { total, successful, failed, successResults, failureErrors, isPartialSuccess, isFullSuccess, isFullFailure, duration: Date.now() - startTime, retryCount };
}

async function executeBatchOperationWithRetry<T = unknown>(operation: () => Promise<PromiseSettledResult<T>[]>, retryConfig?: BatchRetryConfig): Promise<{ results: PromiseSettledResult<T>[]; retryCount: number }> {
  const maxRetries = retryConfig?.maxRetries ?? 0;
  const retryDelay = retryConfig?.retryDelay ?? 1000;
  const shouldRetry = retryConfig?.shouldRetry;
  let retryCount = 0;
  let results = await operation();
  if (maxRetries === 0) { return { results, retryCount }; }
  while (retryCount < maxRetries) {
    const hasFailures = results.some((r) => r.status === "rejected");
    if (!hasFailures) break;
    if (shouldRetry) {
      const firstError = results.find((r) => r.status === "rejected");
      if (firstError && firstError.status === "rejected") {
        const error = firstError.reason instanceof Error ? firstError.reason : new Error(String(firstError.reason));
        if (!shouldRetry(error, retryCount + 1)) { break; }
      }
    }
    const delay = typeof retryDelay === "function" ? retryDelay(retryCount) : retryDelay;
    await new Promise((resolve) => setTimeout(resolve, delay));
    retryCount++;
    results = await operation();
  }
  return { results, retryCount };
}

export function calculateBatchStats(results: UseQueryResult[] | UseSuspenseQueryResult[]): BatchQueryStats {
  const total = results.length;
  const loading = results.filter((result) => result.isLoading).length;
  const success = results.filter((result) => result.isSuccess).length;
  const error = results.filter((result) => result.isError).length;
  const stale = results.filter((result) => result.isStale).length;
  return { total, loading, success, error, stale, successRate: total > 0 ? (success / total) * 100 : 0, errorRate: total > 0 ? (error / total) * 100 : 0 };
}

export function useEnhancedQueries(queries: UseQueryOptions[], config: BatchQueryConfig = {}) {
  const queryClient = useQueryClient();
  const { results, stats } = useQueries({ queries, combine: (results) => ({ results, stats: calculateBatchStats(results) }) });
  const retryCountRef = useRef<number>(0);
  const operations: InternalBatchQueryOperations = {
    _queryClient: queryClient,
    _queries: queries,
    _results: results,
    refetchAll: async () => {
      const operation = () => {
        const promises = queries.map((query) => queryClient.refetchQueries({ queryKey: query.queryKey, exact: true }));
        return Promise.allSettled(promises);
      };
      const { results: settledResults, retryCount } = await executeBatchOperationWithRetry(operation, config.retryConfig);
      retryCountRef.current = retryCount;
      if (config.enablePartialSuccess) {
        const report = operations.getOperationReport();
        if (report.isPartialSuccess && config.onPartialSuccess) { config.onPartialSuccess(report); }
      }
      return settledResults;
    },
    invalidateAll: async () => {
      const operation = () => {
        const promises = queries.map((query) => queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true }));
        return Promise.allSettled(promises);
      };
      const { results: settledResults, retryCount } = await executeBatchOperationWithRetry(operation, config.retryConfig);
      retryCountRef.current = retryCount;
      return settledResults;
    },
    cancelAll: async () => {
      const promises = queries.map((query) => queryClient.cancelQueries({ queryKey: query.queryKey, exact: true }));
      return Promise.allSettled(promises);
    },
    resetAll: async () => {
      const operation = () => {
        const promises = queries.map((query) => queryClient.resetQueries({ queryKey: query.queryKey, exact: true }));
        return Promise.allSettled(promises);
      };
      const { results: settledResults, retryCount } = await executeBatchOperationWithRetry(operation, config.retryConfig);
      retryCountRef.current = retryCount;
      return settledResults;
    },
    removeAll: () => {
      queries.forEach((query) => { queryClient.removeQueries({ queryKey: query.queryKey, exact: true }); });
    },
    retryFailed: async () => {
      const failedIndices = results.map((result, index) => (result.isError ? index : -1)).filter((index) => index !== -1);
      if (failedIndices.length === 0) { return createOperationReport(results, queries, 0, 0); }
      const retryPromises = failedIndices.map((index) => {
        const query = queries[index];
        return queryClient.refetchQueries({ queryKey: query.queryKey, exact: true });
      });
      await Promise.allSettled(retryPromises);
      retryCountRef.current++;
      return operations.getOperationReport();
    },
    getErrorAggregate: () => { return createErrorAggregate(results, queries); },
    getOperationReport: () => { return createOperationReport(results, queries, 0, retryCountRef.current); }
  };
  return { data: results, stats, operations, config };
}

export function useEnhancedSuspenseQueries(queries: UseSuspenseQueryOptions[], config: BatchQueryConfig = {}) {
  const queryClient = useQueryClient();
  const { results, stats } = useSuspenseQueries({ queries, combine: (results) => ({ results, stats: calculateBatchStats(results) }) });
  const retryCountRef = useRef<number>(0);
  const operations: InternalBatchQueryOperations = {
    _queryClient: queryClient,
    _queries: queries,
    _results: results,
    refetchAll: async () => {
      const operation = () => {
        const promises = queries.map((query) => queryClient.refetchQueries({ queryKey: query.queryKey, exact: true }));
        return Promise.allSettled(promises);
      };
      const { results: settledResults, retryCount } = await executeBatchOperationWithRetry(operation, config.retryConfig);
      retryCountRef.current = retryCount;
      if (config.enablePartialSuccess) {
        const report = operations.getOperationReport();
        if (report.isPartialSuccess && config.onPartialSuccess) { config.onPartialSuccess(report); }
      }
      return settledResults;
    },
    invalidateAll: async () => {
      const operation = () => {
        const promises = queries.map((query) => queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true }));
        return Promise.allSettled(promises);
      };
      const { results: settledResults, retryCount } = await executeBatchOperationWithRetry(operation, config.retryConfig);
      retryCountRef.current = retryCount;
      return settledResults;
    },
    cancelAll: async () => {
      const promises = queries.map((query) => queryClient.cancelQueries({ queryKey: query.queryKey, exact: true }));
      return Promise.allSettled(promises);
    },
    resetAll: async () => {
      const operation = () => {
        const promises = queries.map((query) => queryClient.resetQueries({ queryKey: query.queryKey, exact: true }));
        return Promise.allSettled(promises);
      };
      const { results: settledResults, retryCount } = await executeBatchOperationWithRetry(operation, config.retryConfig);
      retryCountRef.current = retryCount;
      return settledResults;
    },
    removeAll: () => {
      queries.forEach((query) => { queryClient.removeQueries({ queryKey: query.queryKey, exact: true }); });
    },
    retryFailed: async () => {
      const failedIndices = results.map((result, index) => (result.isError ? index : -1)).filter((index) => index !== -1);
      if (failedIndices.length === 0) { return createOperationReport(results, queries, 0, 0); }
      const retryPromises = failedIndices.map((index) => {
        const query = queries[index];
        return queryClient.refetchQueries({ queryKey: query.queryKey, exact: true });
      });
      await Promise.allSettled(retryPromises);
      retryCountRef.current++;
      return operations.getOperationReport();
    },
    getErrorAggregate: () => { return createErrorAggregate(results, queries); },
    getOperationReport: () => { return createOperationReport(results, queries, 0, retryCountRef.current); }
  };
  return { data: results, stats, operations, config };
}

export function createBatchQueryConfig(config: Partial<BatchQueryConfig> = {}): BatchQueryConfig {
  return { enableStats: true, enableBatchOperations: true, autoRefreshInterval: undefined, onBatchSuccess: undefined, onBatchError: undefined, onBatchSettled: undefined, enablePartialSuccess: false, onPartialSuccess: undefined, retryConfig: undefined, ...config };
}

export const batchQueryUtils = {
  isAllLoading: (results: UseQueryResult[] | UseSuspenseQueryResult[]): boolean => results.every((result) => result.isLoading),
  isAllSuccess: (results: UseQueryResult[] | UseSuspenseQueryResult[]): boolean => results.every((result) => result.isSuccess),
  hasError: (results: UseQueryResult[] | UseSuspenseQueryResult[]): boolean => results.some((result) => result.isError),
  hasStale: (results: UseQueryResult[] | UseSuspenseQueryResult[]): boolean => results.some((result) => result.isStale),
  getAllErrors: (results: UseQueryResult[] | UseSuspenseQueryResult[]): Error[] => results.filter((result) => result.isError).map((result) => result.error).filter((error): error is Error => error instanceof Error),
  getAllData: (results: UseQueryResult[] | UseSuspenseQueryResult[]): unknown[] => results.filter((result) => result.isSuccess).map((result) => result.data),
  isAllPending: (results: UseQueryResult[] | UseSuspenseQueryResult[]): boolean => results.every((result) => result.isPending),
  isAnyFetching: (results: UseQueryResult[] | UseSuspenseQueryResult[]): boolean => results.some((result) => result.isFetching),
  getSuccessData: <T>(results: UseQueryResult<T>[]): T[] => results.filter((result) => result.isSuccess && result.data !== undefined).map((result) => result.data as T),
  getFirstError: (results: UseQueryResult[] | UseSuspenseQueryResult[]): Error | null => { const errorResult = results.find((result) => result.isError); return errorResult?.error instanceof Error ? errorResult.error : null; },
  createErrorAggregate: <TError = Error>(results: UseQueryResult[] | UseSuspenseQueryResult[], queries: UseQueryOptions[]): BatchErrorAggregate<TError> => createErrorAggregate<TError>(results, queries),
  createOperationReport: <TData = unknown, TError = Error>(results: UseQueryResult[] | UseSuspenseQueryResult[], queries: UseQueryOptions[], startTime: number, retryCount = 0): BatchOperationReport<TData, TError> => createOperationReport<TData, TError>(results, queries, startTime, retryCount)
};

export function useCombinedQueries<TCombinedResult = UseQueryResult[]>(options: { queries: UseQueryOptions[]; combine?: (results: UseQueryResult[]) => TCombinedResult }): TCombinedResult {
  return useQueries(options) as TCombinedResult;
}

export function useDynamicBatchQueries<TItem, TData = unknown>(options: { items: TItem[]; queryKeyPrefix: unknown[]; queryFn: (item: TItem) => Promise<TData>; enabled?: boolean; staleTime?: number; gcTime?: number; config?: BatchQueryConfig }) {
  const { items, queryKeyPrefix, queryFn, enabled = true, staleTime, gcTime, config = {} } = options;
  const queries = useMemo(() => {
    if (!enabled || items.length === 0) return [] as UseQueryOptions[];
    return items.map((item) => ({ queryKey: [...queryKeyPrefix, item], queryFn: () => queryFn(item), staleTime, gcTime, enabled }));
  }, [items, queryKeyPrefix, queryFn, enabled, staleTime, gcTime]);
  return useEnhancedQueries(queries, config);
}

export function useDependentBatchQueries<TPrimaryData>(options: { primaryQuery: UseQueryOptions<TPrimaryData>; dependentQueries: (data: TPrimaryData) => UseQueryOptions[]; config?: BatchQueryConfig }): DependentBatchQueriesResult<TPrimaryData> {
  const { primaryQuery, dependentQueries, config = {} } = options;
  const primaryResult = useQuery(primaryQuery);
  const queries = useMemo(() => {
    try {
      if (!primaryResult.data) { return []; }
      return dependentQueries(primaryResult.data);
    } catch {
      return [];
    }
  }, [primaryResult.data, dependentQueries]);
  const enhancedQueriesResult = useEnhancedQueries(queries, config);
  return { primaryResult: primaryResult as UseQueryResult<TPrimaryData, DefaultError>, results: enhancedQueriesResult.data as UseQueryResult[], stats: enhancedQueriesResult.stats, operations: enhancedQueriesResult.operations };
}

export interface DependentBatchQueriesResult<TPrimaryData> {
  primaryResult: UseQueryResult<TPrimaryData, DefaultError>;
  results: UseQueryResult[];
  stats: BatchQueryStats;
  operations: InternalBatchQueryOperations;
}

 

export function useAutoRefreshBatchQueries(options: { queries: UseQueryOptions[]; refreshInterval?: number; enabled?: boolean; config?: BatchQueryConfig }) {
  const { queries, refreshInterval = 30000, enabled = true, config = {} } = options;
  const result = useEnhancedQueries(queries, config);
  useEffect(() => {
    if (!enabled || !refreshInterval || !result.operations) return;
    const intervalId = setInterval(() => { result.operations?.refetchAll(); }, refreshInterval);
    return () => clearInterval(intervalId);
  }, [enabled, refreshInterval, result.operations]);
  return result;
}

export function useDashboardQueries<T extends Record<string, UseQueryOptions>>(queriesMap: T) {
  const queries = useMemo(() => { return Object.values(queriesMap); }, [queriesMap]);
  type CombinedDataType = { [K in keyof T]: T[K] extends UseQueryOptions<infer TData> ? TData : unknown };
  const { results, combinedData, stats } = useQueries({ queries, combine: (results) => {
    const keys = Object.keys(queriesMap) as Array<keyof T>;
    const data = {} as Record<keyof T, unknown>;
    keys.forEach((key, index) => { data[key] = results[index].data; });
    return { results, combinedData: data as CombinedDataType, stats: calculateBatchStats(results) };
  } });
  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const isSuccess = results.every((r) => r.isSuccess);
  return { data: combinedData, results, stats, isLoading, isError, isSuccess };
}

export function usePaginatedBatchQueries<TData = unknown>(options: { pageNumbers: number[]; queryKeyPrefix: unknown[]; queryFn: (page: number) => Promise<TData>; staleTime?: number; config?: BatchQueryConfig }) {
  const { pageNumbers, queryKeyPrefix, queryFn, staleTime, config } = options;
  return useDynamicBatchQueries({ items: pageNumbers, queryKeyPrefix, queryFn, staleTime, config });
}

export function useConditionalBatchQueries(queries: (UseQueryOptions & { enabled?: boolean })[]) {
  const enabledQueries = useMemo(() => { return queries.filter((q) => q.enabled !== false); }, [queries]);
  return useEnhancedQueries(enabledQueries);
}

export function useRetryBatchQueries(options: { queries: UseQueryOptions[]; retry?: number | ((failureCount: number, error: Error) => boolean); retryDelay?: number | ((attemptIndex: number) => number); config?: BatchQueryConfig }) {
  const { queries, retry, retryDelay, config } = options;
  const queriesWithRetry = useMemo(() => { return queries.map((query) => ({ ...query, retry: query.retry ?? retry, retryDelay: query.retryDelay ?? retryDelay })); }, [queries, retry, retryDelay]);
  return useEnhancedQueries(queriesWithRetry, config);
}

export function useBatchQueryPerformance(results: UseQueryResult[] | UseSuspenseQueryResult[]) {
  return useMemo(() => {
    const stats = calculateBatchStats(results);
    const fetchTimes = results.filter((r) => r.dataUpdatedAt > 0).map((r) => r.dataUpdatedAt);
    const avgFetchTime = fetchTimes.length > 0 ? fetchTimes.reduce((a, b) => a + b, 0) / fetchTimes.length : 0;
    return { ...stats, avgFetchTime, totalQueries: results.length, activeQueries: results.filter((r) => r.isFetching).length, cachedQueries: results.filter((r) => !r.isStale).length };
  }, [results]);
}