import type { MutationFunction, MutationKey, QueryClient, QueryKey, UseMutationOptions as TanStackUseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import type { MutationContext, MutationOptions } from "../types";
import type { EntityWithId } from "../types/selectors";
import { useQueryClient, useMutation as useTanStackMutation } from "@tanstack/react-query";
import { DEFAULT_MUTATION_CONFIG } from "../core/config.js";
export type { MutationKey };

export interface MutationDefaultsConfig { [key: string]: TanStackUseMutationOptions<any, any, any, any> }

function deriveFamilyKey(queryKey: QueryKey): QueryKey {
  const arr = Array.isArray(queryKey) ? [...queryKey] : [queryKey as unknown];
  while (arr.length > 1) {
    const last = arr[arr.length - 1];
    if (last && typeof last === "object" && !Array.isArray(last)) { arr.pop(); continue; }
    if (typeof last === "string" && (last === "paginated" || last === "filtered" || last === "sorted" || last === "search" || last === "complex")) { arr.pop(); continue; }
    break;
  }
  return arr as unknown as QueryKey;
}

function isListFamilyKey(queryKey: QueryKey): boolean {
  const parts = Array.isArray(queryKey) ? queryKey : [queryKey as unknown];
  return parts.includes("list") || parts.includes("paginated");
}

export function useMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(options: MutationOptions<TData, TError, TVariables, TContext>): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { optimistic, onMutate, onError, onSuccess, onSettled, ...restOptions } = options;
  type MutationCtx = MutationContext<unknown, TContext>;
  const mutationConfig: TanStackUseMutationOptions<TData, TError, TVariables, MutationCtx> = {
    ...restOptions,
    retry: restOptions.retry ?? DEFAULT_MUTATION_CONFIG?.retry,
    retryDelay: restOptions.retryDelay ?? DEFAULT_MUTATION_CONFIG?.retryDelay,
    gcTime: restOptions.gcTime ?? DEFAULT_MUTATION_CONFIG?.gcTime
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
        await queryClient.cancelQueries({ queryKey: optimistic.queryKey, exact: true });
        const previousData = queryClient.getQueryData(optimistic.queryKey);
        let mappedVariables: TVariables = variables;
        if (optimistic.fieldMapping && typeof variables === "object" && variables !== null) {
          mappedVariables = { ...variables } as TVariables;
          const sourceObj = variables as Record<string, unknown>;
          const targetObj = mappedVariables as Record<string, unknown>;
          Object.entries(optimistic.fieldMapping).forEach(([sourceField, targetField]) => {
            if (sourceField in sourceObj) { targetObj[targetField] = sourceObj[sourceField]; }
          });
        }
        queryClient.setQueryData(optimistic.queryKey, (oldData: unknown | undefined) => optimistic.updater(oldData, mappedVariables));
        const mutateCallback = onMutate as (vars: TVariables) => Promise<TContext | undefined>;
        const userContext = onMutate ? await mutateCallback(variables) : undefined;
        return { previousData, userContext } as MutationCtx;
      } catch (error) {
        return { userContext: undefined } as MutationCtx;
      }
    };
    mutationConfig.onError = (error, variables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(optimistic.queryKey, context.previousData);
      }
      if (optimistic.rollback && context?.previousData !== undefined) {
        try { optimistic.rollback(context.previousData, error as Error); } catch {}
      }
      if (onError) {
        const errorCallback = onError as (err: TError, vars: TVariables, ctx: TContext) => void;
        errorCallback(error, variables, context?.userContext as TContext);
      }
    };
    mutationConfig.onSuccess = (data, variables, context) => {
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
      if (Array.isArray(optimistic.relatedKeys) && optimistic.relatedKeys.length > 0) {
        optimistic.relatedKeys.forEach((k) => invalidations.push({ queryKey: k }));
      }
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
        if (tasks.length === 1) {
          queryClient.invalidateQueries(tasks[0]);
        } else if (tasks.length > 1) {
          invalidateQueriesBatch(queryClient, tasks);
        }
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

export function useListMutation<T extends EntityWithId>(mutationFn: MutationFunction<T, { operation: string; data: Partial<T> }>, queryKey: QueryKey, options?: TanStackUseMutationOptions<T, Error, { operation: string; data: Partial<T> }> & { mutationKey?: readonly unknown[] }) {
  const queryClient = useQueryClient();
  return useTanStackMutation({
    mutationFn,
    onSettled: () => {
      const familyKey = deriveFamilyKey(queryKey);
      queryClient.invalidateQueries({ queryKey: familyKey, exact: false });
    },
    ...options,
    mutationKey: options?.mutationKey
  });
}

export function useBatchMutation<TData = unknown, TError = Error, TVariables = unknown[]>(mutationFn: MutationFunction<TData[], TVariables>, options?: TanStackUseMutationOptions<TData[], TError, TVariables> & { mutationKey?: readonly unknown[] }) {
  return useTanStackMutation({ mutationFn, ...options, mutationKey: options?.mutationKey });
}

export function useConditionalOptimisticMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  mutationFn: MutationFunction<TData, TVariables>,
  condition: (variables: TVariables) => boolean,
  options?: Omit<MutationOptions<TData, TError, TVariables, TContext>, "mutationFn"> & { mutationKey?: readonly unknown[] }
) {
  const queryClient = useQueryClient();
  const { mutationKey, optimistic, onMutate, onError, onSettled, onSuccess } = options || {};
  type MutationCtx = MutationContext<unknown, TContext>;
  const mutationConfig: TanStackUseMutationOptions<TData, TError, TVariables, MutationCtx> = { mutationKey, mutationFn };
  if (optimistic) {
    mutationConfig.onMutate = async (variables: TVariables) => {
      const conditionMet = condition(variables);
      if (!conditionMet || optimistic.enabled === false) {
        const mutateCallback = onMutate as (vars: TVariables) => Promise<TContext | undefined>;
        const userContext = onMutate ? await mutateCallback(variables) : undefined;
        return { userContext, conditionMet: false } as any;
      }
      try {
        await queryClient.cancelQueries({ queryKey: optimistic.queryKey, exact: true });
        const previousData = queryClient.getQueryData(optimistic.queryKey);
        queryClient.setQueryData(optimistic.queryKey, (oldData: unknown | undefined) => optimistic.updater(oldData, variables));
        const mutateCallback = onMutate as (vars: TVariables) => Promise<TContext | undefined>;
        const userContext = onMutate ? await mutateCallback(variables) : undefined;
        return { previousData, userContext, conditionMet: true } as any;
      } catch {
        return { userContext: undefined, conditionMet: false } as any;
      }
    };
    mutationConfig.onError = (error, variables, context) => {
      if (context?.conditionMet && context?.previousData !== undefined) {
        queryClient.setQueryData(optimistic.queryKey, context.previousData);
        if (optimistic.rollback) { try { optimistic.rollback(context.previousData, error as Error); } catch {} }
      }
      if (onError) {
        const errorCallback = onError as (err: TError, vars: TVariables, ctx: TContext) => void;
        errorCallback(error, variables, context?.userContext as TContext);
      }
    };
    mutationConfig.onSuccess = (data, variables, context) => {
      if (onSuccess) {
        const successCallback = onSuccess as (d: TData, vars: TVariables, ctx: TContext) => void;
        successCallback(data, variables, context?.userContext as TContext);
      }
    };
    mutationConfig.onSettled = (data, error, variables, context) => {
      if (context?.conditionMet) {
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
        if (Array.isArray(optimistic.relatedKeys) && optimistic.relatedKeys.length > 0) {
          optimistic.relatedKeys.forEach((k) => invalidations.push({ queryKey: k }));
        }
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
          if (tasks.length === 1) {
            queryClient.invalidateQueries(tasks[0]);
          } else if (tasks.length > 1) {
            invalidateQueriesBatch(queryClient, tasks);
          }
        }
      }
      if (onSettled) {
        const settledCallback = onSettled as (d: TData | undefined, err: TError | null, vars: TVariables, ctx: TContext) => void;
        settledCallback(data, error, variables, context?.userContext as TContext);
      }
    };
  } else {
    if (onMutate) { mutationConfig.onMutate = async (variables) => { const mutateCallback = onMutate as (vars: TVariables) => Promise<TContext | undefined>; const userContext = await mutateCallback(variables); return { userContext, conditionMet: false } as any; }; }
    if (onError) { mutationConfig.onError = (error, variables, context) => { const errorCallback = onError as (err: TError, vars: TVariables, ctx: TContext) => void; errorCallback(error, variables, context?.userContext as TContext); }; }
    if (onSuccess) { mutationConfig.onSuccess = (data, variables, context) => { const successCallback = onSuccess as (d: TData, vars: TVariables, ctx: TContext) => void; successCallback(data, variables, context?.userContext as TContext); }; }
    if (onSettled) { mutationConfig.onSettled = (data, error, variables, context) => { const settledCallback = onSettled as (d: TData | undefined, err: TError | null, vars: TVariables, ctx: TContext) => void; settledCallback(data, error, variables, context?.userContext as TContext); }; }
  }
  return useTanStackMutation(mutationConfig);
}

export async function cancelQueriesBatch(queryClient: QueryClient, queryKeys: Array<Parameters<QueryClient["cancelQueries"]>[0]>): Promise<void> {
  await Promise.all(queryKeys.map((queryKey) => queryClient.cancelQueries(queryKey)));
}
export function setQueryDataBatch(queryClient: QueryClient, updates: Array<{ queryKey: Parameters<QueryClient["setQueryData"]>[0]; updater: Parameters<QueryClient["setQueryData"]>[1] }>): void {
  updates.forEach(({ queryKey, updater }) => { queryClient.setQueryData(queryKey, updater); });
}
export async function invalidateQueriesBatch(queryClient: QueryClient, queryKeys: Array<Parameters<QueryClient["invalidateQueries"]>[0]>): Promise<void> {
  await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries(queryKey)));
}
