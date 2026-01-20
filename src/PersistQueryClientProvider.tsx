import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider as TanStackPersistProvider } from "@tanstack/react-query-persist-client";
import { useEffect, useMemo, useState } from "react";
import { TIME_CONSTANTS } from "./core/config.js";
import { isOnline, setupOnlineManager, subscribeToOnlineStatus } from "./features/offline.js";
import { clearCache, createPersister } from "./features/persistence.js";

export interface PersistQueryClientProviderProps {
  children: ReactNode;
  client: QueryClient;
  cacheKey?: string;
  enablePersistence?: boolean;
  enableOfflineSupport?: boolean;
  onPersistError?: (error: Error) => void;
  onPersistRestore?: () => void;
}

export function PersistQueryClientProvider({
  children,
  client,
  cacheKey = "tanstack-query-cache",
  enablePersistence = true,
  enableOfflineSupport = true,
  onPersistError: _onPersistError,
  onPersistRestore
}: PersistQueryClientProviderProps) {
  useEffect(() => {
    if (enableOfflineSupport) {
      setupOnlineManager();
    }
  }, [enableOfflineSupport]);

  const persister = useMemo(() => {
    if (!enablePersistence) return null;
    return createPersister(cacheKey, undefined, _onPersistError);
  }, [cacheKey, enablePersistence, _onPersistError]);

  const persistOptions = useMemo(() => {
    if (!persister) return null;
    return {
      persister,
      maxAge: TIME_CONSTANTS.ONE_DAY
    };
  }, [persister]);

  if (enablePersistence) {
    if (!persistOptions) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    return (
      <TanStackPersistProvider
        client={client}
        persistOptions={persistOptions}
        onSuccess={onPersistRestore}
      >
        {children}
      </TanStackPersistProvider>
    );
  }
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function usePersistenceStatus() {
  const [online, setOnline] = useState(isOnline());
  useEffect(() => {
    return subscribeToOnlineStatus(setOnline);
  }, []);
  return {
    isOnline: online,
    isOffline: !online
  };
}

export function usePersistenceManager() {
  const clearPersistenceCache = (cacheKey = "tanstack-query-cache") => {
    clearCache(cacheKey);
  };
  const getOnlineStatus = () => {
    return isOnline();
  };
  return {
    clearCache: clearPersistenceCache,
    getOnlineStatus
  };
}

export default PersistQueryClientProvider;
