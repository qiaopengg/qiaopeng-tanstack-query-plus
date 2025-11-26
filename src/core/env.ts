function getEnvironment(): string | undefined {
  // Node.js / Webpack / CRA
  if (typeof process !== "undefined" && process?.env?.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  // Vite / modern bundlers
  try {
    // @ts-expect-error import.meta.env may not exist in all environments
    if (typeof import.meta !== "undefined" && import.meta.env) {
      // @ts-expect-error accessing Vite-specific env
      const env = import.meta.env;
      if (env.MODE) return env.MODE;
      if (typeof env.PROD === "boolean") return env.PROD ? "production" : "development";
    }
  } catch {
    // import.meta not supported
  }
  return undefined;
}

const nodeEnv = getEnvironment();
export const isProd = nodeEnv === "production";
export const isDev = nodeEnv === "development" || (!isProd && nodeEnv !== "test");
export const isTest = nodeEnv === "test";