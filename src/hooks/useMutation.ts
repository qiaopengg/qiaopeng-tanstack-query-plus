import type { MutationFunction, MutationKey, QueryClient, QueryKey, UseMutationOptions as TanStackUseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import type { MutationContext, MutationOptions } from "../types";
import type { EntityWithId } from "../types/selectors";
import { useQueryClient, useMutation as useTanStackMutation } from "@tanstack/react-query";
import { DEFAULT_MUTATION_CONFIG } from "../core/config.js";
import { deriveFamilyKey, isListFamilyKey } from "../utils/queryKey.js";

export type { MutationKey };

export interface MutationDefaultsConfig { [key: string]: TanStackUseMutationOptions<any, any, any, any> }

export function useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(options: MutationOptions<TData, TError, TVariables, TContext>): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { optimistic, onMutate, onError, onSuccess, onSettled, ...restOptions } = options as any;
  type MutationCtx = MutationContext<unknown, TContext>;
  const mutationConfig: TanStackUseMutationOptions<TData, TError, TVariables, MutationCtx> = {
    ...restOptions,
    retry: restOptions.retry ?? DEFAULT_MUTATION_CONFIG.retry,
    retryDelay: restOptions.retryDelay ?? DEFAULT_MUTATION_CONFIG.retryDelay,
    gcTime: restOptions.gcTime ?? DEFAULT_MUTATION_CONFIG.gcTime
  } as TanStackUseMutationOptions<TData, TError, TVariables, MutationCtx>;
  
  if (!optimistic) {
    if (onMutate) { mutationConfig.onMutate = onMutate as any; }
    if (onError) { mutationConfig.onError = onError as any; }
    if (onSuccess) { mutationConfig.onSuccess = onSuccess as any; }
    if (onSettled) { mutationConfig.onSettled = onSettled as any; }
  } else {
    mutationConfig.onMutate = async (variables: TVariables) => {
      if (optimistic.enabled === false) {
        const mutateCallback = onMutate as (vars: TVariables) => Promise<TContext | undefined>;
        const userContext = onMutate ? await mutateCallback(variables) : undefined;
        return { userContext } as MutationCtx;
      }
      try {
        // Derive family key (e.g., ['products', 'list'] from ['products', 'list', { page: 1, pageSize: 10 }])
        const familyKey = optimistic.familyKey ?? deriveFamilyKey(optimistic.queryKey);
        
        // Cancel all queries in the family to prevent race conditions
        await queryClient.cancelQueries({ queryKey: familyKey });

        // Save snapshots of all queries in the family
        const previousData = queryClient.getQueriesData({ queryKey: familyKey });

        // Apply field mapping if specified
        let mappedVariables: TVariables = variables;
        if (optimistic.fieldMapping && typeof variables === "object" && variables !== null) {
          mappedVariables = { ...variables } as TVariables;
          const sourceObj = variables as Record<string, unknown>;
          const targetObj = mappedVariables as Record<string, unknown>;
          Object.entries(optimistic.fieldMapping as Record<string, string>).forEach(([sourceField, targetField]) => {
            if (sourceField in sourceObj) { (targetObj as Record<string, any>)[targetField] = sourceObj[sourceField]; }
          });
        }

        // ✅ Official approach: Update all cached query variants using setQueriesData
        queryClient.setQueriesData(
          { queryKey: familyKey },
          (oldData: unknown | undefined) => {
            if (!oldData) return oldData;
            return optimistic.updater(oldData, mappedVariables);
          }
        );

        const mutateCallback = onMutate as (vars: TVariables) => Promise<TContext | undefined>;
        const userContext = onMutate ? await mutateCallback(variables) : undefined;
        return { previousData, userContext } as MutationCtx;
      } catch (error) {
        return { userContext: undefined } as MutationCtx;
      }
    };
    
    mutationConfig.onError = (error, variables, context) => {
      // Rollback all query variants
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]: [QueryKey, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      
      if (optimistic.rollback && context?.previousData) {
        try { 
          // Call rollback with the first snapshot (usually the current query)
          const firstSnapshot = context.previousData[0]?.[1];
          if (firstSnapshot) {
            optimistic.rollback(firstSnapshot, error as Error); 
          }
        } catch {}
      }
      
      if (onError) {
        const errorCallback = onError as (err: TError, vars: TVariables, ctx: TContext) => void;
        errorCallback(error, variables, context?.userContext as TContext);
      }
    };
    
    mutationConfig.onSuccess = (data, variables, context) => {
      // Determine invalidation scope
      const scope = optimistic.invalidateScope ?? (isListFamilyKey(optimistic.queryKey) ? "family" : "exact");
      const invalidations: Array<Parameters<QueryClient["invalidateQueries"]>[0]> = [];
      
      if (scope !== "none") {
        if (scope === "family") {
          const familyKey = optimistic.familyKey ?? deriveFamilyKey(optimistic.queryKey);
          invalidations.push({ queryKey: familyKey });
        } else {
          invalidations.push({ queryKey: optimistic.queryKey });
        }
      }
      
      // Add related keys
      if (Array.isArray(optimistic.relatedKeys) && optimistic.relatedKeys.length > 0) {
        optimistic.relatedKeys.forEach((k: QueryKey) => invalidations.push({ queryKey: k }));
      }
      if (Array.isArray(optimistic.invalidates) && optimistic.invalidates.length > 0) {
        optimistic.invalidates.forEach((k: QueryKey) => invalidations.push({ queryKey: k }));
      }

      // Execute invalidations (deduplicated)
      if (invalidations.length > 0) {
        const seen = new Set<string>();
        const tasks = invalidations
          .map((cfg) => ({ ...cfg, exact: false }))
          .filter((cfg) => {
            const key = JSON.stringify(cfg.queryKey);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        
        tasks.forEach(task => queryClient.invalidateQueries(task));
      }

      if (onSuccess) {
        const successCallback = onSuccess as (d: TData, vars: TVariables, ctx: TContext) => void;
        successCallback(data, variables, context?.userContext as TContext);
      }
    };
    
    mutationConfig.onSettled = (data, error, variables, context) => {
      if (onSettled) {
        const settledCallback = onSettled as (d: TData | undefined, err: TError | null, vars: TVariables, ctx: TContext) => void;
        settledCallback(data, error, variables, context?.userContext as TContext);
      }
    };
  }
  return useTanStackMutation(mutationConfig) as UseMutationResult<TData, TError, TVariables, TContext>;
}

export function setupMutationDefaults(queryClient: QueryClient, config: MutationDefaultsConfig): void {
  Object.entries(config).forEach(([key, options]) => { queryClient.setMutationDefaults([key], options); });
}

export function useListMutation<T extends EntityWithId>(
  mutationFn: MutationFunction<T, { operation: string; data: Partial<T> }>, 
  queryKey: QueryKey, 
  options?: TanStackUseMutationOptions<T, Error, { operation: string; data: Partial<T> }> & { mutationKey?: readonly unknown[] }
) {
  const queryClient = useQueryClient();
  return useTanStackMutation({
    mutationFn,
    onSettled: () => {
      // Invalidate all queries in the family
      const familyKey = deriveFamilyKey(queryKey);
      queryClient.invalidateQueries({ queryKey: familyKey, exact: false });
    },
    ...options,
    mutationKey: options?.mutationKey
  });
}


