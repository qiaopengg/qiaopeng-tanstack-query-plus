import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type {
  DataGuardOptions,
  DataGuardStrategy,
  VersionedEntity,
  VersionedPaginatedResponse
} from "../types/dataGuard.js";
import { startsWithKeyPrefix } from "./queryKey.js";

/**
 * 简单的字符串哈希函数（DJB2算法变体）
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash | 0;  // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
}

/**
 * 对象键排序（确保一致的哈希值）
 */
function sortObjectKeys(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  
  const sorted: any = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  return sorted;
}

/**
 * 计算对象的哈希值（键排序后计算，确保一致性）
 */
export function hashObject(obj: any): string {
  try {
    const sorted = sortObjectKeys(obj);
    return simpleHash(JSON.stringify(sorted));
  } catch {
    return simpleHash(String(obj));
  }
}

/**
 * 自适应数据防护：根据数据特征自动选择最佳防护策略
 * 
 * 策略优先级：
 * 1. version（版本号）- 最可靠
 * 2. updatedAt（时间戳）- 次优
 * 3. hash（内容哈希）- 兜底
 */
export function applyDataGuard<T extends VersionedEntity>(
  newData: VersionedPaginatedResponse<T>,
  cached: VersionedPaginatedResponse<T> | undefined,
  queryKey: QueryKey,
  options: DataGuardOptions = {}
): {
  shouldReject: boolean;
  reason: string;
  strategy: DataGuardStrategy;
  guardDetails: any;
} {
  const {
    maxDataAge = 10000,
    enableVersionCheck = true,
    enableTimestampCheck = true,
    enableHashCheck = true
  } = options;

  // 如果没有缓存，接受新数据
  if (!cached) {
    return {
      shouldReject: false,
      reason: "No cached data",
      strategy: "none",
      guardDetails: {}
    };
  }

  let shouldReject = false;
  let reason = "";
  let strategy: DataGuardStrategy = "none";
  let guardDetails: any = {};

  // ============================================
  // 策略1：版本号比较（最可靠）
  // ============================================
  if (enableVersionCheck && cached.version !== undefined && newData.version !== undefined) {
    strategy = "version";

    if (newData.version < cached.version) {
      shouldReject = true;
      reason = `版本号回退：缓存版本 ${cached.version} > 新数据版本 ${newData.version}`;
      guardDetails = {
        cachedVersion: cached.version,
        newVersion: newData.version,
        diff: cached.version - newData.version
      };
    } else if (newData.version === cached.version) {
      guardDetails = {
        version: newData.version,
        status: "identical"
      };
    } else {
      guardDetails = {
        cachedVersion: cached.version,
        newVersion: newData.version,
        status: "updated"
      };
    }
  }

  // ============================================
  // 策略2：时间戳比较（次优）
  // ============================================
  else if (enableTimestampCheck && cached.updatedAt && newData.updatedAt) {
    strategy = "timestamp";

    try {
      const cachedTime = new Date(cached.updatedAt).getTime();
      const newTime = new Date(newData.updatedAt).getTime();
      const timeDiff = cachedTime - newTime;
      const dataAge = Date.now() - newTime;

      guardDetails = {
        cachedTime: cached.updatedAt,
        newTime: newData.updatedAt,
        timeDiff,
        dataAge
      };

      // 新数据的时间戳更旧
      if (newTime < cachedTime) {
        // 如果数据年龄超过阈值，拒绝
        if (dataAge > maxDataAge) {
          shouldReject = true;
          reason = `时间戳过期：新数据时间 ${newData.updatedAt} 早于缓存 ${cached.updatedAt}，且数据年龄 ${dataAge}ms 超过阈值 ${maxDataAge}ms`;
        } else {
          // 数据年龄在可接受范围内，记录警告但接受
          guardDetails.warning = `时间戳略旧但在可接受范围内（${dataAge}ms < ${maxDataAge}ms）`;
        }
      }
    } catch (error) {
      guardDetails.error = `时间戳解析失败: ${error}`;
      // 时间戳解析失败，不使用时间戳策略
      // 将在下一个 else if 中尝试 hash 策略
    }
  }

  // ============================================
  // 策略3：内容哈希比较（兜底）
  // ============================================
  else if (enableHashCheck) {
    strategy = "hash";

    const newHash = hashObject(newData.items);
    const cachedHash = cached._hash;

    guardDetails = {
      cachedHash,
      newHash,
      identical: cachedHash === newHash
    };

    if (cachedHash && cachedHash === newHash) {
      // 内容完全相同，不需要更新
      shouldReject = true;
      reason = "内容哈希相同，数据未变化";
    } else if (
      cachedHash &&
      cached._recentlyUpdatedIds &&
      (Array.isArray(cached._recentlyUpdatedIds)
        ? cached._recentlyUpdatedIds.length > 0
        : cached._recentlyUpdatedIds.size > 0)
    ) {
      // 检查最近更新的项是否被回退
      let hasRevert = false;

      for (const id of cached._recentlyUpdatedIds) {
        const cachedItem = cached.items.find(item => item.id === id);
        const newItem = newData.items.find(item => item.id === id);

        if (cachedItem && newItem) {
          const cachedItemHash = hashObject(cachedItem);
          const newItemHash = hashObject(newItem);

          if (cachedItemHash !== newItemHash) {
            // 简单启发式：如果缓存项有更多字段，可能是新的
            if (Object.keys(cachedItem).length > Object.keys(newItem).length) {
              hasRevert = true;
              guardDetails.revertedItem = { id, cachedItem, newItem };
              break;
            }
          }
        }
      }

      if (hasRevert) {
        shouldReject = true;
        reason = "检测到最近更新的项可能被回退";
      }
    }
  }

  return {
    shouldReject,
    reason,
    strategy,
    guardDetails
  };
}

/**
 * 为查询数据添加哈希标记
 */
export function addHashToData<T extends VersionedEntity>(
  data: VersionedPaginatedResponse<T>
): VersionedPaginatedResponse<T> {
  return {
    ...data,
    _hash: hashObject(data.items)
  };
}

/**
 * 标记最近更新的项
 */
export function markRecentlyUpdated<T extends VersionedEntity>(
  data: VersionedPaginatedResponse<T>,
  updatedId: string | number
): VersionedPaginatedResponse<T> {
  const existing = data._recentlyUpdatedIds
    ? (Array.isArray(data._recentlyUpdatedIds) ? [...data._recentlyUpdatedIds] : Array.from(data._recentlyUpdatedIds))
    : [];
  if (!existing.includes(updatedId)) {
    existing.push(updatedId);
  }

  return {
    ...data,
    _recentlyUpdatedIds: existing
  };
}

/**
 * 清理最近更新的标记
 */
export function clearRecentlyUpdated<T extends VersionedEntity>(
  data: VersionedPaginatedResponse<T>,
  updatedId: string | number
): VersionedPaginatedResponse<T> {
  if (!data._recentlyUpdatedIds) return data;

  const existing = Array.isArray(data._recentlyUpdatedIds) ? data._recentlyUpdatedIds : Array.from(data._recentlyUpdatedIds);
  const remaining = existing.filter((id) => id !== updatedId);

  return {
    ...data,
    _recentlyUpdatedIds: remaining.length > 0 ? remaining : undefined
  };
}

/**
 * 更新所有家族缓存的元数据（版本号、时间戳、哈希）
 */
export function updateFamilyMetadata<T extends VersionedEntity>(
  queryClient: QueryClient,
  familyKey: QueryKey,
  response: Partial<VersionedPaginatedResponse<T>>
): void {
  const cache = queryClient.getQueryCache();
  const queries = cache.findAll({
    predicate: (q: any) => startsWithKeyPrefix(q.queryKey as QueryKey, familyKey)
  });

  queries.forEach((q: any) => {
    const old = queryClient.getQueryData<VersionedPaginatedResponse<T>>(q.queryKey);
    if (old) {
      const updated: VersionedPaginatedResponse<T> = { ...old };

      // 更新版本号
      if (response.version !== undefined) {
        updated.version = response.version;
      } else if (old.version !== undefined) {
        updated.version = old.version + 1;
      }

      // 更新时间戳
      if (response.updatedAt) {
        updated.updatedAt = response.updatedAt;
      } else if (old.updatedAt !== undefined) {
        updated.updatedAt = new Date().toISOString();
      }

      // 更新哈希（安全检查：确保 items 存在）
      if (old._hash !== undefined && updated.items) {
        updated._hash = hashObject(updated.items);
      }

      queryClient.setQueryData(q.queryKey, updated);
    }
  });
}
