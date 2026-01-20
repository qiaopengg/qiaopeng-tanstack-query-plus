import type { QueryKey, UseMutationResult } from "@tanstack/react-query";
import type { MutationOptions } from "../types/index.js";
import type { VersionedEntity, VersionedPaginatedResponse } from "../types/dataGuard.js";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "./useMutation.js";
import { ConflictError } from "../types/dataGuard.js";
import { hashObject, markRecentlyUpdated, clearRecentlyUpdated, updateFamilyMetadata } from "../utils/dataGuard.js";
import { startsWithKeyPrefix } from "../utils/queryKey.js";

export interface DataGuardMutationOptions<TData, TError, TVariables, TContext> extends MutationOptions<TData, TError, TVariables, TContext> {
  /** 冲突错误回调 */
  onConflict?: (error: any) => void;
}

/**
 * 带数据防护的 Mutation Hook
 * 
 * 自动处理：
 * 1. 乐观更新时递增版本号和更新时间戳
 * 2. 标记最近更新的项
 * 3. 成功后更新所有家族缓存的元数据
 * 4. 冲突检测（409 错误）
 * 5. 延迟清理更新标记
 * 
 * @example
 * ```typescript
 * const mutation = useDataGuardMutation(
 *   (updated) => api.updateProduct(updated.id, updated),
 *   ['products', 'list', { page: 1, pageSize: 20 }],
 *   {
 *     optimistic: {
 *       queryKey: ['products', 'list', { page: 1, pageSize: 20 }],
 *       updater: (old, updated) => ({
 *         ...old,
 *         items: old?.items?.map(p => p.id === updated.id ? updated : p)
 *       })
 *     },
 *     onConflict: (error) => {
 *       toast.error('数据冲突，请刷新')
 *     }
 *   }
 * )
 * ```
 */
export function useDataGuardMutation<
  TData extends VersionedEntity = VersionedEntity,
  TError = Error,
  TVariables extends VersionedEntity = VersionedEntity,
  TContext = unknown
>(
  mutationFn: (data: TVariables) => Promise<TData>,
  queryKey: QueryKey,
  options?: DataGuardMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const { onConflict, onSuccess, optimistic, ...restOptions } = options || {};

  // 增强的 mutation 函数：检测冲突
  const enhancedMutationFn = async (data: TVariables): Promise<TData> => {
    try {
      const result = await mutationFn(data);
      return result;
    } catch (error: any) {
      // 检测冲突错误（409 Conflict）
      if (error && typeof error === 'object' && 
          (error.status === 409 || error.code === "CONFLICT" || error.name === "ConflictError")) {
        onConflict?.(error);
        throw new ConflictError(error);
      }
      throw error;
    }
  };

  // 增强的乐观更新配置
  const enhancedOptimistic = optimistic ? {
    ...optimistic,
    updater: (old: any, variables: TVariables) => {
      // 调用原始 updater
      const updated = optimistic.updater(old, variables);

      if (!updated) return updated;

      // 检查 variables.id 是否存在
      if (variables.id === undefined || variables.id === null) {
        return updated;
      }

      // 标记最近更新的项
      const withMark = markRecentlyUpdated(updated, variables.id);

      // 乐观更新版本号（安全检查：确保 old 存在）
      if (old && old.version !== undefined) {
        withMark.version = old.version + 1;
      }

      // 乐观更新时间戳（安全检查：确保 old 存在）
      if (old && old.updatedAt !== undefined) {
        withMark.updatedAt = new Date().toISOString();
      }

      // 更新哈希（安全检查：确保 old 存在）
      if (old && old._hash !== undefined) {
        withMark._hash = hashObject(withMark.items);
      }

      return withMark;
    }
  } : undefined;

  // 增强的成功回调
  const enhancedOnSuccess = (data: TData, variables: TVariables, onMutateResult: any, context: any) => {
    try {
      // 更新所有家族缓存的元数据
      const familyKey = Array.isArray(queryKey) ? queryKey.slice(0, -1) : [queryKey];
      updateFamilyMetadata<TData>(queryClient, familyKey, data);

      // 延迟清理最近更新标记（5秒后）
      const cleanupDelay = 5000;

      // 延迟清理最近更新标记
      setTimeout(() => {
        try {
          // 检查 variables.id 是否存在
          if (variables.id === undefined || variables.id === null) {
            return;
          }

          const cache = queryClient.getQueryCache();
          const queries = cache.findAll({
            predicate: (q: any) => startsWithKeyPrefix(q.queryKey as QueryKey, familyKey)
          });

          queries.forEach((q: any) => {
            const old = queryClient.getQueryData<VersionedPaginatedResponse<TData>>(q.queryKey);
            if (old?._recentlyUpdatedIds) {
              const cleared = clearRecentlyUpdated(old, variables.id);
              queryClient.setQueryData(q.queryKey, cleared);
            }
          });
        } catch (error) {
          // 清理标记失败不应该影响用户操作（静默处理）
        }
      }, cleanupDelay);
    } catch (error) {
      // 元数据更新失败不应该影响用户操作（静默处理）
    }

    // 调用用户的 onSuccess
    onSuccess?.(data, variables, onMutateResult, context);
  };

  return useMutation({
    ...restOptions,
    mutationFn: enhancedMutationFn,
    optimistic: enhancedOptimistic as any,  // 类型复杂，暂时保留
    onSuccess: enhancedOnSuccess,
    onError: (error: TError, variables: TVariables, onMutateResult: any, context: any) => {
      if (error instanceof ConflictError) {
        // 冲突时失效所有家族缓存
        const familyKey = Array.isArray(queryKey) ? queryKey.slice(0, -1) : [queryKey];
        queryClient.invalidateQueries({ queryKey: familyKey });
      }

      // 调用用户的 onError
      restOptions.onError?.(error, variables, onMutateResult, context);
    }
  });
}
