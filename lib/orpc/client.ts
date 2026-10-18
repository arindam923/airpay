import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { ENV_HEADER } from "@/lib/environment";
import { getEnvironment } from "@/lib/env-store";

const link = new RPCLink({
  url: typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : "http://localhost:3000/api/rpc",
  headers: () => ({ [ENV_HEADER]: getEnvironment() }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const orpcClient: any = (createORPCClient as any)(link);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const orpc: any = createTanstackQueryUtils(orpcClient);
