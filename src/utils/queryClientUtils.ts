import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface BatchTask {
  queryKey: QueryKey;
  data?: any;
  exact?: boolean;
}

export function invalidateQueriesBatch(queryClient: QueryClient, tasks: BatchTask[] | QueryKey[]) {
  tasks.forEach(task => {
    if (Array.isArray(task) || typeof task === 'string') {
       queryClient.invalidateQueries({ queryKey: task as QueryKey });
    } else {
       queryClient.invalidateQueries(task as any);
    }
  });
}

export function cancelQueriesBatch(queryClient: QueryClient, tasks: BatchTask[] | QueryKey[]) {
  tasks.forEach(task => {
     if (Array.isArray(task) || typeof task === 'string') {
       queryClient.cancelQueries({ queryKey: task as QueryKey });
    } else {
       queryClient.cancelQueries(task as any);
    }
  });
}

export function setQueryDataBatch(queryClient: QueryClient, tasks: { queryKey: QueryKey; data: any }[]) {
  tasks.forEach(task => queryClient.setQueryData(task.queryKey, task.data));
}
