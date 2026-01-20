import type { QueryKey } from "@tanstack/react-query";

/**
 * 数据防护策略类型
 */
export type DataGuardStrategy = "version" | "timestamp" | "hash" | "none";

/**
 * 带版本控制的实体基础接口
 */
export interface VersionedEntity {
  id: string | number;
  version?: number;
  updatedAt?: string;
}

/**
 * 带版本控制的分页响应
 */
export interface VersionedPaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  version?: number;
  updatedAt?: string;
  _hash?: string;
  _recentlyUpdatedIds?: Array<string | number> | Set<string | number>;
}

/**
 * 旧数据检测信息
 */
export interface StaleDataInfo {
  reason: string;
  strategy: DataGuardStrategy;
  queryKey: QueryKey;
  cached: any;
  rejected: any;
}

/**
 * 数据防护应用信息
 */
export interface DataGuardInfo {
  strategy: DataGuardStrategy;
  passed: boolean;
  details: any;
}

/**
 * 数据防护配置选项
 */
export interface DataGuardOptions {
  /** 时间戳模式下，最大接受的数据年龄（毫秒），默认 10000 */
  maxDataAge?: number;
  /** 启用版本号检查，默认 true */
  enableVersionCheck?: boolean;
  /** 启用时间戳检查，默认 true */
  enableTimestampCheck?: boolean;
  /** 启用哈希检查（兜底），默认 true */
  enableHashCheck?: boolean;
  /** 检测到旧数据时的回调 */
  onStaleDataDetected?: (info: StaleDataInfo) => void;
  /** 应用防护时的回调 */
  onDataGuardApplied?: (info: DataGuardInfo) => void;
}

/**
 * 冲突错误类
 */
export class ConflictError extends Error {
  constructor(public details: any) {
    super("Data conflict detected");
    this.name = "ConflictError";
  }
}
