import type { DefaultError, QueryKey, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { skipToken, useQuery } from "@tanstack/react-query";
export function useEnhancedQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>): UseQueryResult<TData, TError> {
  return useQuery(options);
}
export { skipToken };