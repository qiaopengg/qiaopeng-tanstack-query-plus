# Recommended Fixes for Optimistic Update Inconsistency

To resolve the issue where optimistic updates do not propagate to related cache entries (e.g., different pagination states), we propose the following enhancements to the `@qiaopeng/tanstack-query-plus` library.

## Proposal A: Add `invalidates` Option (Recommended)

The most robust and standard way to handle this in TanStack Query is to invalidate related queries upon mutation settlement (success or error). This forces the application to refetch fresh data when the user switches views (like changing page size), ensuring consistency.

**Proposed API Change:**
Extend the `OptimisticUpdateConfig` or the main `MutationOptions` to accept an `invalidates` array.

```typescript
// Type Definition
interface MutationOptions<...> {
  // ... existing options
  optimistic?: {
    queryKey: QueryKey; // Target for immediate UI update
    updater: ...;
    
    // NEW: Keys to invalidate after the mutation settles (onSuccess/onSettled)
    invalidates?: QueryKey[]; 
    // OR support fuzzy matching patterns
    invalidateTags?: string[]; 
  }
}
```

**Usage Example:**

```typescript
useMutation({
  mutationFn: updateIndicator,
  optimistic: {
    queryKey: indicatorKeys.list(currentParams), // Optimistically update CURRENT view
    updater: ...,
    // Invalidate ALL list variants so they refetch on next access
    invalidates: [['indicators', 'list']] 
  }
});
```

**Library Implementation Logic:**
Inside the library's `useMutation` wrapper:
1. Perform the optimistic update on `queryKey`.
2. On `onSettled` (or `onSuccess`), call `queryClient.invalidateQueries({ queryKey: k })` for each key in `invalidates`.

## Proposal B: Support Fuzzy/Multiple Query Keys in Optimistic Config

Allow `optimistic.queryKey` to accept an array of keys or a filter function, applying the `updater` to all matching cache entries.

**Proposed API Change:**

```typescript
interface OptimisticUpdateConfig {
  // Change from QueryKey to QueryKey | QueryKey[] | QueryFilter
  queryKey: QueryKey | QueryKey[]; 
  // ...
}
```

**Pros:**
- Keeps all cached views (e.g., Page 1, Page 2, Page Size 20, Page Size 50) in sync without refetching.

**Cons:**
- Complex to implement correctly.
- Finding the specific item to update in different list structures (e.g., different sorts) can be difficult and error-prone.
- "Proposal A" is generally safer and follows the "stale-while-revalidate" philosophy better.

## Proposal C: User-Land Workaround (Immediate Fix)

Until the library is updated, we recommend consumers of the library manually handle invalidation using the `onSuccess` callback provided by TanStack Query.

**Example:**

```typescript
const queryClient = useQueryClient();

return useMutation({
  // ...
  onSuccess: (data, variables, context) => {
    // Manually invalidate the root list key to mark all pagination states as stale
    queryClient.invalidateQueries({ 
      queryKey: ['indicators', 'list'] 
    });
  }
});
```

**Note:** This does not solve the library's limitation but provides an immediate path to data consistency for the application.
