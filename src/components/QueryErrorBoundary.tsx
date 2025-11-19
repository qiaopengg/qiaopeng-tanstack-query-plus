import type { ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "./internal/ErrorBoundary.js";

export interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetErrorBoundary: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  resetKeys?: Array<string | number>;
}

export function QueryErrorBoundary({ children, fallback, onError, resetKeys, ...props }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary fallback={fallback || QueryErrorFallback} onError={onError} onReset={reset} resetKeys={resetKeys} {...props}>
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

export function QueryErrorFallback(error: Error, resetErrorBoundary: () => void) {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">查询失败</h3>
        <p className="text-sm text-muted-foreground mb-4">{error.message || "数据加载失败，请稍后重试"}</p>
        <div className="space-x-2">
          <button onClick={resetErrorBoundary} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
            重新加载
          </button>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-muted text-foreground rounded-md">
            刷新页面
          </button>
        </div>
      </div>
    </div>
  );
}