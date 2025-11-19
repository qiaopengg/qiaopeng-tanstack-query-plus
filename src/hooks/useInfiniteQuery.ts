import type { DefaultError, QueryFunction, QueryKey, UseInfiniteQueryOptions, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { CursorPaginatedResponse, OffsetPaginatedResponse, PageNumberPaginatedResponse } from "../types/infinite";
import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
export function useEnhancedInfiniteQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(options: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>): UseInfiniteQueryResult<TData, TError> {
  return useInfiniteQuery(options);
}
export function createInfiniteQueryOptions<TQueryFnData = unknown, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(config: { queryKey: TQueryKey; queryFn: QueryFunction<TQueryFnData, TQueryKey, TPageParam>; initialPageParam: TPageParam; getNextPageParam: (lastPage: TQueryFnData, allPages: TQueryFnData[], lastPageParam: TPageParam, allPageParams: TPageParam[]) => TPageParam | undefined | null; getPreviousPageParam?: (firstPage: TQueryFnData, allPages: TQueryFnData[], firstPageParam: TPageParam, allPageParams: TPageParam[]) => TPageParam | undefined | null; staleTime?: number; gcTime?: number }): UseInfiniteQueryOptions<TQueryFnData, DefaultError, TQueryFnData, TQueryKey, TPageParam> {
  return infiniteQueryOptions(config);
}
export function createCursorPaginationOptions<T>(config: { queryKey: QueryKey; queryFn: (cursor: string | null) => Promise<CursorPaginatedResponse<T>>; initialCursor?: string | null; staleTime?: number; gcTime?: number }): UseInfiniteQueryOptions<CursorPaginatedResponse<T>, DefaultError, CursorPaginatedResponse<T>, QueryKey, string | null> {
  return createInfiniteQueryOptions({
    queryKey: config.queryKey,
    queryFn: ({ pageParam }) => config.queryFn(pageParam as string | null),
    initialPageParam: config.initialCursor ?? null,
    getNextPageParam: (lastPage) => lastPage.cursor ?? null,
    getPreviousPageParam: () => null,
    staleTime: config.staleTime,
    gcTime: config.gcTime
  });
}
export function createOffsetPaginationOptions<T>(config: { queryKey: QueryKey; queryFn: (offset: number, limit: number) => Promise<OffsetPaginatedResponse<T>>; limit?: number; staleTime?: number; gcTime?: number }): UseInfiniteQueryOptions<OffsetPaginatedResponse<T>, DefaultError, OffsetPaginatedResponse<T>, QueryKey, number> {
  const limit = config.limit ?? 20;
  return createInfiniteQueryOptions({
    queryKey: [...config.queryKey, limit] as QueryKey,
    queryFn: ({ pageParam }) => config.queryFn(pageParam as number, limit),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.hasMore === false) return undefined;
      const currentOffset = allPages.length * limit;
      if (currentOffset >= lastPage.total) return undefined;
      return currentOffset;
    },
    getPreviousPageParam: (_firstPage, allPages) => {
      if (allPages.length <= 1) return undefined;
      return (allPages.length - 2) * limit;
    },
    staleTime: config.staleTime,
    gcTime: config.gcTime
  });
}
export function createPageNumberPaginationOptions<T>(config: { queryKey: QueryKey; queryFn: (page: number) => Promise<PageNumberPaginatedResponse<T>>; staleTime?: number; gcTime?: number }): UseInfiniteQueryOptions<PageNumberPaginatedResponse<T>, DefaultError, PageNumberPaginatedResponse<T>, QueryKey, number> {
  return createInfiniteQueryOptions({
    queryKey: config.queryKey,
    queryFn: ({ pageParam }) => config.queryFn(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const nextPage = allPages.length + 1;
      if (nextPage > lastPage.totalPages) return undefined;
      return nextPage;
    },
    getPreviousPageParam: (_firstPage, allPages) => {
      if (allPages.length <= 1) return undefined;
      return allPages.length - 1;
    },
    staleTime: config.staleTime,
    gcTime: config.gcTime
  });
}