import type { QueryKey } from "@tanstack/react-query";
import { focusManager } from "@tanstack/react-query";
export { focusManager };

export interface FocusManagerConfig {
  enabled?: boolean;
  customEventListener?: (handleFocus: () => void) => () => void;
  refetchOnWindowFocus?: boolean;
}

export function setupFocusManager(config: FocusManagerConfig = {}) {
  const { enabled = true, customEventListener } = config;
  if (!enabled) {
    focusManager.setEventListener(() => () => {});
    focusManager.setFocused(false);
    return;
  }
  if (customEventListener) {
    focusManager.setEventListener(customEventListener);
  } else {
    focusManager.setEventListener((handleFocus) => {
      if (typeof window === "undefined" || !window.addEventListener) {
        return () => {};
      }
      const handleVisibilityChange = () => {
        handleFocus();
      };
      const handleWindowFocus = () => handleFocus();
      window.addEventListener("visibilitychange", handleVisibilityChange, false);
      window.addEventListener("focus", handleWindowFocus, false);
      return () => {
        window.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleWindowFocus);
      };
    });
  }
}

export function pauseFocusManager() {
  focusManager.setFocused(false);
}

export function resumeFocusManager() {
  const isVisible = typeof document !== "undefined" ? !document.hidden : true;
  focusManager.setFocused(isVisible);
}

export class SmartFocusManager {
  private pauseCount = 0;
  private originalFocusState: boolean | undefined;
  private refetchHistory: Map<string, number> = new Map();
  private serializeKey(queryKey: QueryKey): string {
    try {
      return JSON.stringify(queryKey);
    } catch {
      return Array.isArray(queryKey)
        ? queryKey
            .map((v) => {
              try {
                return JSON.stringify(v);
              } catch {
                return String(v);
              }
            })
            .join("|")
        : String(queryKey);
    }
  }
  pause(): void {
    if (this.pauseCount === 0) {
      this.originalFocusState = focusManager.isFocused();
      focusManager.setFocused(false);
    }
    this.pauseCount++;
  }
  resume(): void {
    if (this.pauseCount > 0) {
      this.pauseCount--;
      if (this.pauseCount === 0) {
        focusManager.setFocused(this.originalFocusState);
      }
    }
  }
  reset(): void {
    if (this.pauseCount > 0) {
      this.pauseCount = 0;
      focusManager.setFocused(this.originalFocusState);
      this.originalFocusState = undefined;
    }
  }
  destroy(): void {
    this.reset();
    this.clearHistory();
  }
  shouldRefetch(queryKey: QueryKey, minInterval: number = 5000): boolean {
    const key = this.serializeKey(queryKey);
    const lastRefetchTime = this.refetchHistory.has(key) ? this.refetchHistory.get(key)! : -Infinity;
    const now = Date.now();
    if (now - lastRefetchTime < minInterval) {
      return false;
    }
    this.refetchHistory.set(key, now);
    return true;
  }
  clearHistory(): void {
    this.refetchHistory.clear();
  }
  clearHistoryByKey(queryKey: QueryKey): void {
    const key = this.serializeKey(queryKey);
    this.refetchHistory.delete(key);
  }
  getLastRefetchTime(queryKey: QueryKey): number | undefined {
    const key = this.serializeKey(queryKey);
    return this.refetchHistory.get(key);
  }
  getStats(): { isPaused: boolean; pauseCount: number; isFocused: boolean } {
    return { isPaused: this.pauseCount > 0, pauseCount: this.pauseCount, isFocused: focusManager.isFocused() };
  }
}

let smartFocusManagerInstance: SmartFocusManager | null = null;
export function getSmartFocusManager(): SmartFocusManager {
  if (!smartFocusManagerInstance) {
    smartFocusManagerInstance = new SmartFocusManager();
  }
  return smartFocusManagerInstance;
}
export function resetSmartFocusManager(): void {
  smartFocusManagerInstance = null;
}