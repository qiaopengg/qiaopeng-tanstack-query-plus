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
  message?: string;
}

export function defaultQueryRetryStrategy(failureCount: number, error: unknown): boolean {
  const httpError = error as HttpError;
  if (httpError?.status && httpError.status >= 400 && httpError.status < 600) return failureCount < 2;
  return failureCount < 2;
}

export function defaultMutationRetryStrategy(failureCount: number, error: unknown): boolean {
  const httpError = error as HttpError;
  if (httpError?.status && httpError.status >= 400 && httpError.status < 500) return false;
  if (httpError?.status && httpError.status >= 500) return failureCount < 2;
  return failureCount < 2;
}

export function exponentialBackoff(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
}

export const DEFAULT_QUERY_CONFIG: DefaultOptions["queries"] = {
  staleTime: DEFAULT_STALE_TIME,
  gcTime: DEFAULT_GC_TIME,
  retry: defaultQueryRetryStrategy,
  retryDelay: exponentialBackoff,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true
};

export const DEFAULT_MUTATION_CONFIG: DefaultOptions["mutations"] = {
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

export function getConfigByEnvironment(env: "development" | "production" | "test"): DefaultOptions {
  switch (env) {
    case "development":
      return DEVELOPMENT_CONFIG;
    case "production":
      return PRODUCTION_CONFIG;
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
    const queries = { ...result.queries } as Record<string, unknown> & { cacheTime?: number; gcTime?: number };
    if ("cacheTime" in queries) {
      const cacheTime = queries.cacheTime;
      if (typeof cacheTime === "number" && typeof queries.gcTime !== "number") {
        queries.gcTime = cacheTime;
      }
      delete queries.cacheTime;
      if (!isProd) {
        console.warn("[TanStack Query Config] 已移除废弃的 'cacheTime' 属性，改用 'gcTime'.");
      }
    }
    const staleTime = typeof (queries as any).staleTime === "number" ? ((queries as any).staleTime as number) : DEFAULT_STALE_TIME;
    const gcTime = typeof queries.gcTime === "number" ? queries.gcTime : DEFAULT_GC_TIME;
    const validation = validateGcTime(staleTime, gcTime);
    if (!validation.isValid) {
      (queries as any).gcTime = staleTime + TIME_CONSTANTS.ONE_MINUTE;
      if (!isProd) {
        console.warn(
          `[TanStack Query Config] 自动调整 gcTime 从 ${gcTime}ms 到 ${(queries as any).gcTime}ms，以确保大于 staleTime (${staleTime}ms)。`
        );
      }
    }
    if (typeof (queries as any).retryDelay === "number" || !(queries as any).retryDelay) {
      (queries as any).retryDelay = exponentialBackoff;
    }
    if ((queries as any).refetchOnWindowFocus === undefined) {
      (queries as any).refetchOnWindowFocus = true;
    }
    result.queries = queries as any;
  }
  return result;
}

export function createSafeRetryStrategy(maxRetries500: number = 1, maxRetriesOther: number = 2) {
  return (failureCount: number, error: unknown): boolean => {
    const httpError = error as { status?: number };
    if (httpError?.status && httpError.status >= 400 && httpError.status < 500) return false;
    if (httpError?.status && httpError.status >= 500) return failureCount < maxRetries500;
    return failureCount < maxRetriesOther;
  };
}

export function createErrorSafeConfig(options: {
  maxRetries500?: number;
  maxRetriesOther?: number;
  disableFocus?: boolean;
  disableReconnect?: boolean;
  conditionalRefetchInterval?: number | ((data: unknown, query: any) => number | false);
  overrides?: Partial<DefaultOptions>;
} = {}): DefaultOptions {
  const {
    maxRetries500 = 1,
    maxRetriesOther = 2,
    disableFocus = false,
    disableReconnect = false,
    conditionalRefetchInterval,
    overrides
  } = options;
  const queries: DefaultOptions["queries"] = {
    ...DEFAULT_QUERY_CONFIG,
    retry: createSafeRetryStrategy(maxRetries500, maxRetriesOther),
    retryDelay: exponentialBackoff,
    refetchOnWindowFocus: disableFocus ? false : true,
    refetchOnReconnect: disableReconnect ? false : true
  };
  if (conditionalRefetchInterval !== undefined) {
    if (typeof conditionalRefetchInterval === "number") {
      (queries as any).refetchInterval = (_data: unknown, query: any) => (query?.state?.error ? false : conditionalRefetchInterval);
    } else {
      (queries as any).refetchInterval = conditionalRefetchInterval;
    }
  }
  const mutations: DefaultOptions["mutations"] = { ...DEFAULT_MUTATION_CONFIG };
  const result: DefaultOptions = {
    queries: { ...(queries as any), ...(overrides?.queries as any || {}) },
    mutations: { ...(mutations as any), ...(overrides?.mutations as any || {}) }
  };
  return result;
}
