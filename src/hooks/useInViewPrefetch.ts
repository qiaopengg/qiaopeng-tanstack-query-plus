import type { QueryFunction, QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { DEFAULT_STALE_TIME } from "../core/config.js";

export interface InViewPrefetchOptions { threshold?: number; rootMargin?: string; triggerOnce?: boolean; enabled?: boolean; staleTime?: number }

export function useInViewPrefetch<TData = unknown>(queryKey: QueryKey, queryFn: QueryFunction<TData>, options: InViewPrefetchOptions = {}) {
  const queryClient = useQueryClient();
  const { threshold = 0.1, rootMargin = "50px", triggerOnce = true, enabled = true, staleTime = DEFAULT_STALE_TIME } = options;
  const [ref, inView] = useInView({ threshold, rootMargin, triggerOnce });
  const queryFnRef = useRef(queryFn);
  useEffect(() => { queryFnRef.current = queryFn; }, [queryFn]);
  const stableQueryKey = useRef(queryKey);
  useEffect(() => { if (JSON.stringify(stableQueryKey.current) !== JSON.stringify(queryKey)) { stableQueryKey.current = queryKey; } }, [queryKey]);
  useEffect(() => {
    if (inView && enabled) {
      queryClient.prefetchQuery({ queryKey: stableQueryKey.current, queryFn: queryFnRef.current, staleTime });
    }
  }, [inView, queryClient, enabled, staleTime]);
  return ref;
}