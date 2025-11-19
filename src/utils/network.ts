import type { NetworkInformation } from "../types/base";
export interface NavigatorWithConnection extends Navigator { connection?: NetworkInformation }
function hasConnectionAPI(nav: Navigator): nav is NavigatorWithConnection { return "connection" in nav }
export function isSlowNetwork(): boolean {
  if (typeof navigator === "undefined") { return false; }
  if (!hasConnectionAPI(navigator)) { return false; }
  const connection = navigator.connection;
  if (!connection) { return false; }
  return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g" || connection.saveData === true;
}
export function getNetworkInfo(): NetworkInformation | null {
  if (typeof navigator === "undefined") { return null; }
  if (!hasConnectionAPI(navigator)) { return null; }
  return navigator.connection || null;
}
export function isFastNetwork(): boolean {
  const networkInfo = getNetworkInfo();
  if (!networkInfo) { return true; }
  return networkInfo.effectiveType === "4g" && networkInfo.saveData !== true;
}
export function getNetworkSpeed(): "fast" | "medium" | "slow" | "unknown" {
  const networkInfo = getNetworkInfo();
  if (!networkInfo || !networkInfo.effectiveType) { return "unknown"; }
  switch (networkInfo.effectiveType) {
    case "4g": return "fast";
    case "3g": return "medium";
    case "2g":
    case "slow-2g": return "slow";
    default: return "unknown";
  }
}