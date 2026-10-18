import { RPCHandler } from "@orpc/server/fetch";
import { createORPCContext } from "@/lib/orpc/context";
import { appRouter } from "@/lib/orpc/router";

const handler = new RPCHandler(appRouter);

async function handle(request: Request) {
  const context = await createORPCContext(request.headers);
  const result = await handler.handle(request, {
    prefix: "/api/rpc",
    context,
  });
  if (result.matched) return result.response;
  return new Response("Not found", { status: 404 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
