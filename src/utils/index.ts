export { createFieldEnricher, createOptimisticBase, createTempId, type FieldMappingConfig } from "./fieldMapper.js";
export { getNetworkInfo, getNetworkSpeed, isFastNetwork, isSlowNetwork, type NavigatorWithConnection } from "./network.js";
export { batchRemoveItems, batchUpdateItems, conditionalUpdateItems, createAddItemConfig, createListOperationConfig, createRemoveItemConfig, createUpdateItemConfig, type ListOperationVariables, listUpdater, reorderItems } from "./optimisticUtils.js";
export { keepPreviousData } from "./placeholderData.js";
export { getPrefetchManager, type InteractionRecord, type NetworkSpeed, type PredictionResult, type PrefetchConfig, type PrefetchStats, type PrefetchTask, resetPrefetchManager, SmartPrefetchManager } from "./prefetchManager.js";
export { createQueryKeyFactory, createSimpleQueryKeyFactory, extractParamsFromKey, isQueryKeyEqual, type NormalizeConfig, normalizeQueryParams, type QueryKeyFactory, type QueryKeyFactoryConfig } from "./queryKey.js";
export { compose, selectById, selectByIds, selectCount, selectField, selectFields, selectFirst, selectItems, selectLast, selectMap, selectors, selectTotal, selectWhere } from "./selectors.js";
export { deepClone, formatBytes, getStorageUsage, isStorageAvailable } from "./storage.js";
export { findFamilyQueries, syncEntityAcrossFamily, type FamilyQueryMatchOptions } from "./consistency.js";
