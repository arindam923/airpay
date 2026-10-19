export { AirPay, DEFAULT_BASE_URL, API_VERSION } from "./client.js";
export type { AirPayOptions } from "./client.js";
export { AirPayError, AirPayConnectionError, isAirPayError } from "./errors.js";
export type { AirPayErrorPayload } from "./errors.js";
export * from "./types.js";

export { AirPay as default } from "./client.js";

export const VERSION = "0.1.0";
