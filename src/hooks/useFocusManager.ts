import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { focusManager, getSmartFocusManager, pauseFocusManager, resumeFocusManager } from "../core/focusManager.js";

export interface UseFocusRefetchOptions { enabled?: boolean; minInterval?: number; queryKeys?: QueryKey[] }
export interface UsePauseFocusOptions { autoPause?: boolean; pauseWhen?: boolean }

export function useFocusState(): boolean {
  const [focused, setFocused] = useState(focusManager.isFocused());
  useEffect(() => {
    const unsubscribe = focusManager.subscribe((isFocused) => { setFocused(isFocused); });
    return unsubscribe;
  }, []);
  return focused;
}

export function useFocusRefetch(options: UseFocusRefetchOptions = {}) {
  const queryClient = useQueryClient();
  const { enabled = true, minInterval = 5000, queryKeys = [] } = options;
  const smartManager = getSmartFocusManager();
  const queryKeysJson = JSON.stringify(queryKeys);
  const stableQueryKeys = useMemo(() => queryKeys, [queryKeysJson]);
  useEffect(() => {
    if (!enabled || stableQueryKeys.length === 0) return;
    const unsubscribe = focusManager.subscribe((isFocused) => {
      if (!isFocused) return;
      stableQueryKeys.forEach((queryKey) => {
        if (smartManager.shouldRefetch(queryKey, minInterval)) {
          queryClient.invalidateQueries({ queryKey });
        }
      });
    });
    return unsubscribe;
  }, [queryClient, enabled, minInterval, stableQueryKeys, smartManager]);
}

export function usePauseFocus(options: UsePauseFocusOptions = {}) {
  const { autoPause = false, pauseWhen = false } = options;
  useEffect(() => {
    if (autoPause || pauseWhen) {
      pauseFocusManager();
      return () => { resumeFocusManager(); };
    }
  }, [autoPause, pauseWhen]);
  const pause = useCallback(() => { pauseFocusManager(); }, []);
  const resume = useCallback(() => { resumeFocusManager(); }, []);
  return { pause, resume };
}

export function useSmartFocusManager() {
  const manager = getSmartFocusManager();
  const pause = useCallback(() => { manager.pause(); }, [manager]);
  const resume = useCallback(() => { manager.resume(); }, [manager]);
  const getStats = useCallback(() => { return manager.getStats(); }, [manager]);
  return { pause, resume, getStats, stats: manager.getStats() };
}

export function useConditionalFocusRefetch(queryKey: QueryKey, condition: () => boolean, options: { minInterval?: number; enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { minInterval = 5000, enabled = true } = options;
  const smartManager = getSmartFocusManager();
  const queryKeyJson = JSON.stringify(queryKey);
  const stableQueryKey = useMemo(() => queryKey, [queryKeyJson]);
  const conditionRef = useRef(condition);
  useEffect(() => { conditionRef.current = condition; }, [condition]);
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = focusManager.subscribe((isFocused) => {
      if (!isFocused || !conditionRef.current()) return;
      if (smartManager.shouldRefetch(stableQueryKey, minInterval)) {
        queryClient.invalidateQueries({ queryKey: stableQueryKey });
      }
    });
    return unsubscribe;
  }, [queryClient, stableQueryKey, minInterval, enabled, smartManager]);
}

export function useFocusCallback(callback: () => void, options: { minInterval?: number; enabled?: boolean; queryKey?: QueryKey } = {}) {
  const { minInterval = 0, enabled = true, queryKey } = options;
  const lastCallTime = useRef<number>(0);
  const smartManager = getSmartFocusManager();
  const queryKeyJson = JSON.stringify(queryKey);
  const stableQueryKey = useMemo(() => queryKey, [queryKeyJson]);
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);
  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = focusManager.subscribe((isFocused) => {
      if (!isFocused) return;
      if (stableQueryKey !== undefined) {
        if (smartManager.shouldRefetch(stableQueryKey, minInterval)) {
          callbackRef.current();
        }
        return;
      }
      const now = Date.now();
      if (minInterval > 0 && now - lastCallTime.current < minInterval) return;
      lastCallTime.current = now;
      callbackRef.current();
    });
    return unsubscribe;
  }, [minInterval, enabled, stableQueryKey, smartManager]);
}

export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(typeof document !== "undefined" ? !document.hidden : true);
  useEffect(() => {
    const unsubscribe = focusManager.subscribe((isFocused) => { setIsVisible(isFocused); });
    return unsubscribe;
  }, []);
  return isVisible;
}