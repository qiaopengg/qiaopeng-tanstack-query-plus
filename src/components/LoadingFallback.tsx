export function DefaultLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}
export function TextSkeletonFallback({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-input rounded w-3/4 mb-2" />
          <div className="h-4 bg-input rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
export function CardSkeletonFallback() {
  return (
    <div className="border border-border rounded-lg p-4 animate-pulse bg-card">
      <div className="h-6 bg-input rounded w-1/2 mb-4" />
      <div className="space-y-2">
        <div className="h-4 bg-input rounded" />
        <div className="h-4 bg-input rounded w-5/6" />
        <div className="h-4 bg-input rounded w-4/6" />
      </div>
    </div>
  );
}
export function ListSkeletonFallback({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 animate-pulse">
          <div className="w-12 h-12 bg-input rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-input rounded w-3/4" />
            <div className="h-3 bg-input rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
export function PageSkeletonFallback() {
  return (
    <div className="w-full p-6 space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-input rounded w-1/3 mb-2" />
        <div className="h-4 bg-input rounded w-1/2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <CardSkeletonFallback />
          <CardSkeletonFallback />
        </div>
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4 animate-pulse bg-card">
            <div className="h-4 bg-input rounded w-2/3 mb-3" />
            <div className="space-y-2">
              <div className="h-3 bg-input rounded" />
              <div className="h-3 bg-input rounded w-5/6" />
              <div className="h-3 bg-input rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export function SmallLoadingIndicator({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3"
  } as const;
  return <div className={`${sizeClasses[size]} border-primary/20 border-t-primary rounded-full animate-spin`} />;
}
export function FullScreenLoading({ message = "加载中..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-lg text-foreground">{message}</p>
      </div>
    </div>
  );
}