import type { DefaultOptions } from "@tanstack/react-query";
import { isProd } from "./env.js";

export const TIME_CONSTANTS = {
  THIRTY_SECONDS: 30 * 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000
} as const;

export const DEFAULT_STALE_TIME = TIME_CONSTANTS.THIRTY_SECONDS;
export const DEFAULT_GC_TIME = TIME_CONSTANTS.TEN_MINUTES;

interface HttpError {
  status?: number;
  statusCode?: number;
  message?: string;
  response?: {
    status?: number;
    statusCode?: number;
  };
}

/**
 * 从错误对象中提取 HTTP 状态码
 * 兼容多种错误对象结构：axios、fetch、自定义等
 */
function extractHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  
  const err = error as HttpError;
  
  // 直接在错误对象上的 status
  if (typeof err.status === "number") return err.status;
  if (typeof err.statusCode === "number") return err.statusCode;
  
  // 在 response 对象中的 status (axios 等)
  if (err.response) {
    if (typeof err.response.status === "number") return err.response.status;
    if (typeof err.response.statusCode === "number") return err.response.statusCode;
  }
  
  return undefined;
}

/**
 * 默认 Query 重试策略
 * - 4XX 客户端错误：不重试（客户端问题，重试无意义）
 * - 5XX 服务端错误：最多重试 1 次（避免过度重试）
 * - 其他错误（网络等）：最多重试 2 次
 */
export function defaultQueryRetryStrategy(failureCount: number, error: unknown): boolean {
  const status = extractHttpStatus(error);
  
  // 4XX 客户端错误：不重试
  if (status && status >= 400 && status < 500) {
    return false;
  }
  
  // 5XX 服务端错误：最多重试 1 次
  if (status && status >= 500 && status < 600) {
    return failureCount < 1;
  }
  
  // 其他错误（网络错误等）：最多重试 2 次
  return failureCount < 2;
}

/**
 * 默认 Mutation 重试策略
 * - 4XX 客户端错误：不重试
 * - 5XX 服务端错误：不重试（Mutation 更谨慎，避免重复操作）
 * - 其他错误：最多重试 1 次
 */
export function defaultMutationRetryStrategy(failureCount: number, error: unknown): boolean {
  const status = extractHttpStatus(error);
  
  // 4XX 客户端错误：不重试
  if (status && status >= 400 && status < 500) {
    return false;
  }
  
  // 5XX 服务端错误：不重试（Mutation 避免重复操作）
  if (status && status >= 500 && status < 600) {
    return false;
  }
  
  // 其他错误（网络错误等）：最多重试 1 次
  return failureCount < 1;
}

export function exponentialBackoff(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}

export const DEFAULT_QUERY_CONFIG: NonNullable<DefaultOptions["queries"]> = {
  staleTime: DEFAULT_STALE_TIME,
  gcTime: DEFAULT_GC_TIME,
  retry: defaultQueryRetryStrategy,
  retryDelay: exponentialBackoff,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true
};

export const DEFAULT_MUTATION_CONFIG: NonNullable<DefaultOptions["mutations"]> = {
  retry: 0,
  retryDelay: exponentialBackoff,
  gcTime: DEFAULT_GC_TIME
};

export const GLOBAL_QUERY_CONFIG: DefaultOptions = {
  queries: DEFAULT_QUERY_CONFIG,
  mutations: DEFAULT_MUTATION_CONFIG
};

export const SMART_RETRY_MUTATION_CONFIG: DefaultOptions["mutations"] = {
  retry: defaultMutationRetryStrategy,
  retryDelay: exponentialBackoff,
  gcTime: DEFAULT_GC_TIME
};

export const DEVELOPMENT_CONFIG: DefaultOptions = {
  queries: {
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 0,
    gcTime: TIME_CONSTANTS.TEN_MINUTES,
    retry: defaultQueryRetryStrategy,
    refetchOnWindowFocus: true
  },
  mutations: {
    ...DEFAULT_MUTATION_CONFIG,
    retry: 0
  }
};

export const PRODUCTION_CONFIG: DefaultOptions = {
  queries: {
    ...DEFAULT_QUERY_CONFIG,
    staleTime: TIME_CONSTANTS.TEN_MINUTES,
    gcTime: TIME_CONSTANTS.THIRTY_MINUTES,
    retry: defaultQueryRetryStrategy,
    refetchOnWindowFocus: true
  },
  mutations: {
    ...DEFAULT_MUTATION_CONFIG,
    retry: 0
  }
};

export const LONG_CACHE_CONFIG: DefaultOptions = {
  queries: {
    ...DEFAULT_QUERY_CONFIG,
    staleTime: TIME_CONSTANTS.FIFTEEN_MINUTES,
    gcTime: TIME_CONSTANTS.ONE_HOUR,
    retry: defaultQueryRetryStrategy,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  },
  mutations: {
    ...DEFAULT_MUTATION_CONFIG,
    retry: 0
  }
};

export const REALTIME_CONFIG: DefaultOptions = {
  queries: {
    ...DEFAULT_QUERY_CONFIG,
    staleTime: 0,
    gcTime: TIME_CONSTANTS.ONE_MINUTE * 2,
    retry: defaultQueryRetryStrategy,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: TIME_CONSTANTS.THIRTY_SECONDS
  },
  mutations: DEFAULT_MUTATION_CONFIG
};

export function getConfigByEnvironment(
  env: "development" | "production" | "test" | "realtime" | "longCache"
): DefaultOptions {
  switch (env) {
    case "development":
      return DEVELOPMENT_CONFIG;
    case "production":
      return PRODUCTION_CONFIG;
    case "realtime":
      return REALTIME_CONFIG;
    case "longCache":
      return LONG_CACHE_CONFIG;
    case "test":
      return {
        queries: {
          ...DEFAULT_QUERY_CONFIG,
          retry: 0,
          staleTime: 0,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchOnMount: true
        },
        mutations: {
          ...DEFAULT_MUTATION_CONFIG,
          retry: 0
        }
      };
    default:
      return GLOBAL_QUERY_CONFIG;
  }
}

export function createCustomConfig(overrides: Partial<DefaultOptions>): DefaultOptions {
  return {
    queries: {
      ...DEFAULT_QUERY_CONFIG,
      ...overrides.queries
    },
    mutations: {
      ...DEFAULT_MUTATION_CONFIG,
      ...overrides.mutations
    }
  };
}

export function validateGcTime(staleTime: number, gcTime: number): { isValid: boolean; warning?: string } {
  if (gcTime <= staleTime) {
    return {
      isValid: false,
      warning: `gcTime (${gcTime}ms) 必须大于 staleTime (${staleTime}ms)。当前 gcTime 过小，可能导致缓存数据过早被清理。`
    };
  }
  return { isValid: true };
}

export function validateConfig(config: DefaultOptions): { isValid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let isValid = true;
  if (config.queries) {
    const staleTime = typeof config.queries.staleTime === "number" ? config.queries.staleTime : DEFAULT_STALE_TIME;
    const gcTime = typeof config.queries.gcTime === "number" ? config.queries.gcTime : DEFAULT_GC_TIME;
    const gcTimeValidation = validateGcTime(staleTime, gcTime);
    if (!gcTimeValidation.isValid && gcTimeValidation.warning) {
      warnings.push(gcTimeValidation.warning);
      isValid = false;
    } else if (gcTimeValidation.warning) {
      warnings.push(gcTimeValidation.warning);
    }
    if ("cacheTime" in config.queries) {
      warnings.push("检测到已废弃的 'cacheTime' 属性。在 React Query v5 中，请使用 'gcTime' 代替。");
      isValid = false;
    }
    if (config.queries.refetchOnWindowFocus === false) {
      warnings.push("建议启用 'refetchOnWindowFocus' 以提供更好的用户体验。当用户切换回应用时，数据会自动刷新。");
    }
    if (typeof config.queries.retryDelay === "number") {
      warnings.push(
        "建议使用指数退避策略作为重试延迟，而不是固定延迟。例如：(attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)"
      );
    }
  }
  return { isValid, warnings };
}

export function ensureBestPractices(config: DefaultOptions): DefaultOptions {
  const result: DefaultOptions = { ...config };
  if (result.queries) {
    const queries = { ...result.queries };
    
    // Handle deprecated cacheTime -> gcTime mapping
    if ("cacheTime" in queries) {
      const cacheTime = (queries as any).cacheTime;
      if (typeof cacheTime === "number" && queries.gcTime === undefined) {
        queries.gcTime = cacheTime;
      }
      delete (queries as any).cacheTime;
      if (!isProd) {
        console.warn("[TanStack Query Config] 已移除废弃的 'cacheTime' 属性，改用 'gcTime'.");
      }
    }

    const staleTime = typeof queries.staleTime === "number" ? queries.staleTime : DEFAULT_STALE_TIME;
    const gcTime = typeof queries.gcTime === "number" ? queries.gcTime : DEFAULT_GC_TIME;
    const validation = validateGcTime(staleTime, gcTime);
    
    if (!validation.isValid) {
      queries.gcTime = staleTime + TIME_CONSTANTS.ONE_MINUTE;
      if (!isProd) {
        console.warn(
          `[TanStack Query Config] 自动调整 gcTime 从 ${gcTime}ms 到 ${queries.gcTime}ms，以确保大于 staleTime (${staleTime}ms)。`
        );
      }
    }
    
    if (queries.retryDelay === undefined) {
      queries.retryDelay = exponentialBackoff;
    }
    
    if (queries.refetchOnWindowFocus === undefined) {
      queries.refetchOnWindowFocus = true;
    }
    
    result.queries = queries;
  }
  return result;
}

/**
 * 创建安全的重试策略
 * @param maxRetries4xx - 4XX 错误最大重试次数（默认 0，不重试）
 * @param maxRetries5xx - 5XX 错误最大重试次数（默认 0，不重试）
 * @param maxRetriesOther - 其他错误最大重试次数（默认 1）
 */
export function createSafeRetryStrategy(
  maxRetries4xx: number = 0,
  maxRetries5xx: number = 0,
  maxRetriesOther: number = 1
) {
  return (failureCount: number, error: unknown): boolean => {
    const status = extractHttpStatus(error);
    
    // 4XX 客户端错误
    if (status && status >= 400 && status < 500) {
      return failureCount < maxRetries4xx;
    }
    
    // 5XX 服务端错误
    if (status && status >= 500 && status < 600) {
      return failureCount < maxRetries5xx;
    }
    
    // 其他错误（网络等）
    return failureCount < maxRetriesOther;
  };
}

/**
 * 创建错误安全配置
 * 适用于需要严格控制重试和 refetch 行为的场景
 * 
 * @example
 * ```typescript
 * // 完全禁用重试
 * const config = createErrorSafeConfig({
 *   maxRetries4xx: 0,
 *   maxRetries5xx: 0,
 *   maxRetriesOther: 0,
 *   disableFocus: true,
 *   disableReconnect: true
 * });
 * ```
 */
export function createErrorSafeConfig(options: {
  maxRetries4xx?: number;
  maxRetries5xx?: number;
  maxRetriesOther?: number;
  disableFocus?: boolean;
  disableReconnect?: boolean;
  conditionalRefetchInterval?: number | ((query: any) => number | false) | ((data: unknown, query: any) => number | false);
  overrides?: Partial<DefaultOptions>;
} = {}): DefaultOptions {
  const {
    maxRetries4xx = 0,
    maxRetries5xx = 0,
    maxRetriesOther = 1,
    disableFocus = false,
    disableReconnect = false,
    conditionalRefetchInterval,
    overrides
  } = options;
  
  const queries: DefaultOptions["queries"] = {
    ...DEFAULT_QUERY_CONFIG,
    retry: createSafeRetryStrategy(maxRetries4xx, maxRetries5xx, maxRetriesOther),
    retryDelay: exponentialBackoff,
    refetchOnWindowFocus: disableFocus ? false : true,
    refetchOnReconnect: disableReconnect ? false : true
  };
  
  if (conditionalRefetchInterval !== undefined) {
    if (typeof conditionalRefetchInterval === "number") {
      (queries as any).refetchInterval = (query: any) => (query?.state?.error ? false : conditionalRefetchInterval);
    } else {
      const fn = conditionalRefetchInterval;
      (queries as any).refetchInterval = (query: any) => (fn.length >= 2 ? (fn as any)(query?.state?.data, query) : (fn as any)(query));
    }
  }
  
  const mutations: DefaultOptions["mutations"] = { 
    ...DEFAULT_MUTATION_CONFIG,
    retry: createSafeRetryStrategy(maxRetries4xx, maxRetries5xx, maxRetriesOther)
  };
  
  const result: DefaultOptions = {
    queries: { ...(queries as any), ...(overrides?.queries as any || {}) },
    mutations: { ...(mutations as any), ...(overrides?.mutations as any || {}) }
  };
  
  return result;
}
