import { useIsFetching as useTanStackIsFetching, useIsMutating as useTanStackIsMutating } from "@tanstack/react-query";
import type { QueryFilters, MutationFilters } from "@tanstack/react-query";

export function useIsFetching(filters?: QueryFilters): number {
  return useTanStackIsFetching(filters);
}

export function useIsMutating(filters?: MutationFilters): number {
  return useTanStackIsMutating(filters);
}
