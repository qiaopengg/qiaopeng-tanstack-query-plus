import { useMutationState as useTanStackMutationState } from "@tanstack/react-query";
import type { MutationFilters } from "@tanstack/react-query";

export type MutationStateOptions<TResult = unknown> = Parameters<typeof useTanStackMutationState<TResult>>[0];

export function useMutationState<TResult = unknown>(
  options: MutationStateOptions<TResult> = {}
): Array<TResult> {
  return useTanStackMutationState(options);
}

export type { MutationFilters };
