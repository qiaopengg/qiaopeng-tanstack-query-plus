const nodeEnv = typeof process !== "undefined" && process && typeof process.env !== "undefined" ? process.env.NODE_ENV : undefined;
export const isProd = nodeEnv === "production";
export const isDev = !isProd;