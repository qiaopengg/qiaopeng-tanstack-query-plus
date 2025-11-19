import type { DefaultError, QueryFunction, QueryKey, UseQueryOptions } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { DEFAULT_GC_TIME, DEFAULT_STALE_TIME, defaultQueryRetryStrategy, exponentialBackoff } from "./config.js";

export interface BaseQueryConfig<TData> {
  queryKey: QueryKey;
  queryFn: QueryFunction<TData, QueryKey>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
}

export function createAppQueryOptions<TData>(config: BaseQueryConfig<TData>): UseQueryOptions<TData, DefaultError, TData, QueryKey> {
  return queryOptions<TData, DefaultError, TData, QueryKey>({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    staleTime: config.staleTime ?? DEFAULT_STALE_TIME,
    gcTime: config.gcTime ?? DEFAULT_GC_TIME,
    enabled: config.enabled,
    retry: defaultQueryRetryStrategy,
    retryDelay: exponentialBackoff,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true
  });
}

export interface SelectQueryConfig<TData, TSelected = TData> extends Omit<BaseQueryConfig<TData>, "enabled"> {
  select: (data: TData) => TSelected;
}

export function createAppQueryOptionsWithSelect<TData, TSelected = TData>(config: SelectQueryConfig<TData, TSelected>): UseQueryOptions<TData, DefaultError, TSelected, QueryKey> {
  return queryOptions<TData, DefaultError, TSelected, QueryKey>({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    select: config.select,
    staleTime: config.staleTime ?? DEFAULT_STALE_TIME,
    gcTime: config.gcTime ?? DEFAULT_GC_TIME,
    retry: defaultQueryRetryStrategy,
    retryDelay: exponentialBackoff,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true
  });
}