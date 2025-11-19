import type { ReactNode } from "react";
import { Suspense } from "react";
import { QueryErrorBoundary } from "./QueryErrorBoundary.js";

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  resetKeys?: Array<string | number>;
}

export function SuspenseWrapper({ children, fallback = <div>Loading...</div>, errorFallback, onError, resetKeys }: SuspenseWrapperProps) {
  return (
    <QueryErrorBoundary fallback={errorFallback} onError={onError} resetKeys={resetKeys}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </QueryErrorBoundary>
  );
}

export function QuerySuspenseWrapper({ children, fallback = <div>Loading query...</div>, errorFallback, onError, resetKeys }: SuspenseWrapperProps) {
  return (
    <SuspenseWrapper fallback={fallback} errorFallback={errorFallback} onError={onError} resetKeys={resetKeys}>
      {children}
    </SuspenseWrapper>
  );
}

export type { SuspenseWrapperProps };