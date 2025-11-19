import { isProd } from "./env.js";
export { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export interface DevToolsConfig {
  initialIsOpen?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  enabled?: boolean;
  buttonPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  panelProps?: React.ComponentProps<"div">;
  closeButtonProps?: React.ComponentProps<"button">;
  toggleButtonProps?: React.ComponentProps<"button">;
}

export const defaultDevToolsConfig: DevToolsConfig = {
  initialIsOpen: false,
  position: "bottom-right",
  enabled: !isProd
};

export function createDevToolsConfig(overrides?: Partial<DevToolsConfig>): DevToolsConfig {
  return {
    ...defaultDevToolsConfig,
    ...overrides
  };
}

export function isDevToolsEnabled(): boolean {
  return !isProd;
}