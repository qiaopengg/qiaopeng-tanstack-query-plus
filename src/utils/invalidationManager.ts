import { QueryClient } from "@tanstack/react-query";

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function getTaskKey(task: any): string {
  // Serialize the task to identify duplicates.
  // We mainly care about queryKey and exact/refetchType properties.
  return JSON.stringify(task);
}

export function scheduleInvalidations(queryClient: QueryClient, tasks: any[], delay: number) {
  tasks.forEach(task => {
    const key = getTaskKey(task);
    
    if (timers.has(key)) {
      clearTimeout(timers.get(key));
    }

    const timer = setTimeout(() => {
      queryClient.invalidateQueries(task);
      timers.delete(key);
    }, delay);

    timers.set(key, timer);
  });
}

export function cancelScheduledInvalidations(tasks: any[]) {
  tasks.forEach(task => {
    const key = getTaskKey(task);
    if (timers.has(key)) {
      clearTimeout(timers.get(key));
      timers.delete(key);
    }
  });
}
