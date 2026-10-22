import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { ENV_HEADER } from "@/lib/environment";
import { getEnvironment } from "@/lib/env-store";

const baseUrl =
  typeof window !== "undefined"
    ? window.location.origin
    : (
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000")
      ).replace(/\/$/, "");

const link = new RPCLink({
  url: `${baseUrl}/api/rpc`,
  headers: () => ({ [ENV_HEADER]: getEnvironment() }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const orpcClient: any = (createORPCClient as any)(link);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const orpc: any = createTanstackQueryUtils(orpcClient);
