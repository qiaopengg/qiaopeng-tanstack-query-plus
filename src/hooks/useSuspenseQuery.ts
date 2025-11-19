import type { DefaultError, QueryFunction, QueryFunctionContext, QueryKey, UseSuspenseInfiniteQueryOptions, UseSuspenseInfiniteQueryResult, UseSuspenseQueryOptions, UseSuspenseQueryResult } from "@tanstack/react-query";
import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
type InfiniteQueryFunction<TQueryFnData = unknown, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> = (context: QueryFunctionContext<TQueryKey, TPageParam>) => Promise<TQueryFnData>;
export function createSuspenseQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TVariables = void>(
  getQueryKey: (variables: TVariables) => TQueryKey,
  queryFn: QueryFunction<TQueryFnData, TQueryKey>,
  options?: Omit<UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey" | "queryFn">
) {
  return (variables: TVariables): UseSuspenseQueryResult<TData, TError> => {
    const queryKey = getQueryKey(variables);
    return useSuspenseQuery({ queryKey, queryFn, ...options });
  };
}
export function createSuspenseInfiniteQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown, TVariables = void>(
  getQueryKey: (variables: TVariables) => TQueryKey,
  queryFn: InfiniteQueryFunction<TQueryFnData, TQueryKey, TPageParam>,
  options: Omit<UseSuspenseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, "queryKey" | "queryFn"> & {
    getNextPageParam: (lastPage: TQueryFnData, allPages: TQueryFnData[], lastPageParam: TPageParam, allPageParams: TPageParam[]) => TPageParam | undefined | null;
    initialPageParam: TPageParam;
  }
) {
  return (variables: TVariables): UseSuspenseInfiniteQueryResult<TData, TError> => {
    const queryKey = getQueryKey(variables);
    return useSuspenseInfiniteQuery({ queryKey, queryFn, ...options });
  };
}
export function useEnhancedSuspenseQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(options: UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>): UseSuspenseQueryResult<TData, TError> {
  return useSuspenseQuery(options);
}
export function useEnhancedSuspenseInfiniteQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(options: UseSuspenseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>): UseSuspenseInfiniteQueryResult<TData, TError> {
  return useSuspenseInfiniteQuery(options);
}