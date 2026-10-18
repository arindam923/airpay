/**
 * Account environment. Every payable resource (payment link, invoice, payment
 * intent, API key) belongs to exactly one environment:
 *
 * - `sandbox`    → EVM **testnets** only. Fully functional today.
 * - `production` → EVM **mainnet**. Not enabled yet (see PRODUCTION_READY).
 *
 * The dashboard sends the active environment on every request via the
 * `x-airpay-env` header; the server stamps it on creation and filters every
 * read by it, so sandbox and production data never mix.
 */
export type Environment = "sandbox" | "production";

export const ENV_HEADER = "x-airpay-env";

export const DEFAULT_ENVIRONMENT: Environment = "sandbox";

export function normalizeEnvironment(value: unknown): Environment {
  return value === "production" ? "production" : "sandbox";
}

/**
 * Whether mainnet (production) is actually available. Blocked until mainnet
 * chains, USDC addresses and RPCs are configured; flip this on when they land.
 * When false, creating/using production resources returns a clear error and the
 * dashboard surfaces production as locked.
 */
export const PRODUCTION_READY = false;

export function isProductionReady(): boolean {
  return PRODUCTION_READY;
}

export const ENVIRONMENT_LABEL: Record<Environment, string> = {
  sandbox: "Sandbox",
  production: "Production",
};
