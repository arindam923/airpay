import { after } from "next/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createORPCContext } from "@/lib/orpc/context";
import { appRouter } from "@/lib/orpc/router";
import { flushWebhooks } from "@/lib/webhooks";

const handler = new RPCHandler(appRouter);

async function handle(request: Request) {
  const context = await createORPCContext(request.headers);
  const result = await handler.handle(request, {
    prefix: "/api/rpc",
    context,
  });
  if (result.matched) {
    // Mutations may have queued webhook deliveries — drain them once the
    // response is sent. Cron/worker remain the safety net.
    if (request.method !== "GET" && request.method !== "HEAD") {
      after(() => {
        void flushWebhooks();
      });
    }
    return result.response;
  }
  return new Response("Not found", { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
