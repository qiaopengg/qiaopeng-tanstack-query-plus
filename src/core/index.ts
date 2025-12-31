export {
  createCustomConfig,
  DEFAULT_GC_TIME,
  DEFAULT_MUTATION_CONFIG,
  DEFAULT_QUERY_CONFIG,
  DEFAULT_STALE_TIME,
  defaultMutationRetryStrategy,
  defaultQueryRetryStrategy,
  DEVELOPMENT_CONFIG,
  ensureBestPractices,
  exponentialBackoff,
  getConfigByEnvironment,
  GLOBAL_QUERY_CONFIG,
  LONG_CACHE_CONFIG,
  PRODUCTION_CONFIG,
  REALTIME_CONFIG,
  createErrorSafeConfig,
  createSafeRetryStrategy,
  SMART_RETRY_MUTATION_CONFIG,
  TIME_CONSTANTS,
  validateConfig,
  validateGcTime
} from "./config.js";
export { createDevToolsConfig, defaultDevToolsConfig, type DevToolsConfig, isDevToolsEnabled } from "./devtools.js";
export { ReactQueryDevtools } from "./devtools.js";
export { isDev, isProd, isTest } from "./env.js";
export {
  focusManager,
  type FocusManagerConfig,
  getSmartFocusManager,
  pauseFocusManager,
  resetSmartFocusManager,
  resumeFocusManager,
  setupFocusManager,
  SmartFocusManager
} from "./focusManager.js";
export {
  areKeysEqual,
  containsEntity,
  createComplexKey,
  createDomainKeyFactory,
  createFilteredKey,
  createMutationKeyFactory,
  createPaginatedKey,
  createSearchKey,
  createSortedKey,
  extractEntityId,
  matchesKeyPattern,
  normalizeQueryKey,
  queryKeys,
  validateQueryKey
} from "./keys.js";
export { createAppQueryOptions, createAppQueryOptionsWithSelect } from "./queryOptions.js";
export { createListQueryOptions, type ListQueryConfig } from "./queryOptions.js";
