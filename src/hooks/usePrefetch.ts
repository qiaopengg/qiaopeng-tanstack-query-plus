import type { QueryFunction, QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_STALE_TIME } from "../core/config.js";
import { isSlowNetwork } from "../utils/network.js";

export interface PrefetchOptions { delay?: number; enabled?: boolean; staleTime?: number; minInterval?: number }
export interface HoverPrefetchOptions extends PrefetchOptions { hoverDelay?: number }
export interface InViewPrefetchOptions extends PrefetchOptions { threshold?: number; rootMargin?: string; triggerOnce?: boolean }

function isMissingOrStale(queryClient: ReturnType<typeof useQueryClient>, queryKey: QueryKey, staleTime: number): boolean {
  const state = queryClient.getQueryState(queryKey);
  if (!state || state.data === undefined) return true;
  const updatedAt = state.dataUpdatedAt ?? 0;
  return Date.now() - updatedAt > staleTime;
}

export function useHoverPrefetch<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, options: HoverPrefetchOptions = {}) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const { hoverDelay = 200, enabled = true, staleTime = DEFAULT_STALE_TIME, minInterval = 1000 } = options;
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; }, [queryFn]);
  const lastPrefetchRef = useRef(new Map<string, number>());
  const prefetch = useCallback(() => {
    if (!enabled) return;
    const keyStr = JSON.stringify(queryKey);
    const last = lastPrefetchRef.current.get(keyStr) ?? 0;
    if (Date.now() - last < minInterval) return;
    if (!isMissingOrStale(queryClient, queryKey, staleTime)) return;
    queryClient.prefetchQuery({ queryKey, queryFn: queryFnRef.current, staleTime });
    lastPrefetchRef.current.set(keyStr, Date.now());
  }, [queryClient, queryKey, enabled, staleTime]);
  const handleMouseEnter = useCallback(() => {
    if (!enabled) return;
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); }
    timeoutRef.current = setTimeout(prefetch, hoverDelay);
  }, [prefetch, hoverDelay, enabled]);
  const handleMouseLeave = useCallback(() => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); } }, []);
  useEffect(() => () => { if (timeoutRef.current) { clearTimeout(timeoutRef.current); } }, []);
  return { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onFocus: prefetch };
}


export function useRoutePrefetch() {
  const queryClient = useQueryClient();
  const lastPrefetchRef = useRef(new Map<string, number>());
  return useCallback(<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, options?: PrefetchOptions) => {
    const { enabled = true, staleTime = DEFAULT_STALE_TIME, minInterval = 1000 } = options || {};
    if (!enabled) return;
    const keyStr = JSON.stringify(queryKey);
    const last = lastPrefetchRef.current.get(keyStr) ?? 0;
    if (Date.now() - last < minInterval) return;
    if (!isMissingOrStale(queryClient, queryKey, staleTime)) return;
    queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
    lastPrefetchRef.current.set(keyStr, Date.now());
  }, [queryClient]);
}

export function useBatchPrefetch() {
  const queryClient = useQueryClient();
  return useCallback(<TData = unknown>(queries: Array<{ queryKey: QueryKey; queryFn: QueryFunction<TData>; staleTime?: number }>) => {
    queries.forEach(({ queryKey, queryFn, staleTime = DEFAULT_STALE_TIME }) => {
      if (isMissingOrStale(queryClient, queryKey, staleTime)) {
        queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
      }
    });
  }, [queryClient]);
}

export function useSmartPrefetch() {
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(new Set<string>());
  const lastPrefetchRef = useRef(new Map<string, number>());
  const shouldPrefetchQuery = useCallback((queryKey: QueryKey): boolean => {
    const key = JSON.stringify(queryKey);
    if (prefetchedRef.current.has(key)) return false;
    if (isSlowNetwork()) return false;
    return true;
  }, []);
  const prefetch = useCallback(<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, options?: PrefetchOptions) => {
    if (!shouldPrefetchQuery(queryKey)) return;
    const { staleTime = DEFAULT_STALE_TIME, minInterval = 1000 } = options || {};
    const keyStr = JSON.stringify(queryKey);
    const last = lastPrefetchRef.current.get(keyStr) ?? 0;
    if (Date.now() - last < minInterval) return;
    if (!isMissingOrStale(queryClient, queryKey, staleTime)) return;
    prefetchedRef.current.add(keyStr);
    queryClient.prefetchQuery({ queryKey, queryFn, staleTime });
    lastPrefetchRef.current.set(keyStr, Date.now());
  }, [queryClient, shouldPrefetchQuery]);
  const clearPrefetchHistory = useCallback(() => { prefetchedRef.current.clear(); }, []);
  return { prefetch, shouldPrefetch: !isSlowNetwork(), clearPrefetchHistory };
}

export function useConditionalPrefetch<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, condition: boolean, options?: PrefetchOptions) {
  const queryClient = useQueryClient();
  const { staleTime = DEFAULT_STALE_TIME, delay = 0 } = options || {};
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; }, [queryFn]);
  const stableQueryKey = useRef(queryKey);
  useEffect(() => { if (JSON.stringify(stableQueryKey.current) !== JSON.stringify(queryKey)) { stableQueryKey.current = queryKey; } }, [queryKey]);
  useEffect(() => {
    if (!condition) return;
    const timeoutId = setTimeout(() => {
      if (isMissingOrStale(queryClient, stableQueryKey.current, staleTime)) {
        queryClient.prefetchQuery({ queryKey: stableQueryKey.current, queryFn: queryFnRef.current, staleTime });
      }
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [condition, queryClient, staleTime, delay]);
}

export function useIdlePrefetch<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, options?: PrefetchOptions & { timeout?: number }) {
  const queryClient = useQueryClient();
  const { staleTime = DEFAULT_STALE_TIME, enabled = true, timeout = 1000 } = options || {};
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; }, [queryFn]);
  const stableQueryKey = useRef(queryKey);
  useEffect(() => { if (JSON.stringify(stableQueryKey.current) !== JSON.stringify(queryKey)) { stableQueryKey.current = queryKey; } }, [queryKey]);
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined" || !("requestIdleCallback" in window)) {
      const timeoutId = setTimeout(() => {
        if (isMissingOrStale(queryClient, stableQueryKey.current, staleTime)) {
          queryClient.prefetchQuery({ queryKey: stableQueryKey.current, queryFn: queryFnRef.current, staleTime });
        }
      }, timeout);
      return () => clearTimeout(timeoutId);
    }
    const idleCallbackId = (window as any).requestIdleCallback(() => {
      if (isMissingOrStale(queryClient, stableQueryKey.current, staleTime)) {
        queryClient.prefetchQuery({ queryKey: stableQueryKey.current, queryFn: queryFnRef.current, staleTime });
      }
    }, { timeout });
    return () => (window as any).cancelIdleCallback(idleCallbackId);
  }, [queryClient, staleTime, enabled, timeout]);
}

export function usePeriodicPrefetch<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, options?: PrefetchOptions & { interval?: number }) {
  const queryClient = useQueryClient();
  const { staleTime = DEFAULT_STALE_TIME, enabled = true, interval = 60000 } = options || {};
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; }, [queryFn]);
  const stableQueryKey = useRef(queryKey);
  useEffect(() => { if (JSON.stringify(stableQueryKey.current) !== JSON.stringify(queryKey)) { stableQueryKey.current = queryKey; } }, [queryKey]);
  useEffect(() => {
    if (!enabled) return;
    const prefetchData = () => {
      if (isMissingOrStale(queryClient, stableQueryKey.current, staleTime)) {
        queryClient.prefetchQuery({ queryKey: stableQueryKey.current, queryFn: queryFnRef.current, staleTime });
      }
    };
    prefetchData();
    const intervalId = setInterval(prefetchData, interval);
    return () => clearInterval(intervalId);
  }, [queryClient, staleTime, enabled, interval]);
}

export function usePredictivePrefetch() {
  const queryClient = useQueryClient();
  const interactionHistoryRef = useRef<Array<{ action: string; target: string; timestamp: number }>>([]);
  const maxHistorySize = 50;
  const recordInteraction = useCallback((action: string, target: string) => {
    interactionHistoryRef.current.push({ action, target, timestamp: Date.now() });
    if (interactionHistoryRef.current.length > maxHistorySize) {
      interactionHistoryRef.current.shift();
    }
  }, []);
  const getPredictions = useCallback(() => {
    const history = interactionHistoryRef.current;
    if (history.length < 3) return [];
    const targetCounts = new Map<string, number>();
    history.forEach(({ target }) => { targetCounts.set(target, (targetCounts.get(target) || 0) + 1); });
    return Array.from(targetCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([target]) => target);
  }, []);
  const prefetchPredicted = useCallback(<TData = unknown>(getQueryConfig: (target: string) => { queryKey: QueryKey; queryFn: QueryFunction<TData> }) => {
    const predictions = getPredictions();
    predictions.forEach((target) => {
      const { queryKey, queryFn } = getQueryConfig(target);
      queryClient.prefetchQuery({ queryKey, queryFn });
    });
  }, [queryClient, getPredictions]);
  const clearHistory = useCallback(() => { interactionHistoryRef.current = []; }, []);
  return { recordInteraction, getPredictions, prefetchPredicted, clearHistory };
}

export function usePriorityPrefetch() {
  const queryClient = useQueryClient();
  const tasksRef = useRef<Array<{ queryKey: QueryKey; queryFn: QueryFunction<any>; priority: "high" | "medium" | "low"; timestamp: number }>>([]);
  const [taskCount, setTaskCount] = useState(0);
  const addPrefetchTask = useCallback(<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, priority: "high" | "medium" | "low" = "medium") => {
    tasksRef.current.push({ queryKey, queryFn, priority, timestamp: Date.now() });
    setTaskCount(tasksRef.current.length);
  }, []);
  const processTasks = useCallback(async () => {
    const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
    const sortedTasks = [...tasksRef.current].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
    for (const task of sortedTasks) {
      await queryClient.prefetchQuery({ queryKey: task.queryKey, queryFn: task.queryFn });
    }
    tasksRef.current = [];
    setTaskCount(0);
  }, [queryClient]);
  const clearTasks = useCallback(() => { tasksRef.current = []; setTaskCount(0); }, []);
  return { addPrefetchTask, processTasks, clearTasks, taskCount };
}