import type { DefaultError, QueryKey, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { isDev } from "../core/env.js";

export interface EnhancedQueryOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> extends UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  /** Log errors to console in development */
  logErrors?: boolean;
  /** Callback when query takes longer than threshold */
  onSlowQuery?: (duration: number, queryKey: TQueryKey) => void;
  /** Threshold in ms to trigger onSlowQuery (default: 3000) */
  slowQueryThreshold?: number;
  /** Enable performance tracking */
  trackPerformance?: boolean;
}

export type EnhancedQueryResult<TData = unknown, TError = DefaultError> = UseQueryResult<TData, TError> & {
  /** Number of times the query has been refetched */
  refetchCount: number;
  /** Last query duration in ms */
  lastQueryDuration: number | null;
};

export function useEnhancedQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: EnhancedQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): EnhancedQueryResult<TData, TError> {
  const {
    logErrors = isDev,
    onSlowQuery,
    slowQueryThreshold = 3000,
    trackPerformance = false,
    ...queryOptions
  } = options;

  const startTimeRef = useRef<number>(0);
  const refetchCountRef = useRef(0);
  const lastDurationRef = useRef<number | null>(null);
  const wasFetchingRef = useRef(false);

  const result = useQuery(queryOptions);

  // Performance tracking
  useEffect(() => {
    if (trackPerformance || onSlowQuery) {
      if (result.isFetching && !wasFetchingRef.current) {
        startTimeRef.current = Date.now();
      } else if (!result.isFetching && wasFetchingRef.current && startTimeRef.current > 0) {
        const duration = Date.now() - startTimeRef.current;
        lastDurationRef.current = duration;
        if (onSlowQuery && duration > slowQueryThreshold) {
          onSlowQuery(duration, queryOptions.queryKey as TQueryKey);
        }
        startTimeRef.current = 0;
      }
      wasFetchingRef.current = result.isFetching;
    }
  }, [result.isFetching, onSlowQuery, slowQueryThreshold, trackPerformance, queryOptions.queryKey]);

  // Error logging
  useEffect(() => {
    if (logErrors && result.isError && result.error) {
      console.error(`[useEnhancedQuery Error] ${JSON.stringify(queryOptions.queryKey)}:`, result.error);
    }
  }, [result.isError, result.error, logErrors, queryOptions.queryKey]);

  // Refetch counting
  useEffect(() => {
    if (result.isRefetching) {
      refetchCountRef.current++;
    }
  }, [result.isRefetching]);

  return {
    ...result,
    refetchCount: refetchCountRef.current,
    lastQueryDuration: lastDurationRef.current
  };
}

export { skipToken };
