# Bug Report: Optimistic Updates Cause Data Inconsistency Across Pagination States

## Overview
We are experiencing a data inconsistency issue when using the `useMutation` hook from `@qiaopeng/tanstack-query-plus` in a paginated list scenario. When an item is updated using the optimistic update feature, the cache is only updated for the *current* pagination state (specific page and page size). If the user subsequently changes the page size or navigates to a different page where the same item should appear, the UI reverts to showing stale (old) data.

## Environment
- **Package**: `@qiaopeng/tanstack-query-plus`
- **Version**: `0.2.6` (as seen in `package.json`)
- **Framework**: React / TanStack Query v5

## Reproduction Steps

1.  **Initial State**:
    - User visits the "Indicator Management" list page.
    - Default pagination: `page: 1`, `pageSize: 20`.
    - Query Key generated: `['indicators', 'list', { page: 1, pageSize: 20, ... }]`.
    - Data is loaded and displayed correctly.

2.  **Action**:
    - User edits an item (e.g., changing a name or status) on this page.
    - `useUpdateMutation` is triggered with an `optimistic` configuration.
    - The optimistic updater modifies the cache for `['indicators', 'list', { page: 1, pageSize: 20, ... }]`.
    - **Result**: The UI correctly reflects the new data immediately.

3.  **The Bug**:
    - User changes the "Rows per page" from `20` to `50`.
    - New Query Key generated: `['indicators', 'list', { page: 1, pageSize: 50, ... }]`.
    - **Observation**: The list re-renders, but the item that was just edited shows its **old value**.
    - **Reason**: The cache for the `{ pageSize: 50 }` key was not touched by the optimistic updater, nor was it invalidated to force a refetch.

4.  **Verification**:
    - User switches back to `pageSize: 20`.
    - The item shows the **new value** again (because the `{ pageSize: 20 }` cache was updated).

## Root Cause Analysis

The issue lies in the specificity of the `optimistic.queryKey` configuration in `useMutation`.

In our implementation (and the library's design), the optimistic update is targeted at a single, specific Query Key:

```typescript
// src/pages/indicator-management/api/form.ts
export function useUpdateMutation(params?: IIndicatorQueryParams) {
  // params includes current pageSize (e.g., 20)
  return useMutation({
    // ...
    optimistic: {
      // This strictly targets the CURRENT view's cache
      queryKey: indicatorKeys.list(queryParams), 
      updater: (oldData, newItem) => { ... }
    }
  });
}
```

When the `pageSize` changes, the application requests a completely different Query Key. Since the library's `OptimisticUpdateConfig` only accepts a single `queryKey` and performs no broader invalidation by default, other variants of the list (different page sizes, sorted views, etc.) remain stale.

## Impact
This bug degrades trust in the application's data integrity. Users may believe their changes were lost or not saved when they adjust view settings immediately after an edit.
