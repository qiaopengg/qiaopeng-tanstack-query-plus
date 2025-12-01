import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type { DataGuardOptions, VersionedEntity, VersionedPaginatedResponse } from "../types/dataGuard.js";
import { useQueryClient } from "@tanstack/react-query";
import { applyDataGuard, addHashToData } from "../utils/dataGuard.js";
import { isDev } from "../core/env.js";

/**
 * Hook: 创建带数据防护的查询配置
 * 
 * 自动根据后端返回的数据选择最佳防护策略：
 * 1. 如果有 version 字段 → 使用版本号比较（最可靠）
 * 2. 如果有 updatedAt 字段 → 使用时间戳比较（次优）
 * 3. 都没有 → 使用内容哈希比较（兜底）
 * 
 * @example
 * ```typescript
 * const { data } = useEnhancedQuery(
 *   useDataGuardQueryConfig(
 *     ['products', 'list', { page: 1, pageSize: 20 }],
 *     () => fetchProducts(1, 20),
 *     {
 *       maxDataAge: 5000,
 *       onStaleDataDetected: (info) => {
 *         console.warn('检测到旧数据', info)
 *       }
 *     }
 *   )
 * )
 * ```
 */
export function useDataGuardQueryConfig<T extends VersionedEntity>(
  queryKey: QueryKey,
  fetchFn: () => Promise<VersionedPaginatedResponse<T>>,
  options?: DataGuardOptions
): Pick<UseQueryOptions<VersionedPaginatedResponse<T>>, "queryKey" | "queryFn"> {
  const queryClient = useQueryClient();

  return {
    queryKey,
    queryFn: async () => {
      const newData = await fetchFn();
      const cached = queryClient.getQueryData<VersionedPaginatedResponse<T>>(queryKey);

      // 应用数据防护
      const { shouldReject, reason, strategy, guardDetails } = applyDataGuard(
        newData,
        cached,
        queryKey,
        options
      );

      // 触发回调
      options?.onDataGuardApplied?.({
        strategy,
        passed: !shouldReject,
        details: guardDetails
      });

      if (shouldReject) {
        if (isDev) {
          console.warn("[Data Guard] 拒绝旧数据", {
            reason,
            strategy,
            queryKey,
            guardDetails
          });
        }

        options?.onStaleDataDetected?.({
          reason,
          strategy,
          queryKey,
          cached,
          rejected: newData
        });

        return cached!;
      }

      if (isDev) {
        console.log("[Data Guard] 接受新数据", {
          strategy,
          guardDetails
        });
      }

      // 添加哈希标记
      return addHashToData(newData);
    }
  };
}
