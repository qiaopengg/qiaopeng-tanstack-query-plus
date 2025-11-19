import type { InfiniteData, QueryKey, UseSuspenseInfiniteQueryOptions, UseSuspenseInfiniteQueryResult, UseSuspenseQueryOptions, UseSuspenseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
export interface EnhancedSuspenseQueryOptions<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> extends Omit<UseSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey" | "queryFn"> { enableAutoRefresh?: boolean; refreshInterval?: number }
export interface EnhancedSuspenseInfiniteQueryOptions<TQueryFnData = unknown, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> extends Omit<UseSuspenseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, "queryKey" | "queryFn"> { enableAutoRefresh?: boolean; refreshInterval?: number }
export type SuspenseQueryFunction<TQueryFnData = unknown, TQueryKey extends QueryKey = QueryKey> = (context: { queryKey: TQueryKey; signal: AbortSignal }) => Promise<TQueryFnData>;
export type SuspenseInfiniteQueryFunction<TQueryFnData = unknown, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> = (context: { queryKey: TQueryKey; signal: AbortSignal; pageParam: TPageParam }) => Promise<TQueryFnData>;
export type EnhancedSuspenseQueryResult<TData = unknown, TError = Error> = UseSuspenseQueryResult<TData, TError>;
export type EnhancedSuspenseInfiniteQueryResult<TData = unknown, TError = Error> = UseSuspenseInfiniteQueryResult<InfiniteData<TData>, TError>;
export interface SuspenseWrapperProps { children: ReactNode; fallback?: ReactNode; errorFallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode; onError?: (error: Error, errorInfo: { componentStack: string }) => void; resetKeys?: Array<string | number> }
export interface ErrorBoundaryProps { children: ReactNode; fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode; onError?: (error: Error, errorInfo: { componentStack: string }) => void; onReset?: () => void; resetKeys?: Array<string | number> }
export interface ErrorBoundaryState { hasError: boolean; error?: Error }
export interface LoadingFallbackProps { message?: string; size?: "small" | "medium" | "large"; className?: string }
export interface ErrorFallbackProps { error: Error; resetErrorBoundary: () => void; className?: string }
export interface SuspenseConfig { defaultStaleTime?: number; defaultGcTime?: number; defaultRetry?: number | boolean; enableDevtools?: boolean }
export type QueryStatus = "pending" | "error" | "success";
export interface QueryMetadata { queryKey: QueryKey; status: QueryStatus; lastUpdated?: Date; errorCount?: number }